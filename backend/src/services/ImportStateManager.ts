import { prisma } from '../database';
import logger from '../utils/logger';

// Enterprise-grade import state management
export interface ImportSession {
    id: string;
    userId: string;
    source: 'pocket' | 'manual';
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: {
        currentPage: number;
        totalPages: number;
        articlesProcessed: number;
        totalArticles: number;
        imported: number;
        skipped: number;
        failed: number;
        currentAction: string;
    };
    metadata: {
        accessToken?: string;
        requestToken?: string;
        startTime: Date;
        endTime?: Date;
        estimatedTimeRemaining: number;
        errorMessage?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Enterprise-grade import state management with database persistence
 * Replaces in-memory storage for production scalability
 */
export class ImportStateManager {
    
    /**
     * Create a new import session
     */
    async createSession(userId: string, source: 'pocket' | 'manual', metadata: any): Promise<string> {
        try {
            // Clean up any existing sessions for this user and source
            await this.cleanupUserSessions(userId, source);
            
            const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const session: ImportSession = {
                id: sessionId,
                userId,
                source,
                status: 'pending',
                progress: {
                    currentPage: 0,
                    totalPages: 0,
                    articlesProcessed: 0,
                    totalArticles: 0,
                    imported: 0,
                    skipped: 0,
                    failed: 0,
                    currentAction: 'Initializing import...'
                },
                metadata: {
                    ...metadata,
                    startTime: new Date(),
                    estimatedTimeRemaining: 0
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Store in database for persistence using Prisma
            await prisma.importSession.create({
                data: {
                    id: sessionId,
                    userId,
                    source,
                    status: session.status,
                    progress: session.progress,
                    metadata: session.metadata,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt
                }
            });
            
            logger.info('🔄 IMPORT SESSION: Created new session', { sessionId, userId, source });
            
            return sessionId;
        } catch (error) {
            logger.error('❌ IMPORT SESSION: Failed to create session', { userId, source, error });
            throw error;
        }
    }
    
    /**
     * Update session progress with correlation tracking
     */
    async updateProgress(sessionId: string, progress: Partial<ImportSession['progress']>): Promise<void> {
        try {
            const correlationId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Update database record
            logger.info('🔄 IMPORT SESSION: Updating progress', { 
                sessionId, 
                correlationId,
                progress,
                timestamp: new Date().toISOString()
            });
            
            // Get current session to merge progress
            const currentSession = await prisma.importSession.findUnique({
                where: { id: sessionId }
            });
            
            if (!currentSession) {
                logger.error('❌ IMPORT SESSION: Session not found during progress update', { 
                    sessionId, 
                    correlationId 
                });
                throw new Error(`Session ${sessionId} not found`);
            }
            
            // Validate session is still active
            if (currentSession.status === 'completed' || currentSession.status === 'failed') {
                logger.warn('⚠️ IMPORT SESSION: Attempting to update completed/failed session', { 
                    sessionId, 
                    correlationId,
                    currentStatus: currentSession.status 
                });
                return; // Don't update completed sessions
            }
            
            const currentProgress = currentSession.progress as any;
            const updatedProgress = { 
                ...currentProgress, 
                ...progress,
                lastUpdateTime: new Date().toISOString(),
                correlationId
            };
            
            // Add validation for progress data
            if (updatedProgress.totalArticles < 0 || updatedProgress.articlesProcessed < 0) {
                logger.error('❌ IMPORT SESSION: Invalid progress values', { 
                    sessionId, 
                    correlationId,
                    updatedProgress 
                });
                throw new Error('Invalid progress values: cannot be negative');
            }
            
            // Log the full updated progress for debugging
            logger.info('🔄 IMPORT SESSION: Full updated progress', { 
                sessionId, 
                correlationId,
                updatedProgress,
                currentTotal: updatedProgress.totalArticles,
                currentProcessed: updatedProgress.articlesProcessed,
                percentage: updatedProgress.totalArticles > 0 
                    ? Math.round((updatedProgress.articlesProcessed / updatedProgress.totalArticles) * 100) 
                    : 0
            });
            
            // Use Prisma's update with proper JSON handling
            const updateResult = await prisma.importSession.update({
                where: { id: sessionId },
                data: { 
                    progress: updatedProgress,
                    updatedAt: new Date()
                }
            });
            
            logger.info('✅ IMPORT SESSION: Progress updated successfully', { 
                sessionId, 
                correlationId,
                progressData: updatedProgress,
                dbUpdatedAt: updateResult.updatedAt
            });
            
        } catch (error) {
            logger.error('❌ IMPORT SESSION: Failed to update progress', { 
                sessionId, 
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    
    /**
     * Get session status
     */
    async getSession(sessionId: string): Promise<ImportSession | null> {
        try {
            // Retrieve from database
            logger.info('🔍 IMPORT SESSION: Retrieving session', { sessionId });
            
            const session = await prisma.importSession.findUnique({
                where: { id: sessionId }
            });
            
            if (!session) {
                logger.warn('⚠️ IMPORT SESSION: Session not found', { sessionId });
                return null;
            }
            
            logger.info('📊 IMPORT SESSION: Retrieved session', { 
                sessionId,
                status: session.status,
                progress: session.progress
            });
            
            return {
                id: session.id,
                userId: session.userId,
                source: session.source as 'pocket' | 'manual',
                status: session.status as 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
                progress: session.progress as any,
                metadata: session.metadata as any,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            } as ImportSession;
        } catch (error) {
            logger.error('❌ IMPORT SESSION: Failed to get session', { sessionId, error });
            throw error;
        }
    }
    
    /**
     * Complete session
     */
    async completeSession(sessionId: string, status: 'completed' | 'failed', errorMessage?: string): Promise<void> {
        try {
            logger.info('✅ IMPORT SESSION: Completing session', { sessionId, status });
            
            // Get current session to merge metadata
            const currentSession = await prisma.importSession.findUnique({
                where: { id: sessionId }
            });
            
            if (!currentSession) {
                throw new Error('Session not found');
            }
            
            const currentMetadata = currentSession.metadata as any;
            const updatedMetadata = {
                ...currentMetadata,
                endTime: new Date(),
                ...(errorMessage && { errorMessage })
            };
            
            await prisma.importSession.update({
                where: { id: sessionId },
                data: {
                    status,
                    metadata: updatedMetadata
                }
            });
            
        } catch (error) {
            logger.error('❌ IMPORT SESSION: Failed to complete session', { sessionId, error });
            throw error;
        }
    }
    
    /**
     * Check session health and detect stale sessions
     */
    async checkSessionHealth(sessionId: string): Promise<{ isHealthy: boolean; reason?: string }> {
        try {
            const session = await prisma.importSession.findUnique({
                where: { id: sessionId }
            });
            
            if (!session) {
                return { isHealthy: false, reason: 'Session not found' };
            }
            
            const now = new Date();
            const sessionAge = now.getTime() - session.createdAt.getTime();
            const lastUpdate = session.updatedAt.getTime();
            const timeSinceUpdate = now.getTime() - lastUpdate;
            
            // Session is considered stale if:
            // 1. No updates in 5 minutes for running sessions
            // 2. Session is older than 24 hours
            // 3. Session is pending for more than 5 minutes
            
            if (session.status === 'running' && timeSinceUpdate > 5 * 60 * 1000) {
                return { isHealthy: false, reason: 'No updates in 5 minutes' };
            }
            
            if (sessionAge > 24 * 60 * 60 * 1000) {
                return { isHealthy: false, reason: 'Session older than 24 hours' };
            }
            
            if (session.status === 'pending' && sessionAge > 5 * 60 * 1000) {
                return { isHealthy: false, reason: 'Pending session older than 5 minutes' };
            }
            
            return { isHealthy: true };
            
        } catch (error) {
            logger.error('❌ IMPORT SESSION: Failed to check session health', { sessionId, error });
            return { isHealthy: false, reason: 'Health check failed' };
        }
    }
    
    /**
     * Clean up old and stale sessions
     */
    async cleanupUserSessions(userId: string, source?: string): Promise<void> {
        try {
            logger.info('🧹 IMPORT SESSION: Cleaning up old sessions', { userId, source });
            
            // First, check for stale sessions and mark them as failed
            const staleSessions = await prisma.importSession.findMany({
                where: {
                    userId,
                    ...(source && { source }),
                    status: { in: ['pending', 'running'] }
                }
            });
            
            for (const session of staleSessions) {
                const healthCheck = await this.checkSessionHealth(session.id);
                if (!healthCheck.isHealthy) {
                    logger.info('🧹 IMPORT SESSION: Marking stale session as failed', { 
                        sessionId: session.id, 
                        reason: healthCheck.reason 
                    });
                    
                    await this.completeSession(session.id, 'failed', `Session became stale: ${healthCheck.reason}`);
                }
            }
            
            // Then clean up old completed/failed sessions (older than 1 hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            await prisma.importSession.deleteMany({
                where: {
                    userId,
                    ...(source && { source }),
                    status: { in: ['completed', 'failed', 'cancelled'] },
                    updatedAt: { lt: oneHourAgo }
                }
            });
            
        } catch (error) {
            logger.error('❌ IMPORT SESSION: Failed to cleanup sessions', { userId, error });
            throw error;
        }
    }
}

export const importStateManager = new ImportStateManager();