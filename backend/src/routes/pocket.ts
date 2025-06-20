import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../database';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';
import { importStateManager } from '../services/ImportStateManager';
import { backgroundJobProcessor } from '../services/BackgroundJobProcessor';
import { contentExtractionService } from '../services/ContentExtractionService';

const router = Router();

// Check if user has valid Pocket authorization
router.get('/auth/status', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    
    try {
        // Check if user has a Pocket token stored
        const oauthToken = await prisma.oAuthToken.findUnique({
            where: {
                userId_provider: {
                    userId,
                    provider: 'pocket'
                }
            }
        });

        if (!oauthToken) {
            return res.json({
                success: true,
                authorized: false,
                message: 'No Pocket authorization found'
            });
        }

        // Check if token is expired
        if (oauthToken.expiresAt && oauthToken.expiresAt < new Date()) {
            // Delete expired token
            await prisma.oAuthToken.delete({
                where: { id: oauthToken.id }
            });
            
            return res.json({
                success: true,
                authorized: false,
                message: 'Pocket authorization has expired'
            });
        }

        // Token exists and is valid
        const metadata = oauthToken.metadata as { username?: string } | null;
        return res.json({
            success: true,
            authorized: true,
            username: metadata?.username || null,
            lastSynced: oauthToken.updatedAt
        });
    } catch (error) {
        logger.error('Error checking Pocket auth status:', error);
        throw createError('Failed to check authorization status', 500);
    }
}));

// Revoke Pocket authorization
router.delete('/auth/revoke', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    
    try {
        const result = await prisma.oAuthToken.deleteMany({
            where: {
                userId,
                provider: 'pocket'
            }
        });

        return res.json({
            success: true,
            message: 'Pocket authorization revoked',
            deleted: result.count
        });
    } catch (error) {
        logger.error('Error revoking Pocket auth:', error);
        throw createError('Failed to revoke authorization', 500);
    }
}));

// Temporary storage for request tokens (in production, use Redis or database)
const requestTokenStore = new Map<string, { token: string, userId: string, timestamp: number }>();

// Import progress tracking
interface ImportProgress {
    userId: string;
    status: 'running' | 'completed' | 'failed';
    currentPage: number;
    totalPages: number;
    currentOffset: number;
    articlesProcessed: number;
    totalArticles: number;
    currentAction: string;
    startTime: Date;
    estimatedTimeRemaining: number;
    imported: number;
    skipped: number;
    failed: number;
}

const importProgressStore = new Map<string, ImportProgress>();

// Clean up expired tokens (older than 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestTokenStore.entries()) {
        if (now - value.timestamp > 10 * 60 * 1000) { // 10 minutes
            requestTokenStore.delete(key);
        }
    }

    // Clean up completed imports older than 1 hour
    for (const [userId, progress] of importProgressStore.entries()) {
        if (progress.status !== 'running' && now - progress.startTime.getTime() > 60 * 60 * 1000) {
            importProgressStore.delete(userId);
        }
    }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Store current user's request token for callback
let currentRequestToken: { token: string, userId: string, timestamp: number } | null = null;

