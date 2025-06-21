import nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer';
import logger from '../utils/logger';
import { prisma } from '../database';

// Email configuration from environment variables
const EMAIL_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    from: process.env.EMAIL_FROM || 'Article Saver <noreply@articlesaver.com>',
    replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM,
    // Rate limiting
    rateLimit: {
        maxEmails: parseInt(process.env.EMAIL_RATE_LIMIT_MAX || '50'),
        windowMs: parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW_MS || '3600000') // 1 hour
    }
};

// Email templates configuration
const TEMPLATES = {
    verificationCode: {
        subject: 'Verify Your Account Link - Article Saver',
        priority: 'high'
    },
    welcomeEmail: {
        subject: 'Welcome to Article Saver',
        priority: 'normal'
    },
    accountLinked: {
        subject: 'Account Successfully Linked - Article Saver',
        priority: 'normal'
    },
    securityAlert: {
        subject: 'Security Alert - Article Saver',
        priority: 'high'
    }
};

// Rate limiting tracking
const emailRateLimiter = new Map<string, { count: number; resetTime: number }>();

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private isInitialized = false;
    private initializationError: Error | null = null;

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            // Skip initialization if email credentials are not configured
            if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
                logger.warn('Email service not configured - missing SMTP credentials');
                this.initializationError = new Error('Email service not configured');
                return;
            }

            // Create reusable transporter
            this.transporter = nodemailer.createTransport({
                host: EMAIL_CONFIG.host,
                port: EMAIL_CONFIG.port,
                secure: EMAIL_CONFIG.secure,
                auth: EMAIL_CONFIG.auth,
                // Additional security options
                tls: {
                    rejectUnauthorized: process.env.NODE_ENV === 'production',
                    minVersion: 'TLSv1.2'
                },
                // Connection pooling for better performance
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
                // Timeouts
                connectionTimeout: 60000, // 60 seconds
                greetingTimeout: 30000, // 30 seconds
                socketTimeout: 600000 // 10 minutes
            });

            // Verify connection configuration
            if (this.transporter) {
                await this.transporter.verify();
            }
            this.isInitialized = true;
            logger.info('Email service initialized successfully');
        } catch (error) {
            this.initializationError = error as Error;
            logger.error('Failed to initialize email service', { 
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined
            });
        }
    }

    private checkRateLimit(email: string): boolean {
        const now = Date.now();
        const userLimit = emailRateLimiter.get(email);

        if (!userLimit || userLimit.resetTime < now) {
            // Reset or create new limit
            emailRateLimiter.set(email, {
                count: 1,
                resetTime: now + EMAIL_CONFIG.rateLimit.windowMs
            });
            return true;
        }

        if (userLimit.count >= EMAIL_CONFIG.rateLimit.maxEmails) {
            return false;
        }

        userLimit.count++;
        return true;
    }

    private cleanupRateLimiter(): void {
        const now = Date.now();
        for (const [email, limit] of emailRateLimiter.entries()) {
            if (limit.resetTime < now) {
                emailRateLimiter.delete(email);
            }
        }
    }

    async sendVerificationCode(
        email: string, 
        code: string, 
        context: {
            userId: string;
            existingProvider: string;
            newProvider: string;
            expiresIn?: number; // minutes
        }
    ): Promise<boolean> {
        try {
            // Check rate limit
            if (!this.checkRateLimit(email)) {
                logger.warn('Email rate limit exceeded', { email });
                throw new Error('Rate limit exceeded. Please try again later.');
            }

            // Generate HTML email
            const html = this.generateVerificationEmailHTML({
                code,
                existingProvider: context.existingProvider,
                newProvider: context.newProvider,
                expiresIn: context.expiresIn || 15
            });

            // Generate plain text fallback
            const text = this.generateVerificationEmailText({
                code,
                existingProvider: context.existingProvider,
                newProvider: context.newProvider,
                expiresIn: context.expiresIn || 15
            });

            const result = await this.sendEmail({
                to: email,
                subject: TEMPLATES.verificationCode.subject,
                html,
                text,
                priority: TEMPLATES.verificationCode.priority
            });

            if (result.success) {
                // Log email sent event
                await prisma.accountLinkingAudit.create({
                    data: {
                        userId: context.userId,
                        action: 'verification_email_sent',
                        performedBy: context.userId,
                        metadata: {
                            email,
                            provider: context.newProvider,
                            messageId: result.messageId,
                            timestamp: new Date()
                        }
                    }
                });
            }

            return result.success;
        } catch (error) {
            logger.error('Failed to send verification email', {
                error: error instanceof Error ? error.message : error,
                email,
                context
            });
            return false;
        }
    }

    async sendAccountLinkedNotification(
        email: string,
        context: {
            userId: string;
            linkedProvider: string;
            linkedAt: Date;
        }
    ): Promise<boolean> {
        try {
            const html = this.generateAccountLinkedEmailHTML({
                linkedProvider: context.linkedProvider,
                linkedAt: context.linkedAt
            });

            const text = this.generateAccountLinkedEmailText({
                linkedProvider: context.linkedProvider,
                linkedAt: context.linkedAt
            });

            const result = await this.sendEmail({
                to: email,
                subject: TEMPLATES.accountLinked.subject,
                html,
                text,
                priority: TEMPLATES.accountLinked.priority
            });

            return result.success;
        } catch (error) {
            logger.error('Failed to send account linked notification', {
                error: error instanceof Error ? error.message : error,
                email,
                context
            });
            return false;
        }
    }

    async sendSecurityAlert(
        email: string,
        context: {
            userId: string;
            alertType: 'new_login' | 'password_changed' | 'account_linked' | 'suspicious_activity';
            details: Record<string, any>;
        }
    ): Promise<boolean> {
        try {
            const html = this.generateSecurityAlertEmailHTML({
                alertType: context.alertType,
                details: context.details
            });

            const text = this.generateSecurityAlertEmailText({
                alertType: context.alertType,
                details: context.details
            });

            const result = await this.sendEmail({
                to: email,
                subject: TEMPLATES.securityAlert.subject,
                html,
                text,
                priority: TEMPLATES.securityAlert.priority
            });

            if (result.success) {
                // Log security alert
                await prisma.accountLinkingAudit.create({
                    data: {
                        userId: context.userId,
                        action: 'security_alert_sent',
                        performedBy: 'system',
                        metadata: {
                            alertType: context.alertType,
                            details: context.details,
                            messageId: result.messageId
                        }
                    }
                });
            }

            return result.success;
        } catch (error) {
            logger.error('Failed to send security alert', {
                error: error instanceof Error ? error.message : error,
                email,
                context
            });
            return false;
        }
    }

    private async sendEmail(options: {
        to: string;
        subject: string;
        html: string;
        text: string;
        priority?: string;
        attachments?: any[];
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            // Check if service is initialized
            if (!this.isInitialized) {
                if (this.initializationError) {
                    throw this.initializationError;
                }
                throw new Error('Email service not initialized');
            }

            if (!this.transporter) {
                throw new Error('Email transporter not available');
            }

            // Cleanup old rate limit entries periodically
            this.cleanupRateLimiter();

            // Send email
            const info: SentMessageInfo = await this.transporter.sendMail({
                from: EMAIL_CONFIG.from,
                replyTo: EMAIL_CONFIG.replyTo,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
                priority: options.priority as 'high' | 'normal' | 'low' | undefined,
                attachments: options.attachments,
                // Additional headers for better deliverability
                headers: {
                    'X-Priority': options.priority === 'high' ? '1' : '3',
                    'X-MSMail-Priority': options.priority === 'high' ? 'High' : 'Normal',
                    'X-Mailer': 'Article Saver Email Service',
                    'List-Unsubscribe': '<mailto:unsubscribe@articlesaver.com>'
                }
            });

            logger.info('Email sent successfully', {
                messageId: info.messageId,
                to: options.to,
                subject: options.subject
            });

            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            logger.error('Failed to send email', {
                error: error instanceof Error ? error.message : error,
                to: options.to,
                subject: options.subject
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send email'
            };
        }
    }

    // Email template generators
    private generateVerificationEmailHTML(data: {
        code: string;
        existingProvider: string;
        newProvider: string;
        expiresIn: number;
    }): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Account Link</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #007bff; color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 40px 20px; }
        .code-box { background-color: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
        .code { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; font-family: monospace; }
        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .providers { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .provider-badge { display: inline-block; background-color: #6c757d; color: white; padding: 5px 10px; border-radius: 3px; margin: 0 5px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verify Your Account Link</h1>
        </div>
        <div class="content">
            <h2>Account Linking Verification Required</h2>
            <p>You're attempting to link your <strong>${data.newProvider}</strong> account with your existing <strong>${data.existingProvider}</strong> account.</p>
            
            <div class="providers">
                <strong>Linking:</strong>
                <span class="provider-badge">${data.existingProvider}</span>
                →
                <span class="provider-badge">${data.newProvider}</span>
            </div>

            <p>To complete this process, please enter the verification code below:</p>
            
            <div class="code-box">
                <div class="code">${data.code}</div>
            </div>
            
            <div class="warning">
                <strong>Important:</strong> This code will expire in ${data.expiresIn} minutes. Do not share this code with anyone.
            </div>
            
            <p>Once verified, you'll be able to:</p>
            <ul>
                <li>Access all your articles from both accounts</li>
                <li>Sign in with either provider</li>
                <li>Maintain a single, unified article collection</li>
            </ul>
            
            <p>If you didn't request this verification, please ignore this email or contact our support team.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Article Saver. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    private generateVerificationEmailText(data: {
        code: string;
        existingProvider: string;
        newProvider: string;
        expiresIn: number;
    }): string {
        return `
VERIFY YOUR ACCOUNT LINK

You're attempting to link your ${data.newProvider} account with your existing ${data.existingProvider} account.

Your verification code is: ${data.code}

This code will expire in ${data.expiresIn} minutes.

Once verified, you'll be able to:
- Access all your articles from both accounts
- Sign in with either provider
- Maintain a single, unified article collection

If you didn't request this verification, please ignore this email.

© ${new Date().getFullYear()} Article Saver. All rights reserved.
        `;
    }

    private generateAccountLinkedEmailHTML(data: {
        linkedProvider: string;
        linkedAt: Date;
    }): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Successfully Linked</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #28a745; color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 40px 20px; }
        .success-icon { font-size: 48px; margin-bottom: 20px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✓</div>
            <h1>Account Successfully Linked</h1>
        </div>
        <div class="content">
            <p>Great news! Your <strong>${data.linkedProvider}</strong> account has been successfully linked to your Article Saver account.</p>
            
            <p><strong>Linked on:</strong> ${data.linkedAt.toLocaleString()}</p>
            
            <p>You can now sign in using either of your linked accounts and access all your saved articles in one place.</p>
            
            <h3>What's Next?</h3>
            <ul>
                <li>Sign in with any of your linked providers</li>
                <li>All your articles are now accessible from a single account</li>
                <li>Continue saving and organizing articles as usual</li>
            </ul>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Article Saver. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    private generateAccountLinkedEmailText(data: {
        linkedProvider: string;
        linkedAt: Date;
    }): string {
        return `
ACCOUNT SUCCESSFULLY LINKED

Your ${data.linkedProvider} account has been successfully linked to your Article Saver account.

Linked on: ${data.linkedAt.toLocaleString()}

You can now sign in using either of your linked accounts and access all your saved articles in one place.

© ${new Date().getFullYear()} Article Saver. All rights reserved.
        `;
    }

    private generateSecurityAlertEmailHTML(data: {
        alertType: string;
        details: Record<string, any>;
    }): string {
        const alertTitles: Record<string, string> = {
            'new_login': 'New Login Detected',
            'password_changed': 'Password Changed',
            'account_linked': 'New Account Linked',
            'suspicious_activity': 'Suspicious Activity Detected'
        };

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Alert</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #dc3545; color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 40px 20px; }
        .alert-box { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
        .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Security Alert</h1>
        </div>
        <div class="content">
            <div class="alert-box">
                <h2>${alertTitles[data.alertType] || 'Security Alert'}</h2>
            </div>
            
            <p>We detected activity on your Article Saver account that requires your attention.</p>
            
            <div class="details">
                <h3>Details:</h3>
                <ul>
                    ${Object.entries(data.details).map(([key, value]) => 
                        `<li><strong>${key}:</strong> ${value}</li>`
                    ).join('')}
                </ul>
            </div>
            
            <p><strong>If this was you:</strong> No action is needed.</p>
            <p><strong>If this wasn't you:</strong> Please secure your account immediately by changing your password and reviewing your linked accounts.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Article Saver. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    private generateSecurityAlertEmailText(data: {
        alertType: string;
        details: Record<string, any>;
    }): string {
        const alertTitles: Record<string, string> = {
            'new_login': 'New Login Detected',
            'password_changed': 'Password Changed',
            'account_linked': 'New Account Linked',
            'suspicious_activity': 'Suspicious Activity Detected'
        };

        return `
SECURITY ALERT

${alertTitles[data.alertType] || 'Security Alert'}

We detected activity on your Article Saver account:

${Object.entries(data.details).map(([key, value]) => 
    `${key}: ${value}`
).join('\n')}

If this was you: No action is needed.
If this wasn't you: Please secure your account immediately.

© ${new Date().getFullYear()} Article Saver. All rights reserved.
        `;
    }

    // Test email functionality
    async testConnection(): Promise<boolean> {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }
            
            await this.transporter.verify();
            logger.info('Email service test successful');
            return true;
        } catch (error) {
            logger.error('Email service test failed', {
                error: error instanceof Error ? error.message : error
            });
            return false;
        }
    }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types for use in other modules
export interface EmailVerificationContext {
    userId: string;
    existingProvider: string;
    newProvider: string;
    expiresIn?: number;
}

export interface EmailNotificationContext {
    userId: string;
    linkedProvider: string;
    linkedAt: Date;
}

export interface EmailSecurityAlertContext {
    userId: string;
    alertType: 'new_login' | 'password_changed' | 'account_linked' | 'suspicious_activity';
    details: Record<string, any>;
}