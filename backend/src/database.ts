import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
export const prisma = new PrismaClient();

// Graceful shutdown handlers
process.on('SIGINT', async () => {
    console.log('Received SIGINT, disconnecting Prisma...');
    await prisma.$disconnect();
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, disconnecting Prisma...');
    await prisma.$disconnect();
});