// Pocket OAuth URL endpoint
router.get('/auth/url', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const consumerKey = process.env.POCKET_CONSUMER_KEY;
    const port = req.query.port as string;

    // Always use backend callback for Pocket OAuth
    // Pocket doesn't support dynamic redirect URIs like Google/GitHub
    const redirectUri = process.env.POCKET_REDIRECT_URI || 'http://localhost:3003/api/pocket/callback';

    if (!consumerKey || consumerKey === 'your-pocket-consumer-key-here') {
        throw createError('Pocket integration is not configured. Please add valid POCKET_CONSUMER_KEY to environment variables.', 503);
    }

    // Step 1: Obtain a request token
    const requestTokenResponse = await fetch('https://getpocket.com/v3/oauth/request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Accept': 'application/json',
        },
        body: JSON.stringify({
            consumer_key: consumerKey,
            redirect_uri: redirectUri,
        }),
    });

    if (!requestTokenResponse.ok) {
        throw createError(`Pocket API error: ${requestTokenResponse.status} ${requestTokenResponse.statusText}`, 400);
    }

    const contentType = requestTokenResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
        throw createError('Pocket API returned invalid response. Check your consumer key configuration.', 400);
    }

    const requestTokenData = await requestTokenResponse.json();

    if (!requestTokenData.code) {
        throw createError('Failed to get Pocket request token', 400);
    }

    // Step 2: Store request token temporarily (single user approach)
    const userId = (req as any).user.userId;
    currentRequestToken = {
        token: requestTokenData.code,
        userId: userId,
        timestamp: Date.now()
    };

    // Step 3: Redirect user to Pocket to authorize
    const pocketAuthUrl = `https://getpocket.com/auth/authorize?request_token=${requestTokenData.code}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    res.json({
        url: pocketAuthUrl,
        requestToken: requestTokenData.code
    });
}));

// Pocket OAuth callback endpoint
router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
    logger.info('🔍 POCKET CALLBACK: Received callback request');
    logger.info('🔍 POCKET CALLBACK: currentRequestToken =', currentRequestToken);

    // Pocket callback contains no parameters - just the redirect
    if (!currentRequestToken) {
        logger.error('❌ POCKET CALLBACK: No active OAuth session found');
        throw createError('No active OAuth session found', 400);
    }

    // Check if token is expired (10 minutes)
    if (Date.now() - currentRequestToken.timestamp > 10 * 60 * 1000) {
        logger.error('❌ POCKET CALLBACK: OAuth session expired');
        currentRequestToken = null;
        throw createError('OAuth session expired', 400);
    }

    const request_token = currentRequestToken.token;
    logger.info('🔍 POCKET CALLBACK: Using request token:', request_token);

    const userRequestToken = currentRequestToken; // Store reference before cleanup
    // Clean up the stored token
    currentRequestToken = null;

    const consumerKey = process.env.POCKET_CONSUMER_KEY;

    if (!consumerKey || consumerKey === 'your-pocket-consumer-key-here') {
        logger.error('❌ POCKET CALLBACK: Consumer key not configured');
        throw createError('Pocket integration is not configured. Please add valid POCKET_CONSUMER_KEY to environment variables.', 503);
    }

    logger.info('🔍 POCKET CALLBACK: Making token exchange request to Pocket API');

    // Step 3: Convert a request token into a Pocket access token
    const accessTokenResponse = await fetch('https://getpocket.com/v3/oauth/authorize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Accept': 'application/json',
        },
        body: JSON.stringify({
            consumer_key: consumerKey,
            code: request_token,
        }),
    });

    logger.info('🔍 POCKET CALLBACK: Token exchange response status:', accessTokenResponse.status);

    if (!accessTokenResponse.ok) {
        const errorText = await accessTokenResponse.text();
        logger.error('❌ POCKET CALLBACK: Token exchange failed:', errorText);
        throw createError(`Pocket API error: ${accessTokenResponse.status} ${accessTokenResponse.statusText}`, 400);
    }

    const contentType = accessTokenResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
        logger.error('❌ POCKET CALLBACK: Invalid response content type:', contentType);
        throw createError('Pocket API returned invalid response. Check your consumer key configuration.', 400);
    }

    const accessTokenData = await accessTokenResponse.json();
    logger.info('🔍 POCKET CALLBACK: Token exchange response:', accessTokenData);

    if (!accessTokenData.access_token) {
        logger.error('❌ POCKET CALLBACK: No access token in response');
        throw createError('Failed to get Pocket access token', 400);
    }

    // Store the OAuth token in database
    if (userRequestToken) {
        const userId = userRequestToken.userId;
        try {
            await prisma.oAuthToken.upsert({
                where: {
                    userId_provider: {
                        userId,
                        provider: 'pocket'
                    }
                },
                update: {
                    accessToken: accessTokenData.access_token,
                    metadata: {
                        username: accessTokenData.username || null
                    },
                    updatedAt: new Date()
                },
                create: {
                    userId,
                    provider: 'pocket',
                    accessToken: accessTokenData.access_token,
                    tokenType: 'bearer',
                    metadata: {
                        username: accessTokenData.username || null
                    }
                }
            });
            logger.info('✅ POCKET CALLBACK: Stored OAuth token in database for user:', userId);
        } catch (error) {
            logger.error('❌ POCKET CALLBACK: Failed to store OAuth token:', error);
            // Continue with redirect even if storage fails
        }
    } else {
        logger.warn('⚠️ POCKET CALLBACK: No user context available for token storage');
    }

    logger.info('✅ POCKET CALLBACK: Successfully got access token, showing success page');

    // Show a success page instead of redirecting to the app
    // The desktop app will detect the authorization through polling
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pocket Authorization Successful</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #1a1a1a;
                    color: #ffffff;
                }
                .container {
                    text-align: center;
                    padding: 2rem;
                    background-color: #2a2a2a;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                }
                h1 {
                    color: #4CAF50;
                    margin-bottom: 1rem;
                }
                p {
                    color: #cccccc;
                    margin-bottom: 1.5rem;
                }
                .close-btn {
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                }
                .close-btn:hover {
                    background-color: #45a049;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✅ Pocket Authorization Successful!</h1>
                <p>You have successfully authorized Article Saver to access your Pocket account.</p>
                <p>You can now close this window and return to the Article Saver app.</p>
                <button class="close-btn" onclick="closeWindow()">Close Window</button>
                <p style="font-size: 14px; margin-top: 20px; color: #999;">
                    Window will close automatically in <span id="countdown">5</span> seconds
                </p>
            </div>
            <script>
                let countdown = 5;
                const countdownEl = document.getElementById('countdown');
                
                function closeWindow() {
                    // Try multiple aggressive methods to close the window
                    
                    // Method 1: Standard window.close()
                    try {
                        window.close();
                    } catch (e) {
                        console.log('Standard close failed:', e);
                    }
                    
                    // Method 2: Replace current page and close
                    try {
                        window.open('', '_self');
                        window.close();
                    } catch (e) {
                        console.log('Replace and close failed:', e);
                    }
                    
                    // Method 3: Try to close parent/opener
                    try {
                        if (window.opener) {
                            window.opener = null;
                            window.close();
                        }
                    } catch (e) {
                        console.log('Opener close failed:', e);
                    }
                    
                    // Method 4: Set location to about:blank then close
                    try {
                        window.location.href = 'about:blank';
                        setTimeout(() => window.close(), 100);
                    } catch (e) {
                        console.log('About blank close failed:', e);
                    }
                    
                    // Method 5: Use history.back() if available
                    try {
                        if (window.history.length > 1) {
                            window.history.back();
                        }
                    } catch (e) {
                        console.log('History back failed:', e);
                    }
                    
                    // Method 6: Open empty window and focus it (to replace current)
                    try {
                        const newWindow = window.open('about:blank', '_blank');
                        if (newWindow) {
                            newWindow.focus();
                            window.close();
                        }
                    } catch (e) {
                        console.log('New window replacement failed:', e);
                    }
                    
                    // If all methods fail, show the fallback message after a short delay
                    setTimeout(() => {
                        const container = document.querySelector('.container');
                        if (container && container.innerHTML.includes('Pocket Authorization Successful')) {
                            container.innerHTML = 
                                '<h1 style="color: #4CAF50;">✅ Authorization Complete!</h1>' +
                                '<p>Please close this browser window manually and return to the Article Saver app.</p>' +
                                '<p style="font-size: 14px; color: #999; margin-top: 20px;">You can now import your Pocket articles.</p>';
                        }
                    }, 1000);
                }
                
                // Countdown timer
                const timer = setInterval(() => {
                    countdown--;
                    if (countdownEl) countdownEl.textContent = countdown;
                    if (countdown <= 0) {
                        clearInterval(timer);
                        closeWindow();
                    }
                }, 1000);
                
                // Also try to close when page loads (immediate attempt)
                setTimeout(() => {
                    // First immediate attempt
                    try {
                        window.close();
                    } catch (e) {
                        console.log('Immediate close failed, will wait for countdown');
                    }
                }, 500);
                
                // Listen for various events that might allow closing
                window.addEventListener('beforeunload', (e) => {
                    // Don't prevent unload
                    return undefined;
                });
                
                window.addEventListener('unload', () => {
                    try {
                        window.close();
                    } catch (e) {
                        // Silent fail
                    }
                });
                
                // Keyboard shortcut to close (Ctrl+W or Cmd+W)
                document.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                        e.preventDefault();
                        closeWindow();
                    }
                    // Also try Escape key
                    if (e.key === 'Escape') {
                        closeWindow();
                    }
                });
            </script>
        </body>
        </html>
    `);
}));

