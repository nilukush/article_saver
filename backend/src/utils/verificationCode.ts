import crypto from 'crypto';
import { prisma } from '../database';
import logger from './logger';

interface VerificationCodeOptions {
    length?: number;
    type?: 'numeric' | 'alphanumeric' | 'alphabetic';
    expiresInMinutes?: number;
}

interface StoredVerificationCode {
    id: string;
    userId: string;
    email: string;
    code: string;
    purpose: string;
    expiresAt: Date;
    attempts: number;
    verified: boolean;
    metadata?: Record<string, any>;
}

export class VerificationCodeService {
    private static readonly MAX_ATTEMPTS = 5;
    private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
    private static cleanupTimer: NodeJS.Timeout | null = null;

    static {
        // Start cleanup timer
        this.startCleanupTimer();
    }

    /**
     * Generate a verification code based on options
     */
    static generateCode(options: VerificationCodeOptions = {}): string {
        const {
            length = 6,
            type = 'numeric'
        } = options;

        let charset: string;
        switch (type) {
            case 'numeric':
                charset = '0123456789';
                break;
            case 'alphabetic':
                charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                break;
            case 'alphanumeric':
                charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                break;
            default:
                charset = '0123456789';
        }

        let code = '';
        const randomBytes = crypto.randomBytes(length);
        
        for (let i = 0; i < length; i++) {
            code += charset[randomBytes[i] % charset.length];
        }

        return code;
    }

    /**
     * Generate a secure hash for storing verification codes
     */
    static hashCode(code: string): string {
        return crypto
            .createHash('sha256')
            .update(code + process.env.JWT_SECRET)
            .digest('hex');
    }

    /**
     * Store a verification code in the database
     */
    static async storeCode(
        userId: string,
        email: string,
        purpose: string,
        options: VerificationCodeOptions = {},
        metadata?: Record<string, any>
    ): Promise<{ code: string; expiresAt: Date }> {
        const code = this.generateCode(options);
        const hashedCode = this.hashCode(code);
        const expiresAt = new Date(Date.now() + (options.expiresInMinutes || 15) * 60 * 1000);

        try {
            // Invalidate any existing codes for the same purpose
            await prisma.verificationCode.updateMany({
                where: {
                    userId,
                    email,
                    purpose,
                    verified: false,
                    expiresAt: { gt: new Date() }
                },
                data: {
                    expiresAt: new Date(), // Expire immediately
                    metadata: {
                        invalidatedAt: new Date(),
                        reason: 'new_code_requested'
                    }
                }
            });

            // Create new verification code
            await prisma.verificationCode.create({
                data: {
                    userId,
                    email,
                    code: hashedCode,
                    purpose,
                    expiresAt,
                    attempts: 0,
                    verified: false,
                    metadata: metadata || {}
                }
            });

            logger.info('Verification code stored', { 
                userId, 
                email, 
                purpose,
                expiresAt 
            });

            return { code, expiresAt };
        } catch (error) {
            logger.error('Failed to store verification code', {
                error: error instanceof Error ? error.message : error,
                userId,
                email,
                purpose
            });
            throw error;
        }
    }

    /**
     * Verify a code
     */
    static async verifyCode(
        userId: string,
        email: string,
        code: string,
        purpose: string
    ): Promise<{ valid: boolean; error?: string }> {
        const hashedCode = this.hashCode(code);

        try {
            const storedCode = await prisma.verificationCode.findFirst({
                where: {
                    userId,
                    email,
                    code: hashedCode,
                    purpose,
                    verified: false,
                    expiresAt: { gt: new Date() }
                }
            });

            if (!storedCode) {
                // Check if code exists but is expired
                const expiredCode = await prisma.verificationCode.findFirst({
                    where: {
                        userId,
                        email,
                        code: hashedCode,
                        purpose,
                        verified: false,
                        expiresAt: { lte: new Date() }
                    }
                });

                if (expiredCode) {
                    return { valid: false, error: 'Verification code has expired' };
                }

                return { valid: false, error: 'Invalid verification code' };
            }

            // Check attempts
            if (storedCode.attempts >= this.MAX_ATTEMPTS) {
                return { valid: false, error: 'Too many failed attempts. Please request a new code.' };
            }

            // Update the code as verified
            await prisma.verificationCode.update({
                where: { id: storedCode.id },
                data: {
                    verified: true,
                    metadata: {
                        ...storedCode.metadata as any,
                        verifiedAt: new Date()
                    }
                }
            });

            logger.info('Verification code verified successfully', {
                userId,
                email,
                purpose
            });

            return { valid: true };
        } catch (error) {
            logger.error('Error verifying code', {
                error: error instanceof Error ? error.message : error,
                userId,
                email,
                purpose
            });
            return { valid: false, error: 'Failed to verify code' };
        }
    }

