import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../database';
import { createError } from './errorHandler';
import logger from '../utils/logger';

export interface EnterpriseAuthenticatedRequest extends Request {
    user: {
        userId: string;
        email: string;
        primaryUserId: string; // Always points to the primary account
        provider: string;
        linkedUserIds: string[]; // All linked user IDs
    };
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

/**
 * Enterprise-grade authentication middleware that properly resolves primary users
 * and handles linked accounts consistently across all authentication methods
 */
export const authenticateEnterpriseToken = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        throw createError('Access token required', 401);
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        // Find the user from the token
        const tokenUser = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!tokenUser) {
            throw createError('User not found', 404);
        }

        // Check if this user has a primary account set (meaning it's a linked account)
        let primaryUserId = tokenUser.primaryAccountId || tokenUser.id;
        let primaryUser = tokenUser;

        if (tokenUser.primaryAccountId) {
            // This is a linked account, get the primary
            const primary = await prisma.user.findUnique({
                where: { id: tokenUser.primaryAccountId }
            });
            
            if (primary) {
                primaryUser = primary;
                primaryUserId = primary.id;
            }
        }

        // Find all linked accounts for this user (both as primary and linked)
        const linkedAccounts = await prisma.linkedAccount.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { primaryUserId: primaryUserId },
                            { linkedUserId: primaryUserId }
                        ]
                    },
                    { verified: true }
                ]
            },
            include: {
                primaryUser: true,
                linkedUser: true
            }
        });

        // Collect all user IDs associated with this identity
        const allUserIds = new Set<string>([primaryUserId]);
        
        linkedAccounts.forEach(link => {
            allUserIds.add(link.primaryUserId);
            allUserIds.add(link.linkedUserId);
        });

        // Determine the actual email to use
        // Priority: actual email from metadata > primary user email > token email
        let actualEmail = decoded.email;
        
        if (primaryUser.metadata && typeof primaryUser.metadata === 'object') {
            const metadata = primaryUser.metadata as any;
            if (metadata.actualEmail) {
                actualEmail = metadata.actualEmail;
            }
        } else if (primaryUser.email && !primaryUser.email.includes('.') ) {
            actualEmail = primaryUser.email;
        }

        // Log for debugging
        logger.info('[ENTERPRISE AUTH] Token resolved:', {
            tokenUserId: decoded.userId,
            primaryUserId,
            actualEmail,
            provider: tokenUser.provider,
            linkedUserCount: allUserIds.size
        });

        // Set the enhanced user object on the request
        (req as any).user = {
            userId: primaryUserId, // Always use primary user ID
            email: actualEmail,
            primaryUserId,
            provider: tokenUser.provider || 'local',
            linkedUserIds: Array.from(allUserIds)
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw createError('Invalid or expired token', 403);
        }
        logger.error('[ENTERPRISE AUTH] Authentication error:', error);
        throw createError('Authentication failed', 500);
    }
};

/**
 * Middleware to ensure consistent user context across linked accounts
 * Use this for endpoints that need to work with all linked accounts
 */
export const resolveLinkedAccounts = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const user = (req as any).user;
    
    if (!user || !user.primaryUserId) {
        return next();
    }

    try {
        // Get all verified linked accounts
        const linkedAccounts = await prisma.linkedAccount.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { primaryUserId: user.primaryUserId },
                            { linkedUserId: user.primaryUserId }
                        ]
                    },
                    { verified: true }
                ]
            },
            include: {
                primaryUser: {
                    include: {
                        articles: false // Don't load articles here
                    }
                },
                linkedUser: {
                    include: {
                        articles: false
                    }
                }
            }
        });

        // Build a complete picture of all linked identities
        const identities = new Map<string, any>();
        
        // Add the primary user
        const primaryUser = await prisma.user.findUnique({
            where: { id: user.primaryUserId }
        });
        
        if (primaryUser) {
            identities.set(primaryUser.id, {
                id: primaryUser.id,
                email: primaryUser.email,
                provider: primaryUser.provider || 'local',
                isPrimary: true,
                actualEmail: (primaryUser.metadata as any)?.actualEmail || primaryUser.email
            });
        }

        // Add all linked users
        linkedAccounts.forEach(link => {
            const linkedUser = link.primaryUserId === user.primaryUserId 
                ? link.linkedUser 
                : link.primaryUser;
                
            identities.set(linkedUser.id, {
                id: linkedUser.id,
                email: linkedUser.email,
                provider: linkedUser.provider || 'local',
                isPrimary: linkedUser.id === user.primaryUserId,
                actualEmail: (linkedUser.metadata as any)?.actualEmail || linkedUser.email
            });
        });

        // Enhance the user object with complete identity information
        (req as any).user = {
            ...user,
            identities: Array.from(identities.values()),
            allUserIds: Array.from(identities.keys())
        };

        next();
    } catch (error) {
        logger.error('[ENTERPRISE AUTH] Failed to resolve linked accounts:', error);
        next(); // Continue even if this fails
    }
};