// Get import progress endpoint
router.get('/progress', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const progress = importProgressStore.get(userId);

    if (!progress) {
        return res.json({
            status: 'not_found',
            message: 'No active import found'
        });
    }

    return res.json({
        status: progress.status,
        currentPage: progress.currentPage,
        totalPages: progress.totalPages,
        currentOffset: progress.currentOffset,
        articlesProcessed: progress.articlesProcessed,
        totalArticles: progress.totalArticles,
        currentAction: progress.currentAction,
        startTime: progress.startTime,
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
        imported: progress.imported,
        skipped: progress.skipped,
        failed: progress.failed,
        percentage: progress.totalArticles > 0 ? Math.round((progress.articlesProcessed / progress.totalArticles) * 100) : 0
    });
}));

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to check rate limit headers
const checkRateLimit = (response: globalThis.Response) => {
    const userRemaining = response.headers.get('X-Limit-User-Remaining');
    const keyRemaining = response.headers.get('X-Limit-Key-Remaining');
    const userReset = response.headers.get('X-Limit-User-Reset');
    const keyReset = response.headers.get('X-Limit-Key-Reset');

    logger.info('🔍 POCKET RATE LIMIT:', {
        userRemaining,
        keyRemaining,
        userReset,
        keyReset
    });

    // If we're getting low on requests, add extra delay
    if (userRemaining && parseInt(userRemaining) < 10) {
        logger.warn('⚠️ POCKET RATE LIMIT: User limit getting low, adding extra delay');
        return 5000; // 5 second delay
    }

    return 2000; // Default 2 second delay
};

