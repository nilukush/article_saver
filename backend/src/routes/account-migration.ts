import { Router, Request, Response } from 'express';
import { prisma } from '../database';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Get migration options for linked accounts
 */
router.get('/options', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    
    try {
        // Get all linked accounts
        const linkedAccounts = await prisma.linkedAccount.findMany({
            where: {
                OR: [
                    { primaryUserId: userId },
                    { linkedUserId: userId }
                ],
                verified: true
            },
            include: {
                primaryUser: {
                    include: {
                        _count: {
                            select: { articles: true }
                        }
                    }
                },
                linkedUser: {
                    include: {
                        _count: {
                            select: { articles: true }
                        }
                    }
                }
            }
        });

        // Build a complete picture of all linked accounts
        const accountMap = new Map<string, any>();
        accountMap.set(userId, await prisma.user.findUnique({
            where: { id: userId },
            include: {
                _count: {
                    select: { articles: true }
                }
            }
        }));

        linkedAccounts.forEach(link => {
            const otherUserId = link.primaryUserId === userId ? link.linkedUserId : link.primaryUserId;
            const otherUser = link.primaryUserId === userId ? link.linkedUser : link.primaryUser;
            accountMap.set(otherUserId, otherUser);
        });

        const accounts = Array.from(accountMap.values()).map(user => ({
            id: user.id,
            email: user.email,
            provider: user.provider || 'email',
            articleCount: user._count.articles,
            isPrimary: user.id === userId
        }));

        res.json({
            success: true,
            accounts,
            totalArticles: accounts.reduce((sum, acc) => sum + acc.articleCount, 0),
            message: 'Migration options retrieved successfully'
        });
        return;
    } catch (error) {
        logger.error('❌ MIGRATION: Error getting options', { userId, error });
        res.status(500).json({
            error: 'Failed to get migration options'
        });
        return;
    }
}));

/**
 * Migrate articles between linked accounts
 */
router.post('/migrate', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    const { targetUserId, strategy = 'merge' } = req.body;
    
    if (!targetUserId) {
        res.status(400).json({ error: 'Target user ID is required' });
        return;
    }
    
    try {
        // Verify accounts are linked
        const linkExists = await prisma.linkedAccount.findFirst({
            where: {
                OR: [
                    { primaryUserId: userId, linkedUserId: targetUserId },
                    { primaryUserId: targetUserId, linkedUserId: userId }
                ],
                verified: true
            }
        });
        
        if (!linkExists) {
            res.status(403).json({ error: 'Accounts are not linked' });
            return;
        }
        
        // Start transaction for migration
        const result = await prisma.$transaction(async (tx) => {
            if (strategy === 'merge') {
                // Get all articles from source account
                const sourceArticles = await tx.article.findMany({
                    where: { userId }
                });
                
                // Check for duplicates by URL
                const targetArticleUrls = await tx.article.findMany({
                    where: { userId: targetUserId },
                    select: { url: true }
                });
                const existingUrls = new Set(targetArticleUrls.map(a => a.url));
                
                // Filter out duplicates
                const articlesToMigrate = sourceArticles.filter(a => !existingUrls.has(a.url));
                
                // Copy articles to target account
                if (articlesToMigrate.length > 0) {
                    await tx.article.createMany({
                        data: articlesToMigrate.map(article => ({
                            ...article,
                            id: undefined, // Let DB generate new ID
                            userId: targetUserId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }))
                    });
                }
                
                // Create audit log
                await tx.accountLinkingAudit.create({
                    data: {
                        userId,
                        linkedId: targetUserId,
                        action: 'articles_migrated',
                        performedBy: userId,
                        metadata: {
                            strategy,
                            articlesCount: articlesToMigrate.length,
                            duplicatesSkipped: sourceArticles.length - articlesToMigrate.length
                        }
                    }
                });
                
                return {
                    migrated: articlesToMigrate.length,
                    skipped: sourceArticles.length - articlesToMigrate.length,
                    total: sourceArticles.length
                };
            } else if (strategy === 'move') {
                // Move all articles to target account
                const updateResult = await tx.article.updateMany({
                    where: { userId },
                    data: { userId: targetUserId }
                });
                
                // Create audit log
                await tx.accountLinkingAudit.create({
                    data: {
                        userId,
                        linkedId: targetUserId,
                        action: 'articles_moved',
                        performedBy: userId,
                        metadata: {
                            strategy,
                            articlesCount: updateResult.count
                        }
                    }
                });
                
                return {
                    moved: updateResult.count,
                    total: updateResult.count
                };
            } else {
                throw new Error('Invalid migration strategy');
            }
        });
        
        logger.info('✅ MIGRATION: Articles migrated successfully', {
            userId,
            targetUserId,
            strategy,
            result
        });
        
        res.json({
            success: true,
            ...result,
            message: `Articles ${strategy === 'merge' ? 'copied' : 'moved'} successfully`
        });
        return;
    } catch (error) {
        logger.error('❌ MIGRATION: Migration failed', { userId, targetUserId, error });
        res.status(500).json({
            error: 'Failed to migrate articles'
        });
        return;
    }
}));

/**
 * Set primary account
 */
router.post('/set-primary', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    const { primaryUserId } = req.body;
    
    if (!primaryUserId) {
        res.status(400).json({ error: 'Primary user ID is required' });
        return;
    }
    
    try {
        // Verify account ownership or linking
        if (primaryUserId !== userId) {
            const linkExists = await prisma.linkedAccount.findFirst({
                where: {
                    OR: [
                        { primaryUserId: userId, linkedUserId: primaryUserId },
                        { primaryUserId: primaryUserId, linkedUserId: userId }
                    ],
                    verified: true
                }
            });
            
            if (!linkExists) {
                res.status(403).json({ error: 'Cannot set unlinked account as primary' });
                return;
            }
        }
        
        // Update user's primary account preference
        await prisma.user.update({
            where: { id: userId },
            data: { primaryAccountId: primaryUserId === userId ? null : primaryUserId }
        });
        
        // Create audit log
        await prisma.accountLinkingAudit.create({
            data: {
                userId,
                linkedId: primaryUserId === userId ? null : primaryUserId,
                action: 'primary_set',
                performedBy: userId,
                metadata: {
                    primaryUserId,
                    previousPrimaryId: null
                }
            }
        });
        
        logger.info('✅ MIGRATION: Primary account set', { userId, primaryUserId });
        
        res.json({
            success: true,
            primaryUserId,
            message: 'Primary account set successfully'
        });
        return;
    } catch (error) {
        logger.error('❌ MIGRATION: Error setting primary account', { userId, error });
        res.status(500).json({
            error: 'Failed to set primary account'
        });
        return;
    }
}));

export default router;