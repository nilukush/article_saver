import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../database';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Sync articles from desktop app to cloud
router.post('/upload', [
    body('articles').isArray().withMessage('Articles array is required'),
    body('lastSyncTimestamp').optional().isISO8601()
], asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
    }

    const userId = (req as any).user.userId;
    const { articles, lastSyncTimestamp } = req.body;

    const results = {
        created: 0,
        updated: 0,
        conflicts: [] as any[]
    };

    for (const articleData of articles) {
        try {
            // Check if article already exists
            const existingArticle = await prisma.article.findFirst({
                where: {
                    userId,
                    url: articleData.url
                }
            });

            if (existingArticle) {
                // Check for conflicts based on updatedAt timestamp
                const localUpdated = new Date(articleData.updatedAt);
                const cloudUpdated = new Date(existingArticle.updatedAt);

                if (localUpdated > cloudUpdated) {
                    // Local version is newer, update cloud
                    await prisma.article.update({
                        where: { id: existingArticle.id },
                        data: {
                            title: articleData.title,
                            content: articleData.content,
                            excerpt: articleData.excerpt,
                            author: articleData.author,
                            publishedDate: articleData.publishedDate ? new Date(articleData.publishedDate) : null,
                            tags: articleData.tags || [],
                            isRead: articleData.isRead,
                            isArchived: articleData.isArchived,
                            updatedAt: localUpdated
                        }
                    });
                    results.updated++;
                } else if (cloudUpdated > localUpdated) {
                    // Cloud version is newer, record conflict
                    results.conflicts.push({
                        url: articleData.url,
                        localUpdated: localUpdated.toISOString(),
                        cloudUpdated: cloudUpdated.toISOString(),
                        cloudArticle: existingArticle
                    });
                }
                // If timestamps are equal, no action needed
            } else {
                // Create new article
                await prisma.article.create({
                    data: {
                        userId,
                        url: articleData.url,
                        title: articleData.title,
                        content: articleData.content,
                        excerpt: articleData.excerpt,
                        author: articleData.author,
                        publishedDate: articleData.publishedDate ? new Date(articleData.publishedDate) : null,
                        tags: articleData.tags || [],
                        isRead: articleData.isRead || false,
                        isArchived: articleData.isArchived || false,
                        createdAt: new Date(articleData.createdAt),
                        updatedAt: new Date(articleData.updatedAt)
                    }
                });
                results.created++;
            }
        } catch (error) {
            logger.error('Error syncing article', { url: articleData.url, error: error instanceof Error ? error.message : error });
        }
    }

    res.json({
        message: 'Sync completed',
        results,
        timestamp: new Date().toISOString()
    });
}));

// Download articles from cloud to desktop app
router.get('/download', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { lastSyncTimestamp } = req.query;

    let where: any = { userId };

    // If lastSyncTimestamp provided, only get articles updated since then
    if (lastSyncTimestamp) {
        where.updatedAt = {
            gt: new Date(lastSyncTimestamp as string)
        };
    }

    const articles = await prisma.article.findMany({
        where,
        orderBy: { updatedAt: 'desc' }
    });

    res.json({
        articles,
        timestamp: new Date().toISOString(),
        count: articles.length
    });
}));

// Get sync status and statistics
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    const [totalArticles, readArticles, archivedArticles, recentArticles] = await Promise.all([
        prisma.article.count({ where: { userId } }),
        prisma.article.count({ where: { userId, isRead: true } }),
        prisma.article.count({ where: { userId, isArchived: true } }),
        prisma.article.count({
            where: {
                userId,
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            }
        })
    ]);

    const lastSyncedArticle = await prisma.article.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
    });

    res.json({
        statistics: {
            totalArticles,
            readArticles,
            archivedArticles,
            recentArticles,
            lastSync: lastSyncedArticle?.updatedAt || null
        },
        timestamp: new Date().toISOString()
    });
}));

// Force full sync - download all articles
router.get('/full', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    const articles = await prisma.article.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });

    res.json({
        articles,
        timestamp: new Date().toISOString(),
        count: articles.length,
        message: 'Full sync data retrieved'
    });
}));

export default router;
