import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { prisma } from '../database';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all articles for authenticated user
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { page = 1, limit = 20, search, tags, isRead, isArchived } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = { userId };

    if (search) {
        where.OR = [
            { title: { contains: search as string, mode: 'insensitive' } },
            { content: { contains: search as string, mode: 'insensitive' } },
            { excerpt: { contains: search as string, mode: 'insensitive' } }
        ];
    }

    if (tags) {
        const tagArray = (tags as string).split(',');
        where.tags = { hasSome: tagArray };
    }

    if (isRead !== undefined) {
        where.isRead = isRead === 'true';
    }

    if (isArchived !== undefined) {
        where.isArchived = isArchived === 'true';
    }

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

    res.json({
        articles,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
}));

// Get single article by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const article = await prisma.article.findFirst({
        where: { id, userId }
    });

    if (!article) {
        throw createError('Article not found', 404);
    }

    res.json(article);
}));

// Create new article
router.post('/', [
    body('url').isURL().withMessage('Valid URL is required'),
    body('title').optional().isString(),
    body('content').optional().isString(),
    body('excerpt').optional().isString(),
    body('author').optional().isString(),
    body('publishedDate').optional().isISO8601(),
    body('tags').optional().isArray()
], asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
    }

    const userId = (req as any).user.userId;
    const { url, tags = [] } = req.body;
    let { title, content, excerpt, author, publishedDate } = req.body;

    // Check if article with same URL already exists for this user
    const existingArticle = await prisma.article.findFirst({
        where: { userId, url }
    });

    if (existingArticle) {
        throw createError('Article with this URL already exists', 409);
    }

    // If content is not provided, extract it from the URL
    if (!content || !title) {
        try {
            logger.info('🚀 CONTENT EXTRACTION: Starting extraction for URL', { url });

            // Fetch the webpage
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Article-Saver/1.0)'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            logger.info('🚀 CONTENT EXTRACTION: HTML fetched successfully', {
                htmlLength: html.length,
                url
            });

            // Create JSDOM document with industry-standard configuration (Firefox Reader View approach)
            const dom = new JSDOM(html, {
                url  // Only URL for relative link resolution - NO resource loading
            });
            const document = dom.window.document;
            logger.info('🚀 CONTENT EXTRACTION: JSDOM document created with optimized config');

            // Try Mozilla Readability first
            try {
                logger.info('🔍 CONTENT EXTRACTION: Attempting Mozilla Readability');

                const documentClone = document.cloneNode(true) as Document;
                const reader = new Readability(documentClone, {
                    charThreshold: 500,
                    classesToPreserve: ['highlight', 'code', 'pre'],
                    keepClasses: false
                });

                const article = reader.parse();
                logger.info('🔍 CONTENT EXTRACTION: Readability parse completed', {
                    hasArticle: !!article,
                    hasContent: !!(article && article.content),
                    contentLength: article?.content?.length || 0,
                    title: article?.title || 'No title'
                });

                if (article && article.content) {
                    logger.info('✅ CONTENT EXTRACTION: Mozilla Readability SUCCESS', {
                        contentLength: article.content.length,
                        titleLength: article.title?.length || 0
                    });

                    // Use Readability results
                    if (!title && article.title) {
                        title = article.title.trim();
                    }
                    if (!content) {
                        content = article.content;
                    }
                    if (!excerpt && article.excerpt) {
                        excerpt = article.excerpt;
                    }
                    if (!author && article.byline) {
                        author = article.byline;
                    }
                } else {
                    logger.warn('⚠️ CONTENT EXTRACTION: Mozilla Readability failed, falling back to basic extraction');
                    throw new Error('Readability failed');
                }
            } catch (readabilityError) {
                logger.error('❌ CONTENT EXTRACTION: Mozilla Readability error', {
                    error: readabilityError instanceof Error ? readabilityError.message : 'Unknown error',
                    url
                });

                // Fallback to basic extraction
                logger.info('🔧 CONTENT EXTRACTION: Using basic fallback extraction');

                // Extract title from <title> tag if not provided
                if (!title) {
                    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                    title = titleMatch ? titleMatch[1].trim() : 'Untitled Article';
                }

                // Extract basic content from meta description if not provided
                if (!excerpt) {
                    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
                    excerpt = descMatch ? descMatch[1].trim() : '';
                }

                // Extract author from meta tags
                if (!author) {
                    const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);
                    author = authorMatch ? authorMatch[1].trim() : undefined;
                }

                // Basic content extraction - get text from body
                if (!content) {
                    // Remove script and style tags
                    const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

                    // Extract text content from body
                    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                    if (bodyMatch) {
                        // Simple HTML to text conversion
                        content = bodyMatch[1]
                            .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
                            .replace(/\s+/g, ' ')      // Normalize whitespace
                            .trim();

                        logger.info('🔧 CONTENT EXTRACTION: Basic extraction completed', {
                            contentLength: content.length
                        });
                    } else {
                        content = 'Content could not be extracted';
                        logger.warn('🔧 CONTENT EXTRACTION: No body content found');
                    }
                }
            }

            // Generate excerpt if not provided
            if (!excerpt && content && content.length > 200) {
                excerpt = content.replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 200) + '...';
            }

            logger.info('✅ CONTENT EXTRACTION: Extraction completed successfully', {
                titleLength: title?.length || 0,
                contentLength: content?.length || 0,
                excerptLength: excerpt?.length || 0,
                hasAuthor: !!author
            });

        } catch (error) {
            logger.error('❌ CONTENT EXTRACTION: Fatal error during extraction', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                url
            });

            // Continue with provided data or defaults
            title = title || 'Article';
            content = content || 'Content could not be extracted';
            excerpt = excerpt || '';
        }
    }

    const article = await prisma.article.create({
        data: {
            userId,
            url,
            title: title || 'Untitled Article',
            content: content || '',
            excerpt: excerpt || '',
            author,
            publishedDate: publishedDate ? new Date(publishedDate) : null,
            savedAt: new Date(), // For manually added articles, savedAt is the current time
            tags
        }
    });

    res.status(201).json(article);
}));

