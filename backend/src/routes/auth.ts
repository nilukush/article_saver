import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../database';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { signJWT, handleOAuthLogin } from '../utils/authHelpers';
import { handleEnterpriseOAuthLogin } from '../utils/enterpriseAccountLinking';
import { oauthRateLimiter, oauthBotProtection, oauthSecurityHeaders } from '../middleware/oauthProtection';
import logger from '../utils/logger';

const router = Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const verifyJWT = (token: string): any => {
    return jwt.verify(token, JWT_SECRET);
};

// Register endpoint
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
    }

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        throw createError('User already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            provider: 'local'
        },
        select: {
            id: true,
            email: true,
            provider: true,
            createdAt: true
        }
    });

    // Generate JWT token
    const token = signJWT({ userId: user.id, email: user.email });

    res.status(201).json({
        message: 'User created successfully',
        user,
        token
    });
}));

// Login endpoint
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').exists().withMessage('Password is required')
], asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
    }

    const { email, password } = req.body;

    // Find user - check both direct email and metadata
    let user = await prisma.user.findUnique({
        where: { email }
    });

    // If not found, check for users with this email in metadata
    if (!user) {
        const usersWithEmailInMetadata = await prisma.user.findMany({
            where: {
                metadata: {
                    path: ['actualEmail'],
                    equals: email
                }
            }
        });

        // Find the one with 'local' provider or password set
        user = usersWithEmailInMetadata.find(u => 
            u.provider === 'local' || u.password !== ''
        ) || usersWithEmailInMetadata[0];
    }

    if (!user) {
        throw createError('Invalid credentials', 401);
    }

    // Check password
    logger.info('[AUTH] Password check:', {
        email,
        hasPassword: !!user.password,
        passwordLength: user.password?.length || 0,
        inputPasswordLength: password.length
    });
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    logger.info('[AUTH] Password validation result:', {
        isPasswordValid,
        userId: user.id
    });
    
    if (!isPasswordValid) {
        throw createError('Invalid credentials', 401);
    }

    // CRITICAL FIX: Properly resolve linked accounts for email/password login
    // This ensures users see articles from ALL their linked accounts
    
    // First, determine the primary user
    let primaryUserId = user.primaryAccountId || user.id;
    let primaryUser = user;
    
    if (user.primaryAccountId) {
        const primary = await prisma.user.findUnique({
            where: { id: user.primaryAccountId }
        });
        if (primary) {
            primaryUser = primary;
            primaryUserId = primary.id;
        }
    }
    
    // Find ALL linked accounts (both as primary and linked)
    const linkedAccounts = await prisma.linkedAccount.findMany({
        where: {
            AND: [
                {
                    OR: [
                        { primaryUserId: primaryUserId },
                        { linkedUserId: primaryUserId }
                    ]
                },
                { verified: true }
            ]
        },
        include: {
            primaryUser: true,
            linkedUser: true
        }
    });
    
    // Collect all user IDs
    const allUserIds = new Set<string>([primaryUserId]);
    linkedAccounts.forEach(link => {
        allUserIds.add(link.primaryUserId);
        allUserIds.add(link.linkedUserId);
    });
    
    // Use the actual email they logged in with (important for UX)
    const tokenEmail = email;
    
    // Generate JWT token with all linked user IDs
    const token = signJWT({ 
        userId: primaryUserId, 
        email: tokenEmail,
        linkedUserIds: Array.from(allUserIds) // Include all linked user IDs
    });
    
    logger.info('[AUTH] Email/password login successful with linked accounts:', {
        loginEmail: email,
        userId: user.id,
        primaryUserId,
        linkedUserIds: Array.from(allUserIds),
        linkedAccountCount: allUserIds.size,
        tokenEmail,
        provider: user.provider
    });

    res.json({
        message: 'Login successful',
        user: {
            id: primaryUserId,
            email: tokenEmail, // Use the resolved email
            createdAt: user.createdAt
        },
        token
    });
}));