// Enterprise import with background processing
router.post('/import/enterprise', [
    body('accessToken').optional(),  // Make optional since we can use stored token
    body('batchSize').optional().isInt({ min: 10, max: 200 }).withMessage('Batch size must be between 10 and 200'),
    body('includeArchived').optional().isBoolean().withMessage('Include archived must be a boolean')
], authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
    }

    let { accessToken, batchSize = 100, includeArchived = true } = req.body;
    const userId = (req as any).user.userId;
    const consumerKey = process.env.POCKET_CONSUMER_KEY;
    
    // If no access token provided, try to get from database
    if (!accessToken) {
        const storedToken = await prisma.oAuthToken.findUnique({
            where: {
                userId_provider: {
                    userId,
                    provider: 'pocket'
                }
            }
        });
        
        if (!storedToken) {
            throw createError('No Pocket access token provided and no stored authorization found', 400);
        }
        
        // Check if token is expired
        if (storedToken.expiresAt && storedToken.expiresAt < new Date()) {
            throw createError('Stored Pocket authorization has expired. Please re-authorize.', 401);
        }
        
        accessToken = storedToken.accessToken;
        logger.info('✅ Using stored Pocket OAuth token');
    } else {
        // Store the new token for future use
        try {
            await prisma.oAuthToken.upsert({
                where: {
                    userId_provider: {
                        userId,
                        provider: 'pocket'
                    }
                },
                update: {
                    accessToken,
                    updatedAt: new Date()
                },
                create: {
                    userId,
                    provider: 'pocket',
                    accessToken,
                    tokenType: 'bearer',
                    metadata: {}
                }
            });
            logger.info('✅ Updated stored Pocket OAuth token');
        } catch (error) {
            logger.error('Failed to store OAuth token:', error);
        }
    }

    if (!consumerKey || consumerKey === 'your-pocket-consumer-key-here') {
        throw createError('Pocket integration is not configured. Please add valid POCKET_CONSUMER_KEY to environment variables.', 503);
    }

    logger.info('🚀 ENTERPRISE IMPORT: Starting background import', { userId, batchSize, includeArchived });

    try {
        // Create import session
        const sessionId = await importStateManager.createSession(userId, 'pocket', {
            accessToken: accessToken.substring(0, 10) + '...', // Don't log full token
            consumerKey: consumerKey.substring(0, 10) + '...', // Don't log full key
            settings: { batchSize, includeArchived }
        });

        // Queue background job
        await backgroundJobProcessor.queueImportJob(sessionId, userId, 'pocket', {
            accessToken,
            consumerKey,
            batchSize,
            includeArchived
        });

        res.json({
            success: true,
            sessionId,
            message: 'Enterprise import started in background',
            pollUrl: `/api/pocket/progress/${sessionId}`
        });

    } catch (error) {
        logger.error('❌ ENTERPRISE IMPORT: Failed to start import', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw createError('Failed to start import', 500);
    }
}));

// Start import using stored Pocket authorization
router.post('/import/stored', [
    body('batchSize').optional().isInt({ min: 10, max: 200 }).withMessage('Batch size must be between 10 and 200'),
    body('includeArchived').optional().isBoolean().withMessage('Include archived must be a boolean')
], authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
    }

    const { batchSize = 100, includeArchived = true } = req.body;
    const userId = (req as any).user.userId;
    const consumerKey = process.env.POCKET_CONSUMER_KEY;

    if (!consumerKey || consumerKey === 'your-pocket-consumer-key-here') {
        throw createError('Pocket integration is not configured. Please add valid POCKET_CONSUMER_KEY to environment variables.', 503);
    }

    // Get stored token
    const storedToken = await prisma.oAuthToken.findUnique({
        where: {
            userId_provider: {
                userId,
                provider: 'pocket'
            }
        }
    });
    
    if (!storedToken) {
        throw createError('No Pocket authorization found. Please authorize Pocket first.', 401);
    }
    
    // Check if token is expired
    if (storedToken.expiresAt && storedToken.expiresAt < new Date()) {
        // Delete expired token
        await prisma.oAuthToken.delete({
            where: { id: storedToken.id }
        });
        throw createError('Pocket authorization has expired. Please re-authorize.', 401);
    }

    const accessToken = storedToken.accessToken;
    logger.info('🚀 STORED TOKEN IMPORT: Starting background import', { userId, batchSize, includeArchived });

    try {
        // Create import session
        const sessionId = await importStateManager.createSession(userId, 'pocket', {
            consumerKey: consumerKey.substring(0, 10) + '...', // Don't log full key
            settings: { batchSize, includeArchived },
            usingStoredToken: true
        });

        // Queue background job
        await backgroundJobProcessor.queueImportJob(sessionId, userId, 'pocket', {
            accessToken,
            consumerKey,
            batchSize,
            includeArchived
        });

        res.json({
            success: true,
            sessionId,
            message: 'Import started successfully using stored authorization',
            checkProgressAt: `/api/pocket/progress/${sessionId}`
        });
        return;

    } catch (error) {
        logger.error('❌ STORED TOKEN IMPORT: Failed to start import', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw createError('Failed to start import', 500);
    }
}));

