import { Router, Response } from 'express';
import { prisma } from '../database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { authenticateEnterpriseToken, resolveLinkedAccounts, EnterpriseAuthenticatedRequest } from '../middleware/enterpriseAuth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { completeAccountLinking } from '../utils/enterpriseAccountLinking';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Get linked accounts for the current user - using enterprise auth
router.get('/linked', authenticateEnterpriseToken, resolveLinkedAccounts, asyncHandler(async (req: any, res: Response) => {
    const { primaryUserId, allUserIds, identities } = req.user;
    
    logger.info('[ACCOUNT LINKING] Getting linked accounts:', {
        primaryUserId,
        allUserIds,
        identityCount: identities?.length || 0
    });

    // With enterprise auth, we already have all the identities resolved
    if (!identities || identities.length === 0) {
        logger.warn('[ACCOUNT LINKING] No identities found for user:', primaryUserId);
        return res.json({
            currentUser: null,
            linkedAccounts: []
        });
    }

    // Find the primary identity
    const primaryIdentity = identities.find((id: any) => id.isPrimary) || identities[0];
    
    // Format the response with all linked identities
    const linkedIdentities = identities
        .filter((id: any) => !id.isPrimary)
        .map((identity: any) => ({
            id: identity.id,
            user: {
                id: identity.id,
                email: identity.actualEmail || identity.email,
                provider: identity.provider,
                createdAt: new Date() // We don't have this in identities, would need to fetch
            },
            isPrimary: false,
            linkedAt: new Date() // Would need to fetch from linkedAccount table
        }));

    // Get the actual linked account records for accurate timestamps
    const linkedAccountRecords = await prisma.linkedAccount.findMany({
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

    // Build the response with accurate data
    const formattedLinkedAccounts = linkedAccountRecords.map(la => {
        const linkedUser = la.primaryUserId === primaryUserId ? la.linkedUser : la.primaryUser;
        const actualEmail = (linkedUser.metadata as any)?.actualEmail || linkedUser.email;
        
        return {
            id: la.id,
            user: {
                id: linkedUser.id,
                email: actualEmail,
                provider: linkedUser.provider || 'local',
                createdAt: linkedUser.createdAt
            },
            isPrimary: linkedUser.id === primaryUserId,
            linkedAt: la.linkedAt
        };
    });

    return res.json({
        currentUser: {
            id: primaryIdentity.id,
            email: primaryIdentity.actualEmail || primaryIdentity.email,
            provider: primaryIdentity.provider,
            createdAt: new Date() // Would need to fetch if needed
        },
        linkedAccounts: formattedLinkedAccounts
    });
}));

// Initiate account linking
router.post('/link', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.user;
    const { targetEmail, targetProvider } = req.body;

    if (!targetEmail || !targetProvider) {
        throw createError('Target email and provider are required', 400);
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
        where: { email: targetEmail }
    });

    if (!targetUser) {
        throw createError('No account found with that email', 404);
    }

    if (targetUser.provider !== targetProvider) {
        throw createError(`Account with email ${targetEmail} is not a ${targetProvider} account`, 400);
    }

    if (targetUser.id === userId) {
        throw createError('Cannot link account to itself', 400);
    }

    // Check if already linked
    const existingLink = await prisma.linkedAccount.findFirst({
        where: {
            OR: [
                { primaryUserId: userId, linkedUserId: targetUser.id },
                { primaryUserId: targetUser.id, linkedUserId: userId }
            ]
        }
    });

    if (existingLink) {
        throw createError('Accounts are already linked', 409);
    }

    // Generate verification code
    const verificationCode = crypto.randomBytes(32).toString('hex');

    // Create pending link
    const linkedAccount = await prisma.linkedAccount.create({
        data: {
            primaryUserId: userId,
            linkedUserId: targetUser.id,
            verificationCode,
            verified: false
        }
    });

    // Create audit log
    await prisma.accountLinkingAudit.create({
        data: {
            userId,
            linkedId: targetUser.id,
            action: 'link_initiated',
            performedBy: userId,
            metadata: {
                targetEmail,
                targetProvider,
                method: 'email_verification'
            }
        }
    });

    // Note: Email verification system would be implemented here in production
    // Current implementation returns verification code for development/testing

    res.json({
        message: 'Account linking initiated. Please check your email for verification.',
        linkId: linkedAccount.id,
        verificationCode // Remove this in production
    });
}));

