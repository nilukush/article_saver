import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    // Log request
    logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        timestamp
    });

    // Log response when it finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Response', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            timestamp
        });
    });

    next();
};
