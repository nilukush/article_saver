import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

// Enterprise-grade Winston logger configuration with environment-specific levels
const getLogLevel = (): string => {
    // Explicit LOG_LEVEL takes precedence for fine-grained control
    if (process.env.LOG_LEVEL) {
        return process.env.LOG_LEVEL.toLowerCase();
    }
    
    // Environment-based defaults following enterprise best practices
    switch (process.env.NODE_ENV) {
        case 'production':
            return 'warn';  // Production: Only warnings and errors
        case 'staging':
            return 'info';  // Staging: Include important business events
        case 'development':
        default:
            return 'debug'; // Development: Full verbose logging
    }
};

const logger = winston.createLogger({
    level: getLogLevel(),
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'article-saver-backend' },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Debug log file
        new winston.transports.File({
            filename: path.join(logsDir, 'debug.log'),
            level: 'debug',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        // Console output with colors
        new winston.transports.Console({
            level: 'debug',
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                    return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
                })
            )
        })
    ]
});

// Create logs directory
import fs from 'fs';
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

export default logger;