// Get enterprise import progress
router.get('/progress/:sessionId', authenticateToken, asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const userId = (req as any).user.userId;

    try {
        const session = await importStateManager.getSession(sessionId);
        
        if (!session) {
            res.status(404).json({
                error: 'Import session not found'
            });
            return;
        }

        // Verify session belongs to user
        if (session.userId !== userId) {
            res.status(403).json({
                error: 'Access denied'
            });
            return;
        }

        // Get job status from background processor
        const jobStatus = backgroundJobProcessor.getJobStatus(sessionId);

        // Calculate percentage if not already present
        const progressData = {
            ...session.progress,
            percentage: session.progress.totalArticles > 0 
                ? Math.round((session.progress.articlesProcessed / session.progress.totalArticles) * 100)
                : 0
        };

        res.json({
            success: true,
            session: {
                id: session.id,
                status: session.status,
                progress: progressData,
                metadata: {
                    startTime: session.metadata.startTime,
                    endTime: session.metadata.endTime,
                    estimatedTimeRemaining: session.metadata.estimatedTimeRemaining,
                    errorMessage: session.metadata.errorMessage
                },
                jobStatus
            }
        });
        return;

    } catch (error) {
        logger.error('❌ ENTERPRISE IMPORT: Failed to get progress', {
            sessionId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw createError('Failed to get import progress', 500);
    }
}));

// Cancel enterprise import
router.delete('/import/:sessionId/cancel', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = (req as any).user.userId;

    try {
        const session = await importStateManager.getSession(sessionId);
        
        if (!session || session.userId !== userId) {
            res.status(404).json({
                error: 'Import session not found'
            });
            return;
        }

        // Try to cancel the job
        const cancelled = backgroundJobProcessor.cancelJob(sessionId);
        
        if (cancelled) {
            await importStateManager.completeSession(sessionId, 'failed', 'Import cancelled by user');
        }

        res.json({
            success: cancelled,
            message: cancelled ? 'Import cancelled successfully' : 'Import could not be cancelled (may be running)'
        });
        return;

    } catch (error) {
        logger.error('❌ ENTERPRISE IMPORT: Failed to cancel import', {
            sessionId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw createError('Failed to cancel import', 500);
    }
}));

