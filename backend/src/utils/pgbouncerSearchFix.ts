/**
 * PgBouncer-compatible search implementation
 * Handles prepared statement issues with connection pooling
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../database';
import logger from './logger';

interface SearchParams {
  userIds: string[];
  search?: string;
  tags?: string;
  isRead?: boolean;
  isArchived?: boolean;
  skip: number;
  take: number;
}

/**
 * Execute search with PgBouncer compatibility
 * Falls back to simpler queries if prepared statements fail
 */
export async function executeSearchQuery(params: SearchParams) {
  const { userIds, search, tags, isRead, isArchived, skip, take } = params;

  // Build base where clause
  const baseWhere: Prisma.ArticleWhereInput = {
    userId: { in: userIds }
  };

  // Add filters
  if (tags) {
    const tagArray = tags.split(',').filter(t => t.trim());
    if (tagArray.length > 0) {
      baseWhere.tags = { hasSome: tagArray };
    }
  }

  if (isRead !== undefined) {
    baseWhere.isRead = isRead;
  }

  if (isArchived !== undefined) {
    baseWhere.isArchived = isArchived;
  }

  // If no search term, use standard Prisma query
  if (!search || !search.trim()) {
    return executeStandardQuery(baseWhere, skip, take);
  }

  // Try different search strategies in order of preference
  try {
    // Strategy 1: Try with case-sensitive search first (simpler query)
    logger.info('Attempting case-sensitive search', { search });
    return await executeCaseSensitiveSearch(baseWhere, search, skip, take);
  } catch (error: any) {
    if (isPreparedStatementError(error)) {
      logger.warn('Case-sensitive search failed with prepared statement error, trying raw SQL', { 
        error: error.message 
      });
      
      // Strategy 2: Use raw SQL query for maximum compatibility
      try {
        return await executeRawSqlSearch(userIds, search, tags, isRead, isArchived, skip, take);
      } catch (rawError: any) {
        logger.error('Raw SQL search also failed', { error: rawError.message });
        
        // Strategy 3: Return all articles without search as last resort
        logger.warn('All search strategies failed, returning unfiltered results');
        return executeStandardQuery(baseWhere, skip, take);
      }
    }
    
    // Re-throw non-prepared statement errors
    throw error;
  }
}

/**
 * Execute standard Prisma query without search
 */
async function executeStandardQuery(
  where: Prisma.ArticleWhereInput, 
  skip: number, 
  take: number
) {
  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      skip,
      take,
      orderBy: { savedAt: 'desc' },
      select: {
        id: true,
        url: true,
        title: true,
        content: true,
        excerpt: true,
        author: true,
        publishedDate: true,
        tags: true,
        isRead: true,
        isArchived: true,
        savedAt: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.article.count({ where })
  ]);

  return { articles, total };
}

/**
 * Execute case-sensitive search (simpler query for PgBouncer)
 */
async function executeCaseSensitiveSearch(
  baseWhere: Prisma.ArticleWhereInput,
  search: string,
  skip: number,
  take: number
) {
  const searchWhere = {
    ...baseWhere,
    OR: [
      { title: { contains: search } },
      { excerpt: { contains: search } }
      // Removed content search for better performance
    ]
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where: searchWhere,
      skip,
      take,
      orderBy: { savedAt: 'desc' },
      select: {
        id: true,
        url: true,
        title: true,
        content: true,
        excerpt: true,
        author: true,
        publishedDate: true,
        tags: true,
        isRead: true,
        isArchived: true,
        savedAt: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.article.count({ where: searchWhere })
  ]);

  return { articles, total };
}

/**
 * Execute raw SQL search for maximum PgBouncer compatibility
 */
async function executeRawSqlSearch(
  userIds: string[],
  search: string,
  tags?: string,
  isRead?: boolean,
  isArchived?: boolean,
  skip?: number,
  take?: number
) {
  // Escape special characters in search
  const searchPattern = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
  
  // Build dynamic conditions
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 0;

  // User IDs condition
  conditions.push(`user_id = ANY($${++paramIndex}::uuid[])`);
  params.push(userIds);

  // Search condition (case-insensitive with ILIKE)
  conditions.push(`(
    title ILIKE $${++paramIndex} OR 
    excerpt ILIKE $${paramIndex}
  )`);
  params.push(searchPattern);

  // Additional filters
  if (tags) {
    const tagArray = tags.split(',').filter(t => t.trim());
    if (tagArray.length > 0) {
      conditions.push(`tags && $${++paramIndex}::text[]`);
      params.push(tagArray);
    }
  }

  if (isRead !== undefined) {
    conditions.push(`is_read = $${++paramIndex}`);
    params.push(isRead);
  }

  if (isArchived !== undefined) {
    conditions.push(`is_archived = $${++paramIndex}`);
    params.push(isArchived);
  }

  const whereClause = conditions.join(' AND ');

  // Add pagination
  const limitClause = take ? `LIMIT $${++paramIndex}` : '';
  const offsetClause = skip ? `OFFSET $${++paramIndex}` : '';
  
  if (take) params.push(take);
  if (skip) params.push(skip);

  // Execute queries
  const articlesQuery = `
    SELECT 
      id::text as id,
      url,
      title,
      content,
      excerpt,
      author,
      published_date as "publishedDate",
      tags,
      is_read as "isRead",
      is_archived as "isArchived",
      saved_at as "savedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM articles
    WHERE ${whereClause}
    ORDER BY saved_at DESC
    ${limitClause}
    ${offsetClause}
  `;

  const countQuery = `
    SELECT COUNT(*)::int as total
    FROM articles
    WHERE ${whereClause}
  `;

  // Get count params (exclude pagination params)
  const countParams = take && skip ? params.slice(0, -2) : 
                     take || skip ? params.slice(0, -1) : 
                     params;

  const [articles, countResult] = await Promise.all([
    prisma.$queryRawUnsafe(articlesQuery, ...params),
    prisma.$queryRawUnsafe(countQuery, ...countParams)
  ]);

  const total = (countResult as any)[0]?.total || 0;

  return { articles, total };
}

/**
 * Check if error is a prepared statement error
 */
function isPreparedStatementError(error: any): boolean {
  const errorMessage = error.message || '';
  const errorCode = error.code || '';
  
  return (
    errorMessage.includes('prepared statement') ||
    errorMessage.includes('s203') ||
    errorCode === '26000' ||
    error.code === 'P1001'
  );
}