// Update article
router.put('/:id', [
    body('title').optional().isString(),
    body('content').optional().isString(),
    body('excerpt').optional().isString(),
    body('author').optional().isString(),
    body('publishedDate').optional().isISO8601(),
    body('tags').optional().isArray(),
    body('isRead').optional().isBoolean(),
    body('isArchived').optional().isBoolean()
], asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
    }

    const userId = (req as any).user.userId;
    const { id } = req.params;
    const updateData = req.body;

    // Convert publishedDate if provided
    if (updateData.publishedDate) {
        updateData.publishedDate = new Date(updateData.publishedDate);
    }

    const article = await prisma.article.updateMany({
        where: { id, userId },
        data: updateData
    });

    if (article.count === 0) {
        throw createError('Article not found', 404);
    }

    const updatedArticle = await prisma.article.findUnique({
        where: { id }
    });

    res.json(updatedArticle);
}));

// Re-extract content for an existing article
router.post('/:id/re-extract', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    const articleId = req.params.id;

    logger.info('🔄 RE-EXTRACTION: Starting re-extraction process', {
        userId,
        articleId
    });

    // Get the existing article
    const existingArticle = await prisma.article.findFirst({
        where: {
            id: articleId,
            userId: userId
        }
    });

    if (!existingArticle) {
        res.status(404).json({ error: 'Article not found' });
        return;
    }

    try {
        logger.info('🔄 RE-EXTRACTION: Fetching fresh content from URL', {
            url: existingArticle.url
        });

        // Fetch the webpage again
        const response = await fetch(existingArticle.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ArticleSaver/1.0)'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch article: ${response.statusText}`);
        }

        const html = await response.text();
        logger.info('🔄 RE-EXTRACTION: Fresh HTML fetched successfully', {
            htmlLength: html.length
        });

        // Create JSDOM document with enhanced configuration
        const dom = new JSDOM(html, { url: existingArticle.url });
        const document = dom.window.document;

        let title = existingArticle.title;
        let content = '';
        let excerpt = existingArticle.excerpt;
        let author = existingArticle.author;

        // Try enhanced Mozilla Readability first
        try {
            logger.info('🔄 RE-EXTRACTION: Attempting enhanced Mozilla Readability');

            const documentClone = document.cloneNode(true) as Document;
            const reader = new Readability(documentClone, {
                charThreshold: 250,
                classesToPreserve: ['highlight', 'code', 'pre', 'syntax', 'language-'],
                keepClasses: true,
                nbTopCandidates: 15,
                debug: false
            });

            const article = reader.parse();

            if (article && article.content && article.content.length > 500) {
                logger.info('✅ RE-EXTRACTION: Enhanced Readability SUCCESS', {
                    contentLength: article.content.length,
                    titleLength: article.title?.length || 0
                });

                content = article.content;
                if (article.title && article.title.trim()) {
                    title = article.title.trim();
                }
                if (article.excerpt && article.excerpt.trim()) {
                    excerpt = article.excerpt.trim();
                }
                if (article.byline && article.byline.trim()) {
                    author = article.byline.trim();
                }
            } else {
                throw new Error('Readability extraction insufficient');
            }
        } catch (readabilityError) {
            logger.warn('⚠️ RE-EXTRACTION: Readability failed, trying fallback methods', {
                error: readabilityError instanceof Error ? readabilityError.message : 'Unknown error'
            });

            // Fallback to basic extraction with better selectors
            const contentSelectors = [
                'article',
                '[role="main"]',
                '.content, .post-content, .entry-content, .article-content',
                '.post-body, .entry-body, .article-body',
                'main article, main .content',
                '#content, #main-content, #post-content'
            ];

            for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    // Clean up the element
                    const scripts = element.querySelectorAll('script, style, nav, header, footer, aside');
                    scripts.forEach(script => script.remove());

                    const extractedContent = element.innerHTML || element.textContent || '';
                    if (extractedContent.length > 500) {
                        content = extractedContent;
                        logger.info(`✅ RE-EXTRACTION: Fallback extraction successful with selector: ${selector}`);
                        break;
                    }
                }
            }

            if (!content) {
                // Final fallback - get text from body
                const body = document.querySelector('body');
                if (body) {
                    const scripts = body.querySelectorAll('script, style, nav, header, footer, aside');
                    scripts.forEach(script => script.remove());
                    content = body.textContent || 'Re-extraction failed - content could not be retrieved';
                }
            }
        }

        // Generate new excerpt if we have content
        if (content && content.length > 200) {
            excerpt = content.replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 200) + '...';
        }

        // Update the article in the database
        const updatedArticle = await prisma.article.update({
            where: { id: articleId },
            data: {
                title,
                content,
                excerpt,
                author,
                updatedAt: new Date()
            }
        });

        logger.info('✅ RE-EXTRACTION: Article updated successfully', {
            articleId,
            contentLength: content.length,
            titleUpdated: title !== existingArticle.title,
            excerptUpdated: excerpt !== existingArticle.excerpt
        });

        res.json(updatedArticle);

    } catch (error) {
        logger.error('❌ RE-EXTRACTION: Fatal error during re-extraction', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            articleId,
            url: existingArticle.url
        });

        res.status(500).json({
            error: 'Re-extraction failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
}));

