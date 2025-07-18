import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import logger from '../utils/logger';
import { JWTUser } from '../types/express';

export interface AuthenticatedRequest extends Request {
    user: JWTUser;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
// TypeScript now knows JWT_SECRET is defined after this check
const JWT_SECRET_VERIFIED: string = JWT_SECRET;

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        throw createError('Access token required', 401);
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET_VERIFIED) as any;
        (req as AuthenticatedRequest).user = {
            userId: decoded.userId,
            email: decoded.email,
            linkedUserIds: decoded.linkedUserIds // Pass through linked user IDs
        };
        
        // Debug logging for linked accounts
        if (req.method === 'PUT' && req.path.includes('/articles/')) {
            logger.debug('AUTH MIDDLEWARE: Token decoded for article update', {
                userId: decoded.userId,
                email: decoded.email,
                hasLinkedUserIds: !!decoded.linkedUserIds,
                linkedUserIds: decoded.linkedUserIds || 'none',
                linkedCount: decoded.linkedUserIds?.length || 0
            });
        }
        
        next();
    } catch (error) {
        throw createError('Invalid or expired token', 403);
    }
};