// Enterprise session discovery endpoint - Find running imports for user
router.get('/sessions/discover', authenticateToken, asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;

    try {
        logger.info('🔍 SESSION DISCOVERY: Looking for active sessions', { userId });

        // Find all active sessions for this user
        const activeSessions = await prisma.importSession.findMany({
            where: {
                userId,
                status: {
                    in: ['pending', 'running']
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5 // Limit to 5 most recent active sessions
        });

        logger.info('📊 SESSION DISCOVERY: Found sessions', { 
            userId, 
            sessionCount: activeSessions.length,
            sessionIds: activeSessions.map(s => s.id)
        });

        const sessionDetails = activeSessions.map(session => {
            const progress = session.progress as any;
            const metadata = session.metadata as any;
            const jobStatus = backgroundJobProcessor.getJobStatus(session.id);

            return {
                id: session.id,
                source: session.source,
                status: session.status,
                jobStatus,
                progress: {
                    currentPage: progress?.currentPage || 0,
                    totalPages: progress?.totalPages || 0,
                    articlesProcessed: progress?.articlesProcessed || 0,
                    totalArticles: progress?.totalArticles || 0,
                    imported: progress?.imported || 0,
                    skipped: progress?.skipped || 0,
                    failed: progress?.failed || 0,
                    currentAction: progress?.currentAction || 'Processing...',
                    percentage: progress?.totalArticles > 0 
                        ? Math.round((progress?.articlesProcessed / progress?.totalArticles) * 100) 
                        : 0
                },
                metadata: {
                    startTime: metadata?.startTime,
                    estimatedTimeRemaining: metadata?.estimatedTimeRemaining || 0
                },
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            };
        });

        res.json({
            success: true,
            activeSessions: sessionDetails,
            message: `Found ${activeSessions.length} active import session(s)`
        });

    } catch (error) {
        logger.error('❌ SESSION DISCOVERY: Failed to discover sessions', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw createError('Failed to discover active sessions', 500);
    }
}));

// Legacy import (kept for backwards compatibility)
router.post('/import', [
    body('accessToken').optional()  // Make optional since we can use stored token
], authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
    }

    let { accessToken } = req.body;
    const userId = (req as any).user.userId;
    const consumerKey = process.env.POCKET_CONSUMER_KEY;
    
    // If no access token provided, try to get from database
    if (!accessToken) {
        const storedToken = await prisma.oAuthToken.findUnique({
            where: {
                userId_provider: {
                    userId,
                    provider: 'pocket'
                }
            }
        });
        
        if (!storedToken) {
            throw createError('No Pocket access token provided and no stored authorization found', 400);
        }
        
        // Check if token is expired
        if (storedToken.expiresAt && storedToken.expiresAt < new Date()) {
            throw createError('Stored Pocket authorization has expired. Please re-authorize.', 401);
        }
        
        accessToken = storedToken.accessToken;
        logger.info('✅ Using stored Pocket OAuth token');
    }

    if (!consumerKey || consumerKey === 'your-pocket-consumer-key-here') {
        throw createError('Pocket integration is not configured. Please add valid POCKET_CONSUMER_KEY to environment variables.', 503);
    }

    logger.info('🔍 POCKET IMPORT: Starting rate-limited import for user:', userId);
    
    // Store the OAuth token for future use
    try {
        await prisma.oAuthToken.upsert({
            where: {
                userId_provider: {
                    userId,
                    provider: 'pocket'
                }
            },
            update: {
                accessToken,
                updatedAt: new Date()
            },
            create: {
                userId,
                provider: 'pocket',
                accessToken,
                tokenType: 'bearer',
                metadata: {}
            }
        });
        logger.info('✅ Stored Pocket OAuth token for future use');
    } catch (error) {
        logger.error('Failed to store OAuth token:', error);
        // Continue with import even if token storage fails
    }

    // Initialize progress tracking
    const progress: ImportProgress = {
        userId,
        status: 'running',
        currentPage: 1,
        totalPages: 0, // Will be estimated as we go
        currentOffset: 0,
        articlesProcessed: 0,
        totalArticles: 0, // Will be updated as we discover articles
        currentAction: 'Starting Pocket import...',
        startTime: new Date(),
        estimatedTimeRemaining: 0,
        imported: 0,
        skipped: 0,
        failed: 0
    };

    importProgressStore.set(userId, progress);

    // Pocket API has a 30 item per request limit and rate limits
    const POCKET_PAGE_SIZE = 30;
    const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
    const MAX_RETRIES = 3;

    let allArticles: any = {};
    let offset = 0;
    let hasMoreResults = true;
    let totalFetched = 0;
    let pageNumber = 1;

    logger.info('🔍 POCKET IMPORT: Starting rate-limited paginated fetch from Pocket API...');

    // Fetch all articles using pagination with rate limiting
    while (hasMoreResults) {
        // Update progress
        const currentProgress = importProgressStore.get(userId);
        if (currentProgress) {
            currentProgress.currentPage = pageNumber;
            currentProgress.currentOffset = offset;
            currentProgress.currentAction = `Fetching page ${pageNumber} from Pocket API...`;
            currentProgress.totalArticles = totalFetched; // Update as we discover more
            importProgressStore.set(userId, currentProgress);
        }

        logger.info(`🔍 POCKET IMPORT: Fetching page ${pageNumber} at offset ${offset}...`);

        let retryCount = 0;
        let pageSuccess = false;
        let pocketData: any = null;

        // Retry logic for rate limiting
        while (!pageSuccess && retryCount < MAX_RETRIES) {
            try {
                // Update progress with waiting status
                const currentProgress = importProgressStore.get(userId);
                if (currentProgress && pageNumber > 1) {
                    currentProgress.currentAction = `Waiting ${RATE_LIMIT_DELAY / 1000}s for rate limit compliance...`;
                    importProgressStore.set(userId, currentProgress);
                }

                // Add delay before each request to respect rate limits
                if (pageNumber > 1) {
                    logger.info(`🔍 POCKET IMPORT: Waiting ${RATE_LIMIT_DELAY}ms to respect rate limits...`);
                    await delay(RATE_LIMIT_DELAY);
                }

                const retrieveResponse = await fetch('https://getpocket.com/v3/get', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8',
                        'X-Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        consumer_key: consumerKey,
                        access_token: accessToken,
                        detailType: 'complete',
                        state: 'all',
                        sort: 'newest',
                        count: POCKET_PAGE_SIZE,
                        offset: offset
                    }),
                });

                // Check for rate limiting or server errors
                if (retrieveResponse.status === 429 || retrieveResponse.status === 502 || retrieveResponse.status === 503) {
                    retryCount++;
                    const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                    logger.warn(`⚠️ POCKET IMPORT: Rate limited or server error (${retrieveResponse.status}), retry ${retryCount}/${MAX_RETRIES} in ${backoffDelay}ms`);

                    if (retryCount < MAX_RETRIES) {
                        await delay(backoffDelay);
                        continue;
                    } else {
                        throw createError(`Pocket API rate limited after ${MAX_RETRIES} retries`, 429);
                    }
                }

                if (!retrieveResponse.ok) {
                    const errorText = await retrieveResponse.text();
                    logger.error('❌ POCKET IMPORT: API Error Response:', errorText);
                    throw createError(`Pocket API error: ${retrieveResponse.status} ${retrieveResponse.statusText}`, 400);
                }

                const contentType = retrieveResponse.headers.get('content-type');
                if (!contentType?.includes('application/json')) {
                    throw createError('Pocket API returned invalid response. Check your access token.', 400);
                }

                pocketData = await retrieveResponse.json();

                if (pocketData.status !== 1) {
                    logger.error('❌ POCKET IMPORT: Invalid Pocket response status:', pocketData);
                    throw createError('Failed to retrieve articles from Pocket', 400);
                }

                // Check rate limit headers and adjust delay
                const nextDelay = checkRateLimit(retrieveResponse);
                if (nextDelay > RATE_LIMIT_DELAY) {
                    logger.info(`🔍 POCKET IMPORT: Adjusting delay to ${nextDelay}ms based on rate limit headers`);
                }

                pageSuccess = true;

            } catch (error) {
                retryCount++;
                if (retryCount >= MAX_RETRIES) {
                    throw error;
                }

                const backoffDelay = Math.pow(2, retryCount) * 1000;
                logger.warn(`⚠️ POCKET IMPORT: Error on page ${pageNumber}, retry ${retryCount}/${MAX_RETRIES} in ${backoffDelay}ms:`, error);
                await delay(backoffDelay);
            }
        }

        const pageArticles = pocketData.list || {};
        const pageCount = Object.keys(pageArticles).length;

        logger.info(`🔍 POCKET IMPORT: Page ${pageNumber} fetched - ${pageCount} articles`);

        // Check if we have any articles on this page
        if (pageCount === 0) {
            hasMoreResults = false;
            logger.info('🔍 POCKET IMPORT: No more articles found, ending pagination');
            break;
        }

        // Merge articles from this page
        allArticles = { ...allArticles, ...pageArticles };
        totalFetched += pageCount;

        // Check if we have fewer articles than requested (end of data)
        if (pageCount < POCKET_PAGE_SIZE) {
            hasMoreResults = false;
            logger.info('🔍 POCKET IMPORT: Received fewer articles than requested, reached end of data');
        } else {
            offset += POCKET_PAGE_SIZE;
            pageNumber++;
            logger.info(`🔍 POCKET IMPORT: More results available, continuing with offset ${offset}`);
        }

        // Safety check to prevent infinite loops - allow much larger imports
        if (pageNumber > 500) { // Max 15,000 articles (500 pages * 30 articles)
            logger.warn('🔍 POCKET IMPORT: Safety limit reached (500 pages), stopping pagination');
            hasMoreResults = false;
        }
    }

    const articleEntries = Object.entries(allArticles);
    const totalToProcess = articleEntries.length;

    logger.info(`🔍 POCKET IMPORT: Pagination complete! Retrieved ${totalToProcess} articles from Pocket API`);

    // Update progress with final article count
    const currentProgress = importProgressStore.get(userId);
    if (currentProgress) {
        currentProgress.totalArticles = totalToProcess;
        currentProgress.currentAction = 'Processing articles and saving to database...';
        importProgressStore.set(userId, currentProgress);
    }

    const importedArticles = [];
    const skippedArticles = [];
    const failedArticles = [];

    // Process articles in batches for better performance
    const BATCH_SIZE = 50;
    let processed = 0;

    for (let i = 0; i < articleEntries.length; i += BATCH_SIZE) {
        const batch = articleEntries.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(articleEntries.length / BATCH_SIZE);

        // Update progress
        const currentProgress = importProgressStore.get(userId);
        if (currentProgress) {
            currentProgress.articlesProcessed = processed;
            currentProgress.currentAction = `Processing batch ${batchNumber}/${totalBatches} (${processed}/${totalToProcess} articles)...`;
            const elapsedTime = Date.now() - currentProgress.startTime.getTime();
            const avgTimePerArticle = processed > 0 ? elapsedTime / processed : 0;
            const remainingArticles = totalToProcess - processed;
            currentProgress.estimatedTimeRemaining = avgTimePerArticle * remainingArticles;
            importProgressStore.set(userId, currentProgress);
        }

        logger.info(`🔍 POCKET IMPORT: Processing batch ${batchNumber}/${totalBatches}`);

        const batchPromises = batch.map(async ([itemId, item]) => {
            try {
                const pocketItem = item as any;

                // Skip items without URLs
                if (!pocketItem.resolved_url && !pocketItem.given_url) {
                    return { type: 'skipped', reason: 'No URL' };
                }

                // Skip items without a valid URL
                const itemUrl = pocketItem.resolved_url || pocketItem.given_url;
                if (!itemUrl) {
                    logger.warn('⚠️ POCKET IMPORT: Skipping item without URL', {
                        item_id: pocketItem.item_id,
                        resolved_url: pocketItem.resolved_url,
                        given_url: pocketItem.given_url
                    });
                    return { type: 'skipped', reason: 'No URL found' };
                }

                const articleData = {
                    userId,
                    url: itemUrl,
                    title: pocketItem.resolved_title || pocketItem.given_title || 'Untitled',
                    content: null, // Don't set content to excerpt - let ContentExtractionService handle it
                    excerpt: pocketItem.excerpt || '',
                    author: pocketItem.authors ? (Object.values(pocketItem.authors)[0] as any)?.name : undefined,
                    publishedDate: pocketItem.time_added ? new Date(parseInt(pocketItem.time_added) * 1000) : undefined,
                    savedAt: pocketItem.time_added ? new Date(parseInt(pocketItem.time_added) * 1000) : new Date(),
                    tags: pocketItem.tags ? Object.keys(pocketItem.tags) : [],
                    isRead: pocketItem.status === '1',
                    isArchived: pocketItem.status === '1',
                    contentExtracted: false, // Explicitly mark as needing extraction
                    extractionStatus: 'pending' // Set status for extraction service
                };

                // Check if article already exists
                const existingArticle = await prisma.article.findFirst({
                    where: {
                        userId,
                        url: articleData.url
                    }
                });

                if (existingArticle) {
                    return { type: 'skipped', reason: 'Already exists', url: articleData.url };
                }

                const newArticle = await prisma.article.create({
                    data: articleData
                });

                return { type: 'imported', article: newArticle };
            } catch (error) {
                logger.error('Error importing article:', error);
                return { type: 'failed', error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        const batchResults = await Promise.all(batchPromises);

        // Categorize results with proper null checking
        batchResults.forEach(result => {
            if (!result) {
                logger.error('❌ POCKET IMPORT: Received undefined result in batch processing');
                failedArticles.push({ type: 'failed', error: 'Undefined result from batch processing' });
                return;
            }

            if (result.type === 'imported' && result.article) {
                importedArticles.push(result.article);
            } else if (result.type === 'skipped') {
                skippedArticles.push(result);
            } else if (result.type === 'failed') {
                failedArticles.push(result);
            } else {
                logger.error('❌ POCKET IMPORT: Unknown result type:', result);
                failedArticles.push({ type: 'failed', error: 'Unknown result type' });
            }
        });

        processed += batch.length;
        logger.info(`🔍 POCKET IMPORT: Processed ${processed}/${totalToProcess} articles`);
    }

    logger.info('✅ POCKET IMPORT: Import completed!');
    logger.info(`   - Imported: ${importedArticles.length}`);
    logger.info(`   - Skipped: ${skippedArticles.length}`);
    logger.info(`   - Failed: ${failedArticles.length}`);

    // Update final progress status
    const finalProgress = importProgressStore.get(userId);
    if (finalProgress) {
        finalProgress.status = 'completed';
        finalProgress.articlesProcessed = totalToProcess;
        finalProgress.imported = importedArticles.length;
        finalProgress.skipped = skippedArticles.length;
        finalProgress.failed = failedArticles.length;
        finalProgress.currentAction = `Import completed! Added ${importedArticles.length} new articles.`;
        finalProgress.estimatedTimeRemaining = 0;
        importProgressStore.set(userId, finalProgress);
    }
    
    // Start automatic content extraction for imported articles
    if (importedArticles.length > 0) {
        logger.info('🔄 POCKET IMPORT: Starting automatic content extraction for imported articles');
        contentExtractionService.startAutomaticExtraction(userId).catch(err => {
            logger.error('❌ POCKET IMPORT: Failed to start content extraction', { error: err });
        });
    }

    res.json({
        success: true,
        message: 'Articles imported successfully from Pocket',
        imported: importedArticles.length,
        skipped: skippedArticles.length,
        failed: failedArticles.length,
        total: totalToProcess,
        summary: {
            imported: importedArticles.length,
            skipped: skippedArticles.length,
            failed: failedArticles.length,
            total: totalToProcess
        }
    });
}));

// Enterprise job statistics
router.get('/jobs/stats', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const stats = backgroundJobProcessor.getStats();
    
    res.json({
        success: true,
        stats,
        message: 'Background job statistics'
    });
}));

