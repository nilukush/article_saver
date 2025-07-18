import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface ApiError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

export const errorHandler = (
    err: ApiError,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log error details
    logger.error('HTTP Error', {
        statusCode,
        message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        isOperational: err.isOperational || false
    });

    // Send error response
    res.status(statusCode).json({
        error: {
            message,
            status: statusCode,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

export const createError = (message: string, statusCode: number = 500): ApiError => {
    const error: ApiError = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};

type AsyncRequestHandler<T = Request> = (
    req: T,
    res: Response,
    next: NextFunction
) => Promise<void | Response>;

export function asyncHandler<T = Request>(fn: AsyncRequestHandler<T>) {
    return (req: T, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
