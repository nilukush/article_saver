import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../database';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { signJWT, handleOAuthLogin } from '../utils/authHelpers';

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

    // Find user
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        throw createError('Invalid credentials', 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw createError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = signJWT({ userId: user.id, email: user.email });

    res.json({
        message: 'Login successful',
        user: {
            id: user.id,
            email: user.email,
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

    // Use fixed backend redirect URI that matches Google OAuth config
    const redirectUri = 'http://localhost:3003/api/auth/google/callback';
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

// Google OAuth callback endpoint
router.get('/google/callback', asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code) {
        throw createError('Authorization code not provided', 400);
    }

    // Extract Electron port from state parameter
    const electronPort = state ? (state as string).split('_')[1] : null;

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
            redirect_uri: 'http://localhost:3003/api/auth/google/callback',
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

    // Handle OAuth login with account linking support
    const result = await handleOAuthLogin({
        email: userData.email,
        provider: 'google'
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
    const redirectUri = `http://localhost:3003/api/auth/github/callback`;
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

// GitHub OAuth callback endpoint
router.get('/github/callback', asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;

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
    const stateStr = state as string;
    const electronPort = stateStr && stateStr.startsWith('electron_') 
        ? stateStr.split('_')[1] 
        : null;

    // Handle OAuth login with account linking support
    const result = await handleOAuthLogin({
        email: primaryEmail,
        provider: 'github'
    }, electronPort);

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

    // Handle OAuth login with account linking support
    const result = await handleOAuthLogin({
        email: userData.email,
        provider: 'google'
    }, null);

    if (result.type === 'link_account') {
        res.json({
            message: 'Account linking required',
            action: 'link_account',
            existingProvider: result.existingProvider,
            linkingProvider: result.linkingProvider,
            linkingToken: result.linkingToken
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

    // Handle OAuth login with account linking support
    const result = await handleOAuthLogin({
        email: primaryEmail,
        provider: 'github'
    }, null);

    if (result.type === 'link_account') {
        res.json({
            message: 'Account linking required',
            action: 'link_account',
            existingProvider: result.existingProvider,
            linkingProvider: result.linkingProvider,
            linkingToken: result.linkingToken
        });
    } else {
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
