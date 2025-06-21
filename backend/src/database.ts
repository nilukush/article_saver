import { PrismaClient, Prisma } from '@prisma/client';
import logger from './utils/logger';

// Enterprise-grade Prisma client with global instance management
// Prevents multiple instances in development hot reloads
const globalForPrisma = globalThis as unknown as { 
    prisma: PrismaClient | undefined 
};

// Enterprise-grade Prisma logging configuration with proper typing
const getPrismaLogConfig = (): Prisma.LogLevel[] => {
    const env = process.env.NODE_ENV;
    const logLevel = process.env.LOG_LEVEL?.toLowerCase();
    
    // Explicit LOG_LEVEL override
    if (logLevel === 'debug') return ['query', 'info', 'warn', 'error'];
    if (logLevel === 'info') return ['info', 'warn', 'error'];
    if (logLevel === 'warn') return ['warn', 'error'];
    if (logLevel === 'error') return ['error'];
    
    // Environment-based defaults
    switch (env) {
        case 'production':
            return ['error']; // Production: Only log errors
        case 'staging': 
            return ['warn', 'error']; // Staging: Warnings and errors
        case 'development':
        default:
            return ['error']; // Development: Reduced logging for cleaner output
    }
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: getPrismaLogConfig(),
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, disconnecting Prisma...');
    await prisma.$disconnect();
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, disconnecting Prisma...');
    await prisma.$disconnect();
});
