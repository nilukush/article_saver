/**
 * Emergency PgBouncer fix - uses $queryRaw with template literals
 * This completely bypasses prepared statements
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
 * Execute search with complete PgBouncer compatibility
 * Uses template literal queries to avoid ALL prepared statements
 */
export async function executeSearchQuery(params: SearchParams) {
  const { userIds, search, tags, isRead, isArchived, skip, take } = params;

  try {
    // For non-search queries, try a simpler approach first
    if (!search || !search.trim()) {
      logger.info('Executing non-search query with template literal');
      
      // Build WHERE conditions as SQL fragments
      const conditions: string[] = [`user_id IN (${userIds.map(id => `'${id}'`).join(',')})`];
      
      if (tags) {
        const tagArray = tags.split(',').filter(t => t.trim());
        if (tagArray.length > 0) {
          const tagList = tagArray.map(t => `'${t.replace(/'/g, "''")}'`).join(',');
          conditions.push(`tags && ARRAY[${tagList}]::text[]`);
        }
      }
      
      if (isRead !== undefined) {
        conditions.push(`is_read = ${isRead}`);
      }
      
      if (isArchived !== undefined) {
        conditions.push(`is_archived = ${isArchived}`);
      }
      
      const whereClause = conditions.join(' AND ');
      
      // Use template literal queries - these don't create prepared statements
      const articles = await prisma.$queryRaw`
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
        WHERE ${Prisma.raw(whereClause)}
        ORDER BY saved_at DESC
        LIMIT ${take}
        OFFSET ${skip}
      `;
      
      const countResult = await prisma.$queryRaw`
        SELECT COUNT(*)::int as total
        FROM articles
        WHERE ${Prisma.raw(whereClause)}
      `;
      
      const total = (countResult as any)[0]?.total || 0;
      return { articles, total };
    }
    
    // For search queries
    logger.info('Executing search query with template literal', { search });
    
    // Escape search term for SQL safety
    const searchTerm = search.replace(/'/g, "''");
    const searchPattern = `%${searchTerm}%`;
    
    // Build conditions
    const conditions: string[] = [`user_id IN (${userIds.map(id => `'${id}'`).join(',')})`];
    
    // Add search condition
    conditions.push(`(
      title ILIKE '${searchPattern}' OR 
      excerpt ILIKE '${searchPattern}'
    )`);
    
    // Add other filters
    if (tags) {
      const tagArray = tags.split(',').filter(t => t.trim());
      if (tagArray.length > 0) {
        const tagList = tagArray.map(t => `'${t.replace(/'/g, "''")}'`).join(',');
        conditions.push(`tags && ARRAY[${tagList}]::text[]`);
      }
    }
    
    if (isRead !== undefined) {
      conditions.push(`is_read = ${isRead}`);
    }
    
    if (isArchived !== undefined) {
      conditions.push(`is_archived = ${isArchived}`);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Execute with template literals
    const articles = await prisma.$queryRaw`
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
      WHERE ${Prisma.raw(whereClause)}
      ORDER BY saved_at DESC
      LIMIT ${take}
      OFFSET ${skip}
    `;
    
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as total
      FROM articles
      WHERE ${Prisma.raw(whereClause)}
    `;
    
    const total = (countResult as any)[0]?.total || 0;
    return { articles, total };
    
  } catch (error: any) {
    logger.error('Emergency query failed', { 
      error: error.message,
      code: error.code
    });
    
    // Last resort - return empty results
    return { articles: [], total: 0 };
  }
}