// Verify account linking
router.post('/verify', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { linkId, verificationCode } = req.body;

    if (!linkId || !verificationCode) {
        throw createError('Link ID and verification code are required', 400);
    }

    const linkedAccount = await prisma.linkedAccount.findUnique({
        where: { id: linkId },
        include: {
            primaryUser: true,
            linkedUser: true
        }
    });

    if (!linkedAccount) {
        throw createError('Invalid link ID', 404);
    }

    if (linkedAccount.verified) {
        throw createError('Account link already verified', 409);
    }

    if (linkedAccount.verificationCode !== verificationCode) {
        throw createError('Invalid verification code', 400);
    }

    // Verify the link
    await prisma.linkedAccount.update({
        where: { id: linkId },
        data: {
            verified: true,
            verificationCode: null
        }
    });

    // Create audit log
    await prisma.accountLinkingAudit.create({
        data: {
            userId: linkedAccount.linkedUserId,
            linkedId: linkedAccount.primaryUserId,
            action: 'link_verified',
            performedBy: req.user.userId,
            metadata: {
                linkId,
                verificationMethod: 'code'
            }
        }
    });

    res.json({
        message: 'Accounts successfully linked',
        linkedAccount: {
            primaryUser: {
                email: linkedAccount.primaryUser.email,
                provider: linkedAccount.primaryUser.provider
            },
            linkedUser: {
                email: linkedAccount.linkedUser.email,
                provider: linkedAccount.linkedUser.provider
            }
        }
    });
}));

