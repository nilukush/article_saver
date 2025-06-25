import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

// OAuth-specific rate limiter - stricter than general API
export const oauthRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 OAuth requests per windowMs
    message: {
        error: 'Too Many OAuth Requests',
        message: 'Too many OAuth requests from this IP, please try again later.',
        retryAfter: 15 * 60 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use req.ip which respects the trust proxy setting
        return req.ip?.replace(/:\d+[^:]*$/, '') || 'unknown';
    },
    handler: (req, res) => {
        logger.warn('OAuth rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            userAgent: req.get('user-agent')
        });
        res.status(429).json({
            error: 'Too Many OAuth Requests',
            message: 'Too many OAuth requests from this IP, please try again later.',
            retryAfter: 15 * 60 // 15 minutes in seconds
        });
    },
    skip: (req) => {
        // Skip rate limiting for URL generation endpoints
        return req.path.endsWith('/url');
    }
});

// Bot detection middleware for OAuth callbacks
export const oauthBotProtection = (req: Request, res: Response, next: NextFunction): void => {
    const userAgent = req.get('user-agent') || '';
    const { code, state } = req.query;
    
    // Common bot user agents
    const botPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /scan/i,
        /slurp/i,
        /curl/i,
        /wget/i,
        /python/i,
        /java/i,
        /go-http-client/i,
        /postman/i,
        /insomnia/i
    ];
    
    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    
    // Log potential bot activity
    if (isBot || !code || !state) {
        logger.info('Potential bot detected on OAuth callback', {
            path: req.path,
            userAgent,
            ip: req.ip,
            hasCode: !!code,
            hasState: !!state,
            isBot
        });
        
        // For bots, return 404 immediately without processing
        if (isBot && (!code || !state)) {
            res.status(404).send('Not Found');
            return;
        }
    }
    
    next();
};

// Security headers for OAuth endpoints
export const oauthSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // CSP for OAuth callbacks
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; frame-ancestors 'none'; form-action 'self';"
    );
    
    next();
};