// Get current user info and token validation (for debugging)
router.get('/user/info', authenticateToken, asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    const userEmail = (req as any).user.email;
    
    try {
        // Get article count for user
        const articleCount = await prisma.article.count({
            where: { userId }
        });
        
        res.json({
            success: true,
            user: {
                id: userId,
                email: userEmail
            },
            stats: {
                totalArticles: articleCount
            },
            message: 'Token is valid and user authenticated'
        });
        return;
        
    } catch (error) {
        logger.error('❌ USER INFO: Error getting user info', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        res.status(500).json({
            error: 'Failed to get user info',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
}));

// Bulk delete all articles for current user (for testing/cleanup)
router.delete('/bulk/all', authenticateToken, asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    
    logger.info('🗑️ BULK DELETE: Starting bulk deletion for user', { userId });
    
    try {
        // Get count before deletion for logging
        const countBefore = await prisma.article.count({
            where: { userId }
        });
        
        // Delete all articles for this user
        const deleteResult = await prisma.article.deleteMany({
            where: { userId }
        });
        
        logger.info('✅ BULK DELETE: Successfully deleted articles', {
            userId,
            articlesDeleted: deleteResult.count,
            countBefore
        });
        
        res.json({
            success: true,
            deletedCount: deleteResult.count,
            message: `Successfully deleted ${deleteResult.count} articles`
        });
        return;
        
    } catch (error) {
        logger.error('❌ BULK DELETE: Error during bulk deletion', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        res.status(500).json({
            error: 'Failed to delete articles',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
}));

// Enterprise cleanup: Delete articles by date range
router.delete('/bulk/date-range', authenticateToken, asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    const { startDate, endDate } = req.query;
    
    logger.info('🗑️ ENTERPRISE CLEANUP: Date range deletion', { userId, startDate, endDate });
    
    try {
        const where: any = { userId };
        
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        } else if (startDate) {
            where.createdAt = { gte: new Date(startDate as string) };
        } else if (endDate) {
            where.createdAt = { lte: new Date(endDate as string) };
        }
        
        const deleteResult = await prisma.article.deleteMany({ where });
        
        logger.info('✅ ENTERPRISE CLEANUP: Date range deletion completed', {
            userId, articlesDeleted: deleteResult.count, startDate, endDate
        });
        
        res.json({
            success: true,
            deletedCount: deleteResult.count,
            dateRange: { startDate, endDate },
            message: `Successfully deleted ${deleteResult.count} articles from date range`
        });
        return;
        
    } catch (error) {
        logger.error('❌ ENTERPRISE CLEANUP: Date range deletion failed', {
            userId, error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        res.status(500).json({
            error: 'Failed to delete articles by date range',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
}));

// Enterprise cleanup: Smart cleanup based on patterns
router.delete('/bulk/smart-cleanup', authenticateToken, asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    const { 
        removeUnread = false,
        removeArchived = false,
        removeDuplicateUrls = false,
        removeWithoutContent = false,
        olderThanDays
    } = req.body;
    
    logger.info('🧠 ENTERPRISE SMART CLEANUP: Starting intelligent cleanup', {
        userId, removeUnread, removeArchived, removeDuplicateUrls, removeWithoutContent, olderThanDays
    });
    
    try {
        let totalDeleted = 0;
        const deletionLog: string[] = [];
        
        // 1. Remove articles older than specified days
        if (olderThanDays && olderThanDays > 0) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            
            const oldResult = await prisma.article.deleteMany({
                where: { userId, createdAt: { lt: cutoffDate } }
            });
            totalDeleted += oldResult.count;
            deletionLog.push(`Removed ${oldResult.count} articles older than ${olderThanDays} days`);
        }
        
        // 2. Remove duplicate URLs (keep most recent)
        if (removeDuplicateUrls) {
            const duplicates = await prisma.article.groupBy({
                by: ['url'],
                where: { userId },
                having: { url: { _count: { gt: 1 } } }
            });
            
            for (const duplicate of duplicates) {
                const articles = await prisma.article.findMany({
                    where: { userId, url: duplicate.url },
                    orderBy: { createdAt: 'desc' }
                });
                
                // Keep the first (most recent), delete the rest
                const toDelete = articles.slice(1);
                const deleteIds = toDelete.map(a => a.id);
                
                if (deleteIds.length > 0) {
                    const dupResult = await prisma.article.deleteMany({
                        where: { id: { in: deleteIds } }
                    });
                    totalDeleted += dupResult.count;
                }
            }
            deletionLog.push(`Removed ${duplicates.length} sets of duplicate URLs`);
        }
        
        // 3. Remove articles without content
        if (removeWithoutContent) {
            const emptyResult = await prisma.article.deleteMany({
                where: {
                    userId,
                    OR: [
                        { content: null },
                        { content: '' },
                        { content: 'Content could not be extracted' }
                    ]
                }
            });
            totalDeleted += emptyResult.count;
            deletionLog.push(`Removed ${emptyResult.count} articles without content`);
        }
        
        // 4. Remove unread articles
        if (removeUnread) {
            const unreadResult = await prisma.article.deleteMany({
                where: { userId, isRead: false }
            });
            totalDeleted += unreadResult.count;
            deletionLog.push(`Removed ${unreadResult.count} unread articles`);
        }
        
        // 5. Remove archived articles
        if (removeArchived) {
            const archivedResult = await prisma.article.deleteMany({
                where: { userId, isArchived: true }
            });
            totalDeleted += archivedResult.count;
            deletionLog.push(`Removed ${archivedResult.count} archived articles`);
        }
        
        logger.info('✅ ENTERPRISE SMART CLEANUP: Intelligent cleanup completed', {
            userId, totalDeleted, deletionLog
        });
        
        res.json({
            success: true,
            totalDeleted,
            cleanupActions: deletionLog,
            message: `Smart cleanup completed: ${totalDeleted} articles removed`
        });
        return;
        
    } catch (error) {
        logger.error('❌ ENTERPRISE SMART CLEANUP: Smart cleanup failed', {
            userId, error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        res.status(500).json({
            error: 'Smart cleanup failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
}));

// Get content extraction diagnostic information
router.get('/diagnostics/extraction-status', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    
    logger.info('🔍 DIAGNOSTICS: Checking content extraction status', { userId });
    
    try {
        // Get overall statistics
        const [totalArticles, extractedCount, failedCount, pendingCount, noContentCount] = await Promise.all([
            prisma.article.count({ where: { userId } }),
            prisma.article.count({ where: { userId, contentExtracted: true } }),
            prisma.article.count({ where: { userId, extractionStatus: 'failed' } }),
            prisma.article.count({ where: { userId, extractionStatus: 'pending' } }),
            prisma.article.count({ 
                where: { 
                    userId, 
                    OR: [
                        { content: null },
                        { content: '' },
                        { content: { lt: '200' } }
                    ]
                } 
            })
        ]);
        
        // Get sample of problematic articles
        const sampleProblematic = await prisma.article.findMany({
            where: {
                userId,
                OR: [
                    { contentExtracted: false },
                    { extractionStatus: 'failed' },
                    { content: null },
                    { content: '' }
                ]
            },
            take: 10,
            select: {
                id: true,
                url: true,
                title: true,
                contentExtracted: true,
                extractionStatus: true,
                content: true,
                savedAt: true
            }
        });
        
        // Analyze content lengths
        const articles = await prisma.article.findMany({
            where: { userId },
            select: { content: true }
        });
        
        const contentLengths = articles.map(a => a.content?.length || 0);
        const avgContentLength = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;
        const shortContentCount = contentLengths.filter(len => len < 200).length;
        
        res.json({
            success: true,
            statistics: {
                totalArticles,
                extractedCount,
                failedCount,
                pendingCount,
                noContentCount,
                shortContentCount,
                avgContentLength: Math.round(avgContentLength),
                extractionRate: totalArticles > 0 ? ((extractedCount / totalArticles) * 100).toFixed(2) + '%' : '0%'
            },
            sampleProblematic: sampleProblematic.map(article => ({
                id: article.id,
                url: article.url,
                title: article.title,
                contentExtracted: article.contentExtracted,
                extractionStatus: article.extractionStatus,
                contentLength: article.content?.length || 0,
                hasContent: !!article.content && article.content.length > 0,
                savedAt: article.savedAt
            })),
            recommendation: shortContentCount > totalArticles * 0.5 
                ? 'More than 50% of articles have limited content. Consider running batch re-extraction.'
                : 'Content extraction appears to be working normally.'
        });
        
    } catch (error) {
        logger.error('❌ DIAGNOSTICS: Error checking extraction status', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        res.status(500).json({
            error: 'Failed to get extraction diagnostics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// Fix existing articles with limited content
router.post('/fix/limited-content', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    
    logger.info('🔧 FIX LIMITED CONTENT: Starting fix for articles with limited content', { userId });
    
    try {
        // First, update all articles that have content < 200 chars to mark them for extraction
        const updateResult = await prisma.article.updateMany({
            where: {
                userId,
                OR: [
                    { content: null },
                    { content: '' },
                    // This won't work directly in Prisma, we need a different approach
                ]
            },
            data: {
                contentExtracted: false,
                extractionStatus: 'pending'
            }
        });
        
        // Get articles with short content
        const articlesWithShortContent = await prisma.$queryRaw<Array<{id: string, content_length: number}>>`
            SELECT id, LENGTH(COALESCE(content, '')) as content_length 
            FROM articles 
            WHERE user_id = ${userId}::uuid 
            AND LENGTH(COALESCE(content, '')) < 200
        `;
        
        // Update these articles to mark them for extraction
        if (articlesWithShortContent.length > 0) {
            const articleIds = articlesWithShortContent.map(a => a.id);
            await prisma.article.updateMany({
                where: {
                    id: { in: articleIds }
                },
                data: {
                    contentExtracted: false,
                    extractionStatus: 'pending'
                }
            });
        }
        
        logger.info('🔧 FIX LIMITED CONTENT: Updated articles for re-extraction', {
            count: articlesWithShortContent.length
        });
        
        // Start content extraction
        const { contentExtractionService } = await import('../services/ContentExtractionService');
        contentExtractionService.startAutomaticExtraction(userId).catch(err => {
            logger.error('❌ FIX LIMITED CONTENT: Failed to start content extraction', { error: err });
        });
        
        res.json({
            success: true,
            articlesMarkedForExtraction: articlesWithShortContent.length,
            message: `Marked ${articlesWithShortContent.length} articles for content extraction. Extraction process started in background.`
        });
        
    } catch (error) {
        logger.error('❌ FIX LIMITED CONTENT: Error fixing limited content', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        res.status(500).json({
            error: 'Failed to fix limited content',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// Batch re-extract content for multiple articles
router.post('/batch/re-extract', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    const { limit = 50 } = req.body; // Process up to 50 articles at a time
    
    logger.info('🔄 BATCH RE-EXTRACTION: Starting batch content extraction', {
        userId,
        limit
    });
    
    try {
        // Find articles needing content extraction
        // This includes Pocket imports (which have excerpt as content) and articles without extracted content
        const articlesNeedingContent = await prisma.article.findMany({
            where: {
                userId,
                OR: [
                    { contentExtracted: false },
                    { extractionStatus: { not: 'completed' } },
                    { extractionStatus: null },
                    { content: null },
                    { content: '' }
                ]
            },
            take: limit,
            orderBy: { savedAt: 'desc' }
        });
        
        logger.info('🔄 BATCH RE-EXTRACTION: Found articles needing content', {
            count: articlesNeedingContent.length
        });
        
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };
        
        // Process each article
        for (const article of articlesNeedingContent) {
            try {
                logger.info('🔄 BATCH RE-EXTRACTION: Processing article', {
                    articleId: article.id,
                    url: article.url
                });
                
                // Fetch the webpage
                const response = await fetch(article.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; ArticleSaver/1.0)'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const html = await response.text();
                
                // Extract content using Readability
                const dom = new JSDOM(html, { url: article.url });
                const reader = new Readability(dom.window.document as any);
                const parsed = reader.parse();
                
                if (parsed && parsed.content) {
                    // Update article with extracted content
                    await prisma.article.update({
                        where: { id: article.id },
                        data: {
                            content: parsed.content,
                            title: parsed.title || article.title,
                            excerpt: parsed.excerpt || article.excerpt,
                            author: parsed.byline || article.author,
                            contentExtracted: true,
                            extractionStatus: 'completed'
                        }
                    });
                    
                    results.success++;
                    logger.info('✅ BATCH RE-EXTRACTION: Successfully extracted content', {
                        articleId: article.id
                    });
                } else {
                    throw new Error('Content extraction failed');
                }
                
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                results.failed++;
                results.errors.push(`${article.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                
                // Mark as failed so we can retry later
                await prisma.article.update({
                    where: { id: article.id },
                    data: {
                        extractionStatus: 'failed'
                    }
                });
                
                logger.error('❌ BATCH RE-EXTRACTION: Failed to extract content', {
                    articleId: article.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        
        res.json({
            success: true,
            processed: articlesNeedingContent.length,
            results,
            message: `Extracted content for ${results.success} articles, ${results.failed} failed`
        });
        return;
        
    } catch (error) {
        logger.error('❌ BATCH RE-EXTRACTION: Fatal error', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        res.status(500).json({
            error: 'Batch re-extraction failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
}));

// Delete article
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const article = await prisma.article.deleteMany({
        where: { id, userId }
    });

    if (article.count === 0) {
        throw createError('Article not found', 404);
    }

    res.json({ message: 'Article deleted successfully' });
}));

// Diagnostic endpoint to check extraction status
router.get('/diagnostics/extraction-status', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    
    try {
        const stats = await prisma.article.groupBy({
            by: ['contentExtracted', 'extractionStatus'],
            where: { userId },
            _count: true
        });
        
        const total = await prisma.article.count({ where: { userId } });
        
        // Count articles with limited content (excerpt as content)
        const limitedContent = await prisma.article.count({
            where: {
                userId,
                AND: [
                    { content: { not: null } },
                    { content: { not: '' } },
                    { contentExtracted: false }
                ]
            }
        });
        
        res.json({
            success: true,
            total,
            limitedContent,
            statistics: stats,
            message: `Found ${limitedContent} articles with limited content that need extraction`
        });
        return;
    } catch (error) {
        logger.error('❌ DIAGNOSTICS: Error getting extraction stats', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        res.status(500).json({
            error: 'Failed to get extraction statistics'
        });
        return;
    }
}));

// Fix endpoint to mark limited content articles for extraction
router.post('/fix/limited-content', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    
    logger.info('🔧 FIX: Starting limited content fix', { userId });
    
    try {
        // Find articles where content equals excerpt or is very short
        const articlesToFix = await prisma.$queryRaw`
            SELECT id, title, content, excerpt, LENGTH(content) as content_length
            FROM articles
            WHERE user_id = ${userId}::uuid
            AND (
                (content = excerpt AND excerpt IS NOT NULL)
                OR (LENGTH(content) < 500 AND excerpt IS NOT NULL AND LENGTH(excerpt) > 0)
                OR (content_extracted = false AND content IS NOT NULL)
            )
        `;
        
        const articleIds = (articlesToFix as any[]).map(a => a.id);
        
        if (articleIds.length > 0) {
            // Update these articles to mark them for extraction
            const updateResult = await prisma.article.updateMany({
                where: {
                    id: { in: articleIds },
                    userId
                },
                data: {
                    content: null,
                    contentExtracted: false,
                    extractionStatus: 'pending'
                }
            });
            
            logger.info('✅ FIX: Fixed limited content articles', {
                count: updateResult.count,
                userId
            });
            
            // Trigger content extraction
            const { contentExtractionService } = await import('../services/ContentExtractionService');
            contentExtractionService.startAutomaticExtraction(userId);
            
            res.json({
                success: true,
                fixed: updateResult.count,
                message: `Fixed ${updateResult.count} articles and started content extraction`
            });
        } else {
            res.json({
                success: true,
                fixed: 0,
                message: 'No articles with limited content found'
            });
        }
        return;
    } catch (error) {
        logger.error('❌ FIX: Error fixing limited content', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        res.status(500).json({
            error: 'Failed to fix limited content articles'
        });
        return;
    }
}));

// Bulk operations
router.post('/bulk', [
    body('operation').isIn(['delete', 'markRead', 'markUnread', 'archive', 'unarchive']),
    body('articleIds').isArray().withMessage('Article IDs array is required')
], asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
    }

    const userId = (req as any).user.userId;
    const { operation, articleIds } = req.body;

    let updateData: any = {};
    let shouldDelete = false;

    switch (operation) {
        case 'delete':
            shouldDelete = true;
            break;
        case 'markRead':
            updateData.isRead = true;
            break;
        case 'markUnread':
            updateData.isRead = false;
            break;
        case 'archive':
            updateData.isArchived = true;
            break;
        case 'unarchive':
            updateData.isArchived = false;
            break;
    }

    if (shouldDelete) {
        const result = await prisma.article.deleteMany({
            where: { id: { in: articleIds }, userId }
        });
        res.json({ message: `${result.count} articles deleted` });
    } else {
        const result = await prisma.article.updateMany({
            where: { id: { in: articleIds }, userId },
            data: updateData
        });
        res.json({ message: `${result.count} articles updated` });
    }
}));

export default router;
