import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// WebAuthn configuration
const rpName = 'Article Saver';
const rpID = 'localhost';
const origin = 'http://localhost'; // Match intercepted protocol

// Store challenges temporarily (in production, use Redis or database)
const challenges = new Map<string, string>();

// Start passkey registration
router.post('/register/begin', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { credentials: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get existing credentials for this user
        const userCredentials = user.credentials.map((cred: any) => ({
            id: cred.credentialId,
            type: 'public-key' as const,
            transports: cred.transports as AuthenticatorTransport[]
        }));

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: Buffer.from(user.id),
            userName: user.email,
            userDisplayName: user.email,
            attestationType: 'none',
            excludeCredentials: userCredentials,
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred'
                // Remove authenticatorAttachment to allow both platform (Touch ID, Windows Hello) 
                // and cross-platform (security keys) authenticators
            },
            timeout: 60000 // 60 seconds timeout
        });

        // Store challenge
        challenges.set(user.id, options.challenge);

        return res.json(options);
    } catch (error) {
        console.error('Passkey registration begin error:', error);
        return res.status(500).json({ error: 'Failed to start passkey registration' });
    }
});

// Complete passkey registration
router.post('/register/finish', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).user.userId;
        const { credential } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const expectedChallenge = challenges.get(user.id);
        if (!expectedChallenge) {
            return res.status(400).json({ error: 'No challenge found' });
        }

        const verification = await verifyRegistrationResponse({
            response: credential,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID
        });

        if (verification.verified && verification.registrationInfo) {
            const { credential: cred, credentialBackedUp, credentialDeviceType } = verification.registrationInfo;

            // Save credential to database
            await prisma.credential.create({
                data: {
                    userId: user.id,
                    credentialId: cred.id,
                    publicKey: Buffer.from(cred.publicKey).toString('base64url'),
                    counter: BigInt(cred.counter),
                    deviceType: credentialDeviceType || 'platform',
                    backedUp: credentialBackedUp || false,
                    transports: credential.response.transports || []
                }
            });

            // Clean up challenge
            challenges.delete(user.id);

            return res.json({ verified: true, message: 'Passkey registered successfully' });
        } else {
            return res.status(400).json({ error: 'Passkey registration failed' });
        }
    } catch (error) {
        console.error('Passkey registration finish error:', error);
        return res.status(500).json({ error: 'Failed to complete passkey registration' });
    }
});

// Start passkey authentication
router.post('/login/begin', async (req: Request, res: Response): Promise<any> => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { credentials: true }
        });

        if (!user || user.credentials.length === 0) {
            return res.status(404).json({ error: 'No passkeys found for this email' });
        }

        // Get user's credentials
        const allowCredentials = user.credentials.map((cred: any) => ({
            id: cred.credentialId,
            type: 'public-key' as const,
            transports: cred.transports as AuthenticatorTransport[]
        }));

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials,
            userVerification: 'preferred'
        });

        // Store challenge
        challenges.set(user.id, options.challenge);

        return res.json({ ...options, userId: user.id });
    } catch (error) {
        console.error('Passkey authentication begin error:', error);
        return res.status(500).json({ error: 'Failed to start passkey authentication' });
    }
});

// Complete passkey authentication
router.post('/login/finish', async (req: Request, res: Response): Promise<any> => {
    try {
        const { credential, userId } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { credentials: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const expectedChallenge = challenges.get(user.id);
        if (!expectedChallenge) {
            return res.status(400).json({ error: 'No challenge found' });
        }

        // Find the credential
        const dbCredential = user.credentials.find(
            (cred: any) => cred.credentialId === credential.id
        );

        if (!dbCredential) {
            return res.status(404).json({ error: 'Credential not found' });
        }

        const verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: dbCredential.credentialId,
                publicKey: Buffer.from(dbCredential.publicKey, 'base64url'),
                counter: Number(dbCredential.counter)
            }
        });

        if (verification.verified) {
            // Update counter
            await prisma.credential.update({
                where: { id: dbCredential.id },
                data: { counter: BigInt(verification.authenticationInfo.newCounter) }
            });

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET!,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
            );

            // Clean up challenge
            challenges.delete(user.id);

            return res.json({
                message: 'Authentication successful',
                user: {
                    id: user.id,
                    email: user.email,
                    createdAt: user.createdAt
                },
                token
            });
        } else {
            return res.status(400).json({ error: 'Passkey authentication failed' });
        }
    } catch (error) {
        console.error('Passkey authentication finish error:', error);
        return res.status(500).json({ error: 'Failed to complete passkey authentication' });
    }
});

// Get user's passkeys
router.get('/list', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).user.userId;

        const credentials = await prisma.credential.findMany({
            where: { userId },
            select: {
                id: true,
                deviceType: true,
                backedUp: true,
                transports: true,
                createdAt: true
            }
        });

        return res.json({ credentials });
    } catch (error) {
        console.error('List passkeys error:', error);
        return res.status(500).json({ error: 'Failed to list passkeys' });
    }
});

// Delete a passkey
router.delete('/:credentialId', authenticateToken, async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).user.userId;
        const { credentialId } = req.params;

        await prisma.credential.deleteMany({
            where: {
                id: credentialId,
                userId
            }
        });

        return res.json({ message: 'Passkey deleted successfully' });
    } catch (error) {
        console.error('Delete passkey error:', error);
        return res.status(500).json({ error: 'Failed to delete passkey' });
    }
});

export default router;