// Verify token endpoint
router.get('/verify', asyncHandler(async (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        throw createError('No token provided', 401);
    }

    try {
        const decoded = verifyJWT(token);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                createdAt: true
            }
        });

        if (!user) {
            throw createError('User not found', 404);
        }

        res.json({
            valid: true,
            user
        });
    } catch (error) {
        throw createError('Invalid token', 401);
    }
}));

// Google OAuth URL endpoint
router.get('/google/url', asyncHandler(async (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const { port } = req.query;

    if (!clientId) {
        throw createError('Google OAuth not configured', 500);
    }

    if (!port) {
        throw createError('OAuth server port not provided', 400);
    }

    // Use environment-based redirect URI for Google OAuth
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3003/api/auth/google/callback';
    const scope = 'openid email profile';
    const responseType = 'code';
    const state = `${Math.random().toString(36).substring(2, 15)}_${port}`;

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=${responseType}&` +
        `state=${state}`;

    res.json({
        url: googleAuthUrl,
        state
    });
}));

// Google OAuth callback endpoint with bot protection
router.get('/google/callback', 
    oauthSecurityHeaders,
    oauthRateLimiter,
    oauthBotProtection,
    asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query;

    // Handle OAuth errors (user denied access, etc.)
    if (error) {
        logger.info('OAuth error response', { error, state });
        const electronPort = state ? (state as string).split('_')[1] : null;
        const redirectUrl = electronPort 
            ? `http://localhost:${electronPort}/auth/callback?error=${encodeURIComponent(error as string)}`
            : `/auth/error?error=${encodeURIComponent(error as string)}`;
        return res.redirect(redirectUrl);
    }

    // Validate required parameters
    if (!code || !state) {
        logger.info('OAuth callback missing parameters', { 
            hasCode: !!code, 
            hasState: !!state,
            userAgent: req.get('user-agent'),
            ip: req.ip 
        });
        // Don't throw error for bots/scanners, just return 404
        return res.status(404).send('Not Found');
    }

    // Validate state format
    if (typeof state !== 'string' || !state.includes('_')) {
        logger.warn('Invalid OAuth state format', { state });
        return res.status(404).send('Not Found');
    }

    // Extract Electron port from state parameter
    const electronPort = state ? String(state).split('_')[1] : null;

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            code: code as string,
            grant_type: 'authorization_code',
            redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3003/api/auth/google/callback',
        }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
        throw createError('Failed to get access token', 400);
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
        },
    });

    const userData = await userResponse.json();

    if (!userData.email) {
        throw createError('Failed to get user email', 400);
    }

    // Handle OAuth login with enterprise-grade account linking
    const result = await handleEnterpriseOAuthLogin({
        email: userData.email,
        provider: 'google',
        metadata: {
            emailVerified: userData.verified_email || true,
            googleId: userData.id
        }
    }, electronPort);

    // Redirect based on result
    res.redirect(result.redirectUrl);
}));