// Handle OAuth linking callback
router.post('/oauth/link', asyncHandler(async (req: any, res: Response) => {
    const { linkingToken, provider } = req.body;

    if (!linkingToken || !provider) {
        throw createError('Linking token and provider are required', 400);
    }

    try {
        // Verify linking token
        const decoded = jwt.verify(linkingToken, JWT_SECRET) as any;
        
        if (decoded.action !== 'link_account') {
            throw createError('Invalid linking token', 400);
        }

        // The new enterprise implementation uses 'newProvider' instead of 'linkingProvider'
        if (decoded.newProvider !== provider && decoded.linkingProvider !== provider) {
            throw createError('Provider mismatch', 400);
        }

        // Find users - support both old and new token formats
        const primaryUserId = decoded.primaryUserId || decoded.userId;
        const newUserId = decoded.newUserId;

        const primaryUser = await prisma.user.findUnique({
            where: { id: primaryUserId }
        });

        // Try to find the new provider user by the newUserId from the token
        let newProviderUser = null;
        if (newUserId) {
            newProviderUser = await prisma.user.findUnique({
                where: { id: newUserId }
            });
        }
        
        // Fallback to finding by email and provider
        if (!newProviderUser) {
            newProviderUser = await prisma.user.findFirst({
                where: {
                    email: decoded.email,
                    provider: provider
                }
            });
        }

        if (!primaryUser || !newProviderUser) {
            logger.error('Account linking failed - users not found', {
                primaryUserId,
                newUserId,
                email: decoded.email,
                provider
            });
            throw createError('Users not found', 404);
        }

        // Check if already linked
        const existingLink = await prisma.linkedAccount.findFirst({
            where: {
                OR: [
                    { primaryUserId: primaryUser.id, linkedUserId: newProviderUser.id },
                    { primaryUserId: newProviderUser.id, linkedUserId: primaryUser.id }
                ]
            }
        });

        if (existingLink && existingLink.verified) {
            // Accounts already linked - return success with token
            const token = jwt.sign({
                userId: primaryUser.id,
                email: primaryUser.email,
                linkedUserIds: [newProviderUser.id]
            }, JWT_SECRET, { expiresIn: '7d' });

            logger.info('ACCOUNT LINKING: Accounts already linked', {
                primaryUserId: primaryUser.id,
                primaryEmail: primaryUser.email,
                primaryProvider: primaryUser.provider,
                linkedUserId: newProviderUser.id,
                linkedProvider: newProviderUser.provider
            });

            res.json({
                message: 'Accounts are already linked',
                token,
                user: {
                    id: primaryUser.id,
                    email: primaryUser.email,
                    provider: primaryUser.provider
                }
            });
            return;
        }

        // Create or update link (auto-verify since user authenticated with both providers)
        if (existingLink) {
            await prisma.linkedAccount.update({
                where: { id: existingLink.id },
                data: {
                    verified: true,
                    verificationCode: null,
                    metadata: {
                        ...existingLink.metadata as any,
                        verifiedAt: new Date(),
                        method: 'oauth'
                    }
                }
            });
        } else {
            await prisma.linkedAccount.create({
                data: {
                    primaryUserId: primaryUser.id,
                    linkedUserId: newProviderUser.id,
                    verified: true,
                    metadata: {
                        method: 'oauth',
                        verifiedAt: new Date(),
                        trustLevel: decoded.trustLevel || 'medium'
                    }
                }
            });
        }

        // Create audit log
        await prisma.accountLinkingAudit.create({
            data: {
                userId: primaryUser.id,
                linkedId: newProviderUser.id,
                action: 'link_verified',
                performedBy: primaryUser.id,
                metadata: {
                    method: 'oauth',
                    provider,
                    existingProvider: decoded.primaryProvider || decoded.existingProvider || primaryUser.provider,
                    trustLevel: decoded.trustLevel
                }
            }
        });

        // Generate new token that includes both accounts
        const token = jwt.sign({
            userId: primaryUser.id,
            email: primaryUser.email,
            linkedUserIds: [newProviderUser.id]
        }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Accounts successfully linked',
            token,
            user: {
                id: primaryUser.id,
                email: primaryUser.email,
                provider: primaryUser.provider
            }
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw createError('Invalid or expired linking token', 400);
        }
        throw error;
    }
}));

// Unlink accounts
router.delete('/unlink/:linkId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.user;
    const { linkId } = req.params;

    const linkedAccount = await prisma.linkedAccount.findUnique({
        where: { id: linkId }
    });

    if (!linkedAccount) {
        throw createError('Link not found', 404);
    }

    // Check if user is part of this link
    if (linkedAccount.primaryUserId !== userId && linkedAccount.linkedUserId !== userId) {
        throw createError('Unauthorized to unlink these accounts', 403);
    }

    // Delete the link
    await prisma.linkedAccount.delete({
        where: { id: linkId }
    });

    // Create audit log
    await prisma.accountLinkingAudit.create({
        data: {
            userId: linkedAccount.primaryUserId,
            linkedId: linkedAccount.linkedUserId,
            action: 'unlinked',
            performedBy: userId,
            metadata: {
                linkId,
                initiatedBy: userId === linkedAccount.primaryUserId ? 'primary' : 'linked'
            }
        }
    });

    res.json({
        message: 'Accounts successfully unlinked'
    });
}));

// Complete OAuth-based account linking
router.post('/complete-oauth', asyncHandler(async (req: any, res: Response) => {
    const { linkingToken, verificationCode } = req.body;

    if (!linkingToken) {
        throw createError('Linking token is required', 400);
    }

    logger.info('[ACCOUNT LINKING] Completing OAuth account linking:', {
        hasToken: !!linkingToken,
        hasVerificationCode: !!verificationCode
    });

    const result = await completeAccountLinking(linkingToken, verificationCode);

    if (result.success) {
        res.json({
            message: 'Accounts successfully linked',
            token: result.token
        });
    } else {
        throw createError(result.error || 'Failed to complete account linking', 400);
    }
}));

export default router;