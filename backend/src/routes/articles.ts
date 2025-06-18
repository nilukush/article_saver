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
            orderBy: { createdAt: 'desc' },
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