// GitHub OAuth URL endpoint
router.get('/github/url', asyncHandler(async (req: Request, res: Response) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const { port } = req.query;

    if (!clientId) {
        throw createError('GitHub OAuth not configured', 500);
    }

    if (!port) {
        throw createError('OAuth server port not provided', 400);
    }

    // Use the backend's callback URL instead of dynamic port
    const redirectUri = process.env.GITHUB_REDIRECT_URI || `http://localhost:3003/api/auth/github/callback`;
    const scope = 'user:email';
    // Include the Electron port in the state for later redirect
    const state = `electron_${port}_${Math.random().toString(36).substring(2, 15)}`;

    const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${state}`;

    res.json({
        url: githubAuthUrl,
        state
    });
}));

// GitHub OAuth callback endpoint with bot protection
router.get('/github/callback', 
    oauthSecurityHeaders,
    oauthRateLimiter,
    oauthBotProtection,
    asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query;

    // Handle OAuth errors (user denied access, etc.)
    if (error) {
        logger.info('GitHub OAuth error response', { error, state });
        const stateStr = state as string;
        const electronPort = stateStr && stateStr.startsWith('electron_') 
            ? stateStr.split('_')[1] 
            : null;
        const redirectUrl = electronPort 
            ? `http://localhost:${electronPort}/auth/callback?error=${encodeURIComponent(error as string)}`
            : `/auth/error?error=${encodeURIComponent(error as string)}`;
        return res.redirect(redirectUrl);
    }

    // Validate required parameters
    if (!code || !state) {
        logger.info('GitHub OAuth callback missing parameters', { 
            hasCode: !!code, 
            hasState: !!state,
            userAgent: req.get('user-agent'),
            ip: req.ip 
        });
        // Don't throw error for bots/scanners, just return 404
        return res.status(404).send('Not Found');
    }

    // Validate state format for GitHub
    if (typeof state !== 'string' || !state.startsWith('electron_')) {
        logger.warn('Invalid GitHub OAuth state format', { state });
        return res.status(404).send('Not Found');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID!,
            client_secret: process.env.GITHUB_CLIENT_SECRET!,
            code: code as string,
        }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
        throw createError('Failed to get access token', 400);
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'Article-Saver-App',
        },
    });

    const userData = await userResponse.json();

    // Get user email (might be private)
    const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'Article-Saver-App',
        },
    });

    const emailData = await emailResponse.json();
    const primaryEmail = emailData.find((email: any) => email.primary)?.email || userData.email;

    if (!primaryEmail) {
        throw createError('Failed to get user email', 400);
    }

    // Extract Electron port from state parameter
    const stateStr = String(state);
    const electronPort = stateStr && stateStr.startsWith('electron_') 
        ? stateStr.split('_')[1] 
        : null;

    // Handle OAuth login with enterprise-grade account linking
    const result = await handleEnterpriseOAuthLogin({
        email: primaryEmail,
        provider: 'github',
        metadata: {
            emailVerified: emailData.find((email: any) => email.primary)?.verified || false,
            githubId: userData.id,
            githubLogin: userData.login
        }
    }, electronPort);

    logger.info('GitHub OAuth GET callback - redirecting', {
        resultType: result.type,
        hasLinkingData: !!result.linkingData,
        redirectUrl: result.redirectUrl,
        electronPort,
        redirectUrlParsed: new URL(result.redirectUrl)
    });
    
    // CRITICAL DEBUG: Log the exact redirect parameters
    const redirectUrlObj = new URL(result.redirectUrl);
    logger.info('CRITICAL: OAuth redirect parameters', {
        baseUrl: redirectUrlObj.origin + redirectUrlObj.pathname,
        queryParams: Object.fromEntries(redirectUrlObj.searchParams.entries()),
        hasAction: redirectUrlObj.searchParams.has('action'),
        actionValue: redirectUrlObj.searchParams.get('action'),
        hasToken: redirectUrlObj.searchParams.has('token'),
        hasLinkingToken: redirectUrlObj.searchParams.has('linkingToken')
    });

    // Redirect based on result
    res.redirect(result.redirectUrl);
}));

// Google OAuth callback for Electron (POST endpoint)
router.post('/google/callback', asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code) {
        throw createError('Authorization code not provided', 400);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: 'article-saver://auth/callback/google',
        }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
        throw createError('Failed to get access token', 400);
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
        },
    });

    const userData = await userResponse.json();

    if (!userData.email) {
        throw createError('Failed to get user email', 400);
    }

    // Handle OAuth login with enterprise-grade account linking
    const result = await handleEnterpriseOAuthLogin({
        email: userData.email,
        provider: 'google',
        metadata: {
            emailVerified: userData.verified_email || true,
            googleId: userData.id
        }
    }, null);

    if (result.type === 'requires_linking' || result.type === 'requires_verification') {
        res.json({
            message: 'Account linking required',
            action: 'link_account',
            existingProvider: result.linkingData?.existingProvider,
            linkingProvider: result.linkingData?.newProvider,
            linkingToken: result.linkingData?.linkingToken,
            trustLevel: result.linkingData?.trustLevel,
            requiresVerification: result.linkingData?.verificationRequired
        });
    } else {
        res.json({
            message: 'Google login successful',
            user: result.user ? {
                id: result.user.id,
                email: result.user.email,
                createdAt: result.user.createdAt
            } : undefined,
            token: result.token
        });
    }
}));

