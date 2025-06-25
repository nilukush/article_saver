import logger from '../utils/logger';

// Alert thresholds and configurations
export const alertConfig = {
    // Response time alerts
    responseTime: {
        warning: 1000, // 1 second
        critical: 3000, // 3 seconds
    },
    // Error rate alerts
    errorRate: {
        warning: 0.05, // 5% error rate
        critical: 0.1, // 10% error rate
        windowSize: 300000, // 5 minutes
    },
    // Database connection alerts
    database: {
        connectionPoolWarning: 0.8, // 80% of pool used
        connectionPoolCritical: 0.95, // 95% of pool used
        queryTimeWarning: 5000, // 5 seconds
        queryTimeCritical: 10000, // 10 seconds
    },
    // Memory usage alerts
    memory: {
        heapWarning: 0.8, // 80% of heap used
        heapCritical: 0.95, // 95% of heap used
    },
    // Rate limiting alerts
    rateLimit: {
        threshold: 0.8, // Alert when 80% of users hit rate limit
    }
};

// Metrics tracking
class MetricsCollector {
    private errorCounts: Map<number, number> = new Map();
    private responseTimes: number[] = [];
    private dbQueryTimes: number[] = [];

    // Track response time
    trackResponseTime(duration: number, endpoint: string) {
        this.responseTimes.push(duration);
        
        // Keep only last 1000 entries
        if (this.responseTimes.length > 1000) {
            this.responseTimes.shift();
        }

        // Check for alerts
        if (duration > alertConfig.responseTime.critical) {
            logger.error('Critical response time alert', {
                duration,
                endpoint,
                threshold: alertConfig.responseTime.critical,
                alert: 'CRITICAL_RESPONSE_TIME'
            });
            this.sendAlert('critical', `Response time ${duration}ms exceeds critical threshold`, {
                endpoint,
                duration
            });
        } else if (duration > alertConfig.responseTime.warning) {
            logger.warn('Warning response time alert', {
                duration,
                endpoint,
                threshold: alertConfig.responseTime.warning,
                alert: 'WARNING_RESPONSE_TIME'
            });
        }
    }

    // Track errors
    trackError(error: Error, context: any) {
        // Skip tracking for OAuth bot scans (404 responses)
        if (context.statusCode === 404 && 
            (context.path?.includes('/auth/google/callback') || 
             context.path?.includes('/auth/github/callback'))) {
            logger.debug('Skipping error tracking for OAuth bot scan', context);
            return;
        }

        // Skip tracking for "Authorization code not provided" from bots
        if (error.message === 'Authorization code not provided' && 
            context.userAgent?.match(/bot|crawler|spider|scan|slurp|curl|wget|python|java|go-http-client/i)) {
            logger.debug('Skipping error tracking for bot OAuth attempt', context);
            return;
        }

        const now = Date.now();
        const windowStart = now - alertConfig.errorRate.windowSize;

        // Clean old entries
        for (const [timestamp] of this.errorCounts) {
            if (timestamp < windowStart) {
                this.errorCounts.delete(timestamp);
            }
        }

        // Add new error
        this.errorCounts.set(now, 1);

        // Calculate error rate
        const errorCount = this.errorCounts.size;
        const errorRate = errorCount / (alertConfig.errorRate.windowSize / 1000 / 60); // errors per minute

        if (errorRate > alertConfig.errorRate.critical) {
            logger.error('Critical error rate alert', {
                errorRate,
                errorCount,
                threshold: alertConfig.errorRate.critical,
                alert: 'CRITICAL_ERROR_RATE',
                context
            });
            this.sendAlert('critical', `Error rate ${errorRate.toFixed(2)}/min exceeds critical threshold`, {
                errorCount,
                recentError: error.message
            });
        }
    }

    // Track database query time
    trackDatabaseQuery(duration: number, query: string) {
        this.dbQueryTimes.push(duration);

        if (duration > alertConfig.database.queryTimeCritical) {
            logger.error('Critical database query time', {
                duration,
                query: query.substring(0, 100),
                threshold: alertConfig.database.queryTimeCritical,
                alert: 'CRITICAL_DB_QUERY_TIME'
            });
            this.sendAlert('critical', `Database query took ${duration}ms`, {
                query: query.substring(0, 100)
            });
        }
    }

    // Track memory usage
    trackMemoryUsage() {
        const memUsage = process.memoryUsage();
        const heapUsedPercent = memUsage.heapUsed / memUsage.heapTotal;

        if (heapUsedPercent > alertConfig.memory.heapCritical) {
            logger.error('Critical memory usage alert', {
                heapUsedPercent: (heapUsedPercent * 100).toFixed(2),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                alert: 'CRITICAL_MEMORY_USAGE'
            });
            this.sendAlert('critical', `Memory usage at ${(heapUsedPercent * 100).toFixed(2)}%`, {
                heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024)
            });
        }
    }

    // Send alert (integrate with Railway webhooks or external services)
    private sendAlert(severity: 'warning' | 'critical', message: string, details: any) {
        const alert = {
            severity,
            message,
            details,
            timestamp: new Date().toISOString(),
            service: 'article-saver-backend',
            environment: process.env.NODE_ENV
        };

        // Log the alert
        logger.error('MONITORING_ALERT', alert);

        // If webhook URL is configured, send alert
        if (process.env.ALERT_WEBHOOK_URL) {
            fetch(process.env.ALERT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🚨 ${severity.toUpperCase()}: ${message}`,
                    ...alert
                })
            }).catch(err => {
                logger.error('Failed to send alert webhook', err);
            });
        }
    }

    // Get metrics summary
    getMetricsSummary() {
        const avgResponseTime = this.responseTimes.length > 0
            ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
            : 0;

        const avgDbQueryTime = this.dbQueryTimes.length > 0
            ? this.dbQueryTimes.reduce((a, b) => a + b, 0) / this.dbQueryTimes.length
            : 0;

        const memUsage = process.memoryUsage();

        return {
            responseTime: {
                average: Math.round(avgResponseTime),
                samples: this.responseTimes.length
            },
            database: {
                averageQueryTime: Math.round(avgDbQueryTime),
                samples: this.dbQueryTimes.length
            },
            memory: {
                heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsedPercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)
            },
            errors: {
                count: this.errorCounts.size,
                windowMinutes: alertConfig.errorRate.windowSize / 1000 / 60
            }
        };
    }
}

// Export singleton instance
export const metrics = new MetricsCollector();

// Start periodic memory monitoring
if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
        metrics.trackMemoryUsage();
    }, 60000); // Check every minute
}