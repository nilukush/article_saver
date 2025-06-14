import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../database';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signJWT = (payload: object): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

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
            password: hashedPassword
        },
        select: {
            id: true,
            email: true,
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

    // Find or create user
    let user = await prisma.user.findUnique({
        where: { email: userData.email }
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: userData.email,
                password: '', // OAuth users don't have passwords
            }
        });
    }

    // Generate JWT token
    const token = signJWT({ userId: user.id, email: user.email });

    // Redirect to Electron OAuth server if port available, otherwise fallback to frontend
    if (electronPort) {
        res.redirect(`http://localhost:${electronPort}/auth/callback/google?code=${code}&token=${token}&email=${encodeURIComponent(user.email)}`);
    } else {
        res.redirect(`http://localhost:19858?token=${token}&email=${encodeURIComponent(user.email)}`);
    }
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

    const redirectUri = `http://localhost:${port}/auth/callback/github`;
    const scope = 'user:email';
    const state = Math.random().toString(36).substring(2, 15);

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

    // Find or create user
    let user = await prisma.user.findUnique({
        where: { email: primaryEmail }
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: primaryEmail,
                password: '', // OAuth users don't have passwords
            }
        });
    }

    // Generate JWT token
    const token = signJWT({ userId: user.id, email: user.email });

    // Redirect to frontend with token
    res.redirect(`http://localhost:19858?token=${token}&email=${encodeURIComponent(user.email)}`);
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

    // Find or create user
    let user = await prisma.user.findUnique({
        where: { email: userData.email }
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: userData.email,
                password: '', // OAuth users don't have passwords
            }
        });
    }

    // Generate JWT token
    const token = signJWT({ userId: user.id, email: user.email });

    res.json({
        message: 'Google login successful',
        user: {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt
        },
        token
    });
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

    // Find or create user
    let user = await prisma.user.findUnique({
        where: { email: primaryEmail }
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: primaryEmail,
                password: '', // OAuth users don't have passwords
            }
        });
    }

    // Generate JWT token
    const token = signJWT({ userId: user.id, email: user.email });

    res.json({
        message: 'GitHub login successful',
        user: {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt
        },
        token
    });
}));

export default router;
