import express from 'express';
import { prisma } from '../database';
import logger from '../utils/logger';

const router = express.Router();

// Enterprise debugging endpoint for development
router.get('/verification-code/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        // Only allow in development
        if (process.env.NODE_ENV !== 'development') {
            return res.status(404).json({ error: 'Not found' });
        }
        
        // Get latest verification code from database directly
        const latestCode = await prisma.verificationCode.findFirst({
            where: {
                email,
                purpose: 'account_linking',
                verified: false
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        if (!latestCode) {
            return res.json({ 
                error: 'No verification code found',
                suggestion: 'Try the OAuth flow again to generate a new code'
            });
        }
        
        logger.info('ENTERPRISE DEBUG: Verification code retrieved', {
            email,
            hasCode: !!latestCode.code,
            expiresAt: latestCode.expiresAt
        });
        
        return res.json({
            code: latestCode.code,
            expiresAt: latestCode.expiresAt,
            isValid: latestCode.expiresAt > new Date(),
            purpose: latestCode.purpose
        });
        
    } catch (error) {
        logger.error('ENTERPRISE DEBUG: Error retrieving verification code', {
            error: error instanceof Error ? error.message : error
        });
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;