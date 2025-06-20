import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { prisma } from './database';
import logger from './utils/logger';

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

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
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
});

export default app;
