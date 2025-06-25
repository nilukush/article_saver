// Production-specific security configurations
export const productionConfig = {
    // Security headers
    security: {
        // Content Security Policy
        csp: {
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
        // HSTS configuration
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },
        // Additional headers
        additionalHeaders: {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
        }
    },

    // CORS configuration
    cors: {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            const allowedOrigins = [
                'https://articlesaver.app', // Production frontend
                'https://www.articlesaver.app', // Production frontend with www
                ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [])
            ];

            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Request-Id', 'X-Response-Time'],
        maxAge: 86400 // 24 hours
    },

    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        // Production-specific exclusions
        skip: (req: any) => {
            const excludedPaths = [
                '/api/pocket/progress',
                '/api/pocket/sessions',
                '/health',
                '/api/health'
            ];
            return excludedPaths.some(path => req.path.startsWith(path));
        }
    },

    // Monitoring configuration
    monitoring: {
        // Request timeout
        requestTimeout: 30000, // 30 seconds
        // Keep alive timeout
        keepAliveTimeout: 65000, // 65 seconds
        // Headers timeout
        headersTimeout: 70000, // 70 seconds
        // Body size limits
        bodyLimit: '10mb',
        // Log level
        logLevel: 'info',
        // Performance monitoring
        apm: {
            enabled: process.env.APM_ENABLED === 'true',
            serviceName: 'article-saver-backend',
            environment: 'production'
        }
    },

    // Database configuration
    database: {
        // Connection pool settings
        pool: {
            min: 2,
            max: 10,
            acquireTimeout: 30000,
            idleTimeout: 10000,
            connectionTimeout: 30000
        },
        // Query timeout
        queryTimeout: 20000
    },

    // Session configuration
    session: {
        secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: true, // HTTPS only
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'strict'
        }
    }
};