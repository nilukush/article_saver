import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { prisma } from './database';
import logger from './utils/logger';
import { configureBigIntSerialization, serializeBigInt } from './utils/bigIntSerializer';

// Import routes
import authRoutes from './routes/auth';
import articlesRoutes from './routes/articles';
import syncRoutes from './routes/sync';
import pocketRoutes from './routes/pocket';
import accountLinkingRoutes from './routes/accountLinking';
import accountMigrationRoutes from './routes/account-migration';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Load environment variables
dotenv.config();

// Configure BigInt serialization
configureBigIntSerialization();

// Debug environment variables
console.log('=== ENVIRONMENT DEBUG ===');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  const hostMatch = url.match(/@(.+?):/);
  console.log('DATABASE_URL host:', hostMatch?.[1]);
  console.log('Is using pooler:', url.includes('pooler.supabase.com'));
}
console.log('=== END DEBUG ===');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment
app.set('trust proxy', true);

// Security middleware with enterprise configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:19858',
        'http://localhost', // Add this for Electron protocol interception
        ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [])
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting with JSON responses
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too Many Requests',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: 15 * 60 // 15 minutes in seconds
        });
    },
    skip: (req) => {
        // Skip rate limiting for progress endpoints and SSE connections
        return req.path === '/api/pocket/progress' || 
               req.path.startsWith('/api/pocket/progress/') ||
               req.path.startsWith('/api/pocket/sessions/');
    }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check endpoints
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Railway expects health check at /api/health
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        service: 'article-saver-backend'
    });
});

// Database health check endpoint
app.get('/api/debug/database-health', async (req, res) => {
    const healthCheck = {
        database: {
            connected: false,
            readable: false,
            writable: false,
            error: null as string | null,
            details: {} as any
        },
        timestamp: new Date().toISOString()
    };

    try {
        // Test 1: Basic connectivity
        await prisma.$queryRaw`SELECT 1`;
        healthCheck.database.connected = true;

        // Test 2: Read operation
        const userCount = await prisma.user.count();
        healthCheck.database.readable = true;
        healthCheck.database.details.userCount = Number(userCount);

        // Test 3: Check tables exist
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            LIMIT 5
        `;
        healthCheck.database.details.tables = tables;

        // Test 4: Connection pool stats
        const poolStats = await prisma.$queryRaw`
            SELECT count(*) as connection_count 
            FROM pg_stat_activity 
            WHERE datname = current_database()
        ` as any[];
        // Convert BigInt to number for JSON serialization
        healthCheck.database.details.activeConnections = poolStats.map((row: any) => ({
            connection_count: Number(row.connection_count)
        }));

        // Mark as fully healthy
        healthCheck.database.writable = true; // We'll assume writable if readable
        
    } catch (error: any) {
        healthCheck.database.error = error.message;
        logger.error('Database health check failed:', error);
    }

    res.json(serializeBigInt(healthCheck));
});

// Debug endpoint to check OAuth configuration
app.get('/api/debug/oauth-config', (req, res) => {
    // Get all env var names that might be OAuth related
    const envVarNames = Object.keys(process.env);
    const oauthRelatedVars = envVarNames.filter(name => 
        name.includes('GOOGLE') || 
        name.includes('GITHUB') || 
        name.includes('POCKET') || 
        name.includes('CLIENT') ||
        name.includes('SECRET') ||
        name.includes('OAUTH') ||
        name.includes('AUTH')
    );
    
    res.json({
        googleOAuth: {
            hasClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            redirectUri: process.env.GOOGLE_REDIRECT_URI || 'not set'
        },
        githubOAuth: {
            hasClientId: !!process.env.GITHUB_CLIENT_ID,
            hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
            redirectUri: process.env.GITHUB_REDIRECT_URI || 'not set'
        },
        pocketOAuth: {
            hasConsumerKey: !!process.env.POCKET_CONSUMER_KEY,
            redirectUri: process.env.POCKET_REDIRECT_URI || 'not set'
        },
        environment: process.env.NODE_ENV,
        totalEnvVars: Object.keys(process.env).length,
        oauthRelatedVarNames: oauthRelatedVars,
        // Check for common Railway vars
        hasDatabase: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        port: process.env.PORT
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/pocket', pocketRoutes);
app.use('/api/account-linking', accountLinkingRoutes);
app.use('/api/account-migration', accountMigrationRoutes);


// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);


// Start server
app.listen(PORT, () => {
    logger.info(`🚀 Article Saver API server running on port ${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Debug: Check OAuth configuration
    logger.info(`🔐 OAuth Configuration Check:`, {
        googleConfigured: !!process.env.GOOGLE_CLIENT_ID,
        githubConfigured: !!process.env.GITHUB_CLIENT_ID,
        pocketConfigured: !!process.env.POCKET_CONSUMER_KEY,
        googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'not set',
        githubRedirectUri: process.env.GITHUB_REDIRECT_URI || 'not set',
        totalEnvVars: Object.keys(process.env).length
    });
});

export default app;
