import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Enterprise-grade request logging with intelligent filtering
const shouldLogRequest = (req: Request): boolean => {
    // Skip logging for health checks and high-frequency endpoints
    const skipPaths = ['/health', '/favicon.ico'];
    
    // Skip logging for static assets
    if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
        return false;
    }
    
    // Skip logging for specific paths
    if (skipPaths.some(path => req.url.startsWith(path))) {
        return false;
    }
    
    return true;
};

const getLogLevel = (statusCode: number): string => {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (statusCode >= 300) return 'info';
    return 'debug'; // 2xx responses logged at debug level
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    
    // Only log if request meets enterprise criteria
    if (!shouldLogRequest(req)) {
        next();
        return;
    }

    // Log request at debug level for development visibility
    logger.debug('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip
    });

    // Log response when it finishes with appropriate level
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = getLogLevel(res.statusCode);
        
        logger[logLevel as keyof typeof logger]('HTTP Response', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });

    next();
};
