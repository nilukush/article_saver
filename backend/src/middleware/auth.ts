import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
    user: {
        userId: string;
        email: string;
        linkedUserIds?: string[]; // Include linked user IDs from token
    };
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        throw createError('Access token required', 401);
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (req as any).user = {
            userId: decoded.userId,
            email: decoded.email,
            linkedUserIds: decoded.linkedUserIds // Pass through linked user IDs
        };
        next();
    } catch (error) {
        throw createError('Invalid or expired token', 403);
    }
};
