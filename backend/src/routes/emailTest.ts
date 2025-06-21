import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { emailService } from '../services/emailService';
import logger from '../utils/logger';

const router = Router();

// Test email connection (admin only)
router.get('/test-connection', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // In production, add admin check here
    const isConnected = await emailService.testConnection();
    
    res.json({
        connected: isConnected,
        message: isConnected ? 'Email service is configured and working' : 'Email service is not configured or connection failed'
    });
}));

// Send test email (development only)
router.post('/test-send', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
        throw createError('Test emails are not allowed in production', 403);
    }

    const { userId } = req.user;
    const { email, type = 'verification' } = req.body;

    if (!email) {
        throw createError('Email address is required', 400);
    }

    let success = false;
    let message = '';

    try {
        switch (type) {
            case 'verification':
                success = await emailService.sendVerificationCode(email, 'TEST123', {
                    userId,
                    existingProvider: 'local',
                    newProvider: 'google',
                    expiresIn: 15
                });
                message = 'Verification email sent';
                break;

            case 'linked':
                success = await emailService.sendAccountLinkedNotification(email, {
                    userId,
                    linkedProvider: 'github',
                    linkedAt: new Date()
                });
                message = 'Account linked notification sent';
                break;

            case 'security':
                success = await emailService.sendSecurityAlert(email, {
                    userId,
                    alertType: 'new_login',
                    details: {
                        'IP Address': '192.168.1.1',
                        'Location': 'San Francisco, CA',
                        'Device': 'Chrome on macOS',
                        'Time': new Date().toLocaleString()
                    }
                });
                message = 'Security alert sent';
                break;

            default:
                throw createError('Invalid email type. Use: verification, linked, or security', 400);
        }

        if (!success) {
            throw createError('Failed to send test email', 500);
        }

        res.json({
            success,
            message,
            email,
            type
        });
    } catch (error) {
        logger.error('Test email failed', {
            error: error instanceof Error ? error.message : error,
            email,
            type
        });
        throw error;
    }
}));

// Get email configuration status (sanitized)
router.get('/config-status', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const hasSmtpHost = !!process.env.SMTP_HOST;
    const hasSmtpUser = !!process.env.SMTP_USER;
    const hasSmtpPass = !!process.env.SMTP_PASS;
    
    res.json({
        configured: hasSmtpHost && hasSmtpUser && hasSmtpPass,
        settings: {
            host: hasSmtpHost ? process.env.SMTP_HOST : 'Not configured',
            port: process.env.SMTP_PORT || '587',
            secure: process.env.SMTP_SECURE === 'true',
            from: process.env.EMAIL_FROM || 'Not configured',
            user: hasSmtpUser ? process.env.SMTP_USER?.replace(/(.{3}).*(@.*)/, '$1***$2') : 'Not configured'
        }
    });
}));

export default router;