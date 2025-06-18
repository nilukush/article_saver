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
     * Update session progress
     */
    async updateProgress(sessionId: string, progress: Partial<ImportSession['progress']>): Promise<void> {
        try {
            // Update database record
            logger.debug('🔄 IMPORT SESSION: Updating progress', { sessionId, progress });
            
            // Get current session to merge progress
            const currentSession = await prisma.importSession.findUnique({
                where: { id: sessionId }
            });
            
            if (!currentSession) {
                throw new Error('Session not found');
            }
            
            const currentProgress = currentSession.progress as any;
            const updatedProgress = { ...currentProgress, ...progress };
            
            await prisma.importSession.update({
                where: { id: sessionId },
                data: {
                    progress: updatedProgress
                }
            });
            
        } catch (error) {
            logger.error('❌ IMPORT SESSION: Failed to update progress', { sessionId, error });
            throw error;
        }
    }
    
    /**
     * Get session status
     */
    async getSession(sessionId: string): Promise<ImportSession | null> {
        try {
            // Retrieve from database
            logger.debug('🔍 IMPORT SESSION: Retrieving session', { sessionId });
            
            const session = await prisma.importSession.findUnique({
                where: { id: sessionId }
            });
            
            if (!session) {
                return null;
            }
            
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
     * Clean up old sessions
     */
    async cleanupUserSessions(userId: string, source?: string): Promise<void> {
        try {
            logger.info('🧹 IMPORT SESSION: Cleaning up old sessions', { userId, source });
            
            const where: any = { userId };
            if (source) {
                where.source = source;
            }
            
            await prisma.importSession.deleteMany({
                where
            });
            
        } catch (error) {
            logger.error('❌ IMPORT SESSION: Failed to cleanup sessions', { userId, error });
            throw error;
        }
    }
}

export const importStateManager = new ImportStateManager();