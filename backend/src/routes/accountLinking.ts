import { Router, Response } from 'express';
import { prisma } from '../database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Get linked accounts for the current user
router.get('/linked', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.user;

    // Get all linked accounts where user is primary
    const linkedAsOwner = await prisma.linkedAccount.findMany({
        where: {
            primaryUserId: userId,
            verified: true
        },
        include: {
            linkedUser: {
                select: {
                    id: true,
                    email: true,
                    provider: true,
                    createdAt: true
                }
            }
        }
    });

    // Get all linked accounts where user is linked
    const linkedAsLinked = await prisma.linkedAccount.findMany({
        where: {
            linkedUserId: userId,
            verified: true
        },
        include: {
            primaryUser: {
                select: {
                    id: true,
                    email: true,
                    provider: true,
                    createdAt: true
                }
            }
        }
    });

    // Get current user info
    const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            provider: true,
            createdAt: true
        }
    });

    res.json({
        currentUser,
        linkedAccounts: [
            ...linkedAsOwner.map(la => ({
                id: la.id,
                user: la.linkedUser,
                isPrimary: false,
                linkedAt: la.linkedAt
            })),
            ...linkedAsLinked.map(la => ({
                id: la.id,
                user: la.primaryUser,
                isPrimary: true,
                linkedAt: la.linkedAt
            }))
        ]
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

    // TODO: Send verification email to targetEmail
    // For now, we'll return the verification code (in production, this would be emailed)

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

        if (decoded.linkingProvider !== provider) {
            throw createError('Provider mismatch', 400);
        }

        // Find users
        const existingUser = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        const newProviderUser = await prisma.user.findFirst({
            where: {
                email: decoded.email,
                provider: provider
            }
        });

        if (!existingUser || !newProviderUser) {
            throw createError('Users not found', 404);
        }

        // Check if already linked
        const existingLink = await prisma.linkedAccount.findFirst({
            where: {
                OR: [
                    { primaryUserId: existingUser.id, linkedUserId: newProviderUser.id },
                    { primaryUserId: newProviderUser.id, linkedUserId: existingUser.id }
                ]
            }
        });

        if (existingLink && existingLink.verified) {
            throw createError('Accounts are already linked', 409);
        }

        // Create or update link (auto-verify since user authenticated with both providers)
        if (existingLink) {
            await prisma.linkedAccount.update({
                where: { id: existingLink.id },
                data: {
                    verified: true,
                    verificationCode: null
                }
            });
        } else {
            await prisma.linkedAccount.create({
                data: {
                    primaryUserId: existingUser.id,
                    linkedUserId: newProviderUser.id,
                    verified: true
                }
            });
        }

        // Create audit log
        await prisma.accountLinkingAudit.create({
            data: {
                userId: existingUser.id,
                linkedId: newProviderUser.id,
                action: 'link_verified',
                performedBy: existingUser.id,
                metadata: {
                    method: 'oauth',
                    provider,
                    existingProvider: decoded.existingProvider
                }
            }
        });

        // Generate new token that includes both accounts
        const token = jwt.sign({
            userId: existingUser.id,
            email: existingUser.email,
            linkedUserIds: [newProviderUser.id]
        }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Accounts successfully linked',
            token,
            user: {
                id: existingUser.id,
                email: existingUser.email,
                provider: existingUser.provider
            }
        });
    } catch (error) {
        throw createError('Invalid or expired linking token', 400);
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

export default router;