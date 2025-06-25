import { Request, Response, NextFunction } from 'express';
import { metrics } from '../monitoring/alerts';
import logger from '../utils/logger';

// Response time tracking middleware
export const responseTimeTracking = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Store original end function
    const originalEnd = res.end;

    // Override end function
    res.end = function(...args: any[]) {
        // Calculate response time
        const duration = Date.now() - start;
        
        // Track metric
        metrics.trackResponseTime(duration, req.path);

        // Add response time header
        res.set('X-Response-Time', `${duration}ms`);

        // Log slow requests
        if (duration > 1000) {
            logger.warn('Slow request detected', {
                method: req.method,
                path: req.path,
                duration,
                statusCode: res.statusCode,
                userAgent: req.get('user-agent'),
                ip: req.ip
            });
        }

        // Call original end
        return originalEnd.apply(res, args);
    };

    next();
};

// Error tracking middleware
export const errorTracking = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Track error metric
    metrics.trackError(err, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode || 500,
        userAgent: req.get('user-agent'),
        ip: req.ip
    });

    // Pass to next error handler
    next(err);
};

// Metrics endpoint middleware
export const metricsEndpoint = (req: Request, res: Response) => {
    // Only allow in non-production or with auth
    if (process.env.NODE_ENV === 'production' && !req.headers['x-metrics-key']) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const summary = metrics.getMetricsSummary();
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        metrics: summary,
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
    });
};

// Health check with detailed metrics
export const detailedHealthCheck = async (req: Request, res: Response) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        metrics: metrics.getMetricsSummary(),
        checks: {
            memory: 'ok',
            responseTime: 'ok',
            errorRate: 'ok'
        }
    };

    // Check memory usage
    const memUsage = process.memoryUsage();
    const heapUsedPercent = memUsage.heapUsed / memUsage.heapTotal;
    if (heapUsedPercent > 0.95) {
        health.checks.memory = 'critical';
        health.status = 'degraded';
    } else if (heapUsedPercent > 0.8) {
        health.checks.memory = 'warning';
    }

    // Check average response time
    const avgResponseTime = health.metrics.responseTime.average;
    if (avgResponseTime > 3000) {
        health.checks.responseTime = 'critical';
        health.status = 'degraded';
    } else if (avgResponseTime > 1000) {
        health.checks.responseTime = 'warning';
    }

    // Check error rate
    const errorCount = health.metrics.errors.count;
    const errorRate = errorCount / health.metrics.errors.windowMinutes;
    if (errorRate > 10) {
        health.checks.errorRate = 'critical';
        health.status = 'degraded';
    } else if (errorRate > 5) {
        health.checks.errorRate = 'warning';
    }

    res.status(health.status === 'ok' ? 200 : 503).json(health);
};