// Create separate OAuth account
router.post('/oauth/create-separate', asyncHandler(async (req: Request, res: Response) => {
    const { email, provider, linkingToken } = req.body;
    
    if (!email || !provider || !linkingToken) {
        throw createError('Email, provider, and linking token are required', 400);
    }
    
    try {
        // Verify the linking token to ensure this is a legitimate request
        const decoded = jwt.verify(linkingToken, JWT_SECRET) as any;
        
        if (decoded.action !== 'link_account' || decoded.email !== email) {
            throw createError('Invalid linking token', 400);
        }
        
        // Create new user with the OAuth provider
        const newUser = await prisma.user.create({
            data: {
                email: `${email}_${provider}`, // Use a modified email to avoid unique constraint
                password: '', // OAuth users don't have passwords
                provider
            }
        });
        
        // Generate JWT token for the new user
        const token = jwt.sign({ userId: newUser.id, email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            message: 'Separate account created successfully',
            user: {
                id: newUser.id,
                email,
                provider,
                createdAt: newUser.createdAt
            },
            token
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw createError('Invalid linking token', 400);
        }
        throw error;
    }
}));

// GitHub OAuth callback for Electron (POST endpoint)
router.post('/github/callback', asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code) {
        throw createError('Authorization code not provided', 400);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID!,
            client_secret: process.env.GITHUB_CLIENT_SECRET!,
            code: code,
        }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
        throw createError('Failed to get access token', 400);
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'Article-Saver-App',
        },
    });

    const userData = await userResponse.json();

    // Get user email (might be private)
    const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'Article-Saver-App',
        },
    });

    const emailData = await emailResponse.json();
    const primaryEmail = emailData.find((email: any) => email.primary)?.email || userData.email;

    if (!primaryEmail) {
        throw createError('Failed to get user email', 400);
    }

    // Handle OAuth login with enterprise-grade account linking
    logger.info('ENTERPRISE AUTH: Processing GitHub POST callback', {
        email: primaryEmail,
        provider: 'github',
        githubId: userData.id,
        githubLogin: userData.login
    });

    const result = await handleEnterpriseOAuthLogin({
        email: primaryEmail,
        provider: 'github',
        metadata: {
            emailVerified: emailData.find((email: any) => email.primary)?.verified || false,
            githubId: userData.id,
            githubLogin: userData.login
        }
    }, null);

    logger.info('ENTERPRISE AUTH: GitHub POST callback result', {
        type: result.type,
        hasLinkingData: !!result.linkingData,
        hasUser: !!result.user,
        hasToken: !!result.token
    });

    if (result.type === 'requires_linking' || result.type === 'requires_verification') {
        logger.info('ENTERPRISE AUTH: GitHub requires account linking', {
            existingProvider: result.linkingData?.existingProvider,
            linkingProvider: result.linkingData?.newProvider,
            requiresVerification: result.linkingData?.verificationRequired,
            trustLevel: result.linkingData?.trustLevel
        });

        res.json({
            message: 'Account linking required',
            action: 'link_account',
            provider: 'github',
            existingProvider: result.linkingData?.existingProvider,
            linkingProvider: result.linkingData?.newProvider,
            linkingToken: result.linkingData?.linkingToken,
            email: primaryEmail,
            token: result.token,
            trustLevel: result.linkingData?.trustLevel,
            requiresVerification: result.linkingData?.verificationRequired
        });
    } else {
        logger.info('ENTERPRISE AUTH: GitHub login successful without linking', {
            userId: result.user?.id,
            email: primaryEmail
        });

        res.json({
            message: 'GitHub login successful',
            user: result.user ? {
                id: result.user.id,
                email: result.user.email,
                createdAt: result.user.createdAt
            } : undefined,
            token: result.token
        });
    }
}));

export default router;
