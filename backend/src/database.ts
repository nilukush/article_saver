import { PrismaClient } from '@prisma/client';

// Enterprise-grade Prisma client with global instance management
// Prevents multiple instances in development hot reloads
const globalForPrisma = globalThis as unknown as { 
    prisma: PrismaClient | undefined 
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
    console.log('Received SIGINT, disconnecting Prisma...');
    await prisma.$disconnect();
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, disconnecting Prisma...');
    await prisma.$disconnect();
});