// Cancel active import session
router.post('/sessions/cancel', authenticateToken, asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;
    
    logger.info('🛑 CANCEL IMPORT: Request received', { userId });
    
    try {
        // Find active sessions
        const activeSessions = await prisma.importSession.findMany({
            where: {
                userId,
                status: 'running',
                source: 'pocket'
            }
        });
        
        if (activeSessions.length === 0) {
            res.json({
                success: true,
                message: 'No active import sessions to cancel'
            });
            return;
        }
        
        // Cancel all active sessions
        const cancelPromises = activeSessions.map(async (session) => {
            return prisma.importSession.update({
                where: { id: session.id },
                data: {
                    status: 'cancelled',
                    progress: {
                        ...(session.progress as any || {}),
                        currentAction: 'Import cancelled by user'
                    }
                }
            });
        });
        
        await Promise.all(cancelPromises);
        
        logger.info('🛑 CANCEL IMPORT: Sessions cancelled', { 
            userId,
            sessionCount: activeSessions.length,
            sessionIds: activeSessions.map(s => s.id)
        });
        
        res.json({
            success: true,
            message: `Cancelled ${activeSessions.length} active import session(s)`,
            cancelledSessions: activeSessions.map(s => s.id)
        });
        
    } catch (error) {
        logger.error('❌ CANCEL IMPORT: Failed', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw createError('Failed to cancel import sessions', 500);
    }
}));

export default router;