    /**
     * Increment failed attempts for a code
     */
    static async incrementAttempts(
        userId: string,
        email: string,
        purpose: string
    ): Promise<void> {
        try {
            await prisma.verificationCode.updateMany({
                where: {
                    userId,
                    email,
                    purpose,
                    verified: false,
                    expiresAt: { gt: new Date() }
                },
                data: {
                    attempts: { increment: 1 }
                }
            });
        } catch (error) {
            logger.error('Failed to increment verification attempts', {
                error: error instanceof Error ? error.message : error,
                userId,
                email,
                purpose
            });
        }
    }

    /**
     * Check if user has requested too many codes recently
     */
    static async checkRateLimit(
        userId: string,
        email: string,
        purpose: string,
        maxCodesPerHour: number = 3
    ): Promise<{ allowed: boolean; waitMinutes?: number }> {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        try {
            const recentCodes = await prisma.verificationCode.count({
                where: {
                    userId,
                    email,
                    purpose,
                    createdAt: { gte: oneHourAgo }
                }
            });

            if (recentCodes >= maxCodesPerHour) {
                // Find the oldest code in the last hour
                const oldestRecentCode = await prisma.verificationCode.findFirst({
                    where: {
                        userId,
                        email,
                        purpose,
                        createdAt: { gte: oneHourAgo }
                    },
                    orderBy: { createdAt: 'asc' }
                });

                if (oldestRecentCode) {
                    const waitTime = 60 - Math.floor((Date.now() - oldestRecentCode.createdAt.getTime()) / 60000);
                    return { allowed: false, waitMinutes: Math.max(1, waitTime) };
                }
            }

            return { allowed: true };
        } catch (error) {
            logger.error('Failed to check rate limit', {
                error: error instanceof Error ? error.message : error,
                userId,
                email,
                purpose
            });
            return { allowed: true }; // Allow in case of error
        }
    }

    /**
     * Clean up expired verification codes
     */
    private static async cleanupExpiredCodes(): Promise<void> {
        try {
            const result = await prisma.verificationCode.deleteMany({
                where: {
                    OR: [
                        { expiresAt: { lte: new Date() } },
                        { verified: true, updatedAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Delete verified codes older than 24 hours
                    ]
                }
            });

            if (result.count > 0) {
                logger.info('Cleaned up expired verification codes', { count: result.count });
            }
        } catch (error) {
            logger.error('Failed to cleanup expired codes', {
                error: error instanceof Error ? error.message : error
            });
        }
    }

    /**
     * Start the cleanup timer
     */
    private static startCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        // Run cleanup immediately
        this.cleanupExpiredCodes();

        // Schedule periodic cleanup
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredCodes();
        }, this.CLEANUP_INTERVAL);

        // Ensure cleanup timer doesn't prevent process from exiting
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }

    /**
     * Stop the cleanup timer (useful for testing)
     */
    static stopCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
}

// Export convenience functions
export const generateVerificationCode = VerificationCodeService.generateCode.bind(VerificationCodeService);
export const storeVerificationCode = VerificationCodeService.storeCode.bind(VerificationCodeService);
export const verifyCode = VerificationCodeService.verifyCode.bind(VerificationCodeService);
export const checkCodeRateLimit = VerificationCodeService.checkRateLimit.bind(VerificationCodeService);