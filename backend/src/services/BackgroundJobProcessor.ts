import { bulkArticleProcessor } from './BulkArticleProcessor';
import { importStateManager } from './ImportStateManager';
import logger from '../utils/logger';

interface ImportJob {
    sessionId: string;
    userId: string;
    source: 'pocket' | 'manual';
    data: any;
}

/**
 * Enterprise-grade background job processing for imports
 * Handles long-running import operations asynchronously
 */
export class BackgroundJobProcessor {
    private static instance: BackgroundJobProcessor;
    private jobQueue: Map<string, ImportJob> = new Map();
    private activeJobs: Set<string> = new Set();
    private readonly MAX_CONCURRENT_JOBS = 3;
    
    static getInstance(): BackgroundJobProcessor {
        if (!BackgroundJobProcessor.instance) {
            BackgroundJobProcessor.instance = new BackgroundJobProcessor();
        }
        return BackgroundJobProcessor.instance;
    }
    
    /**
     * Queue an import job for background processing
     */
    async queueImportJob(sessionId: string, userId: string, source: 'pocket' | 'manual', data: any): Promise<void> {
        const job: ImportJob = { sessionId, userId, source, data };
        
        this.jobQueue.set(sessionId, job);
        
        logger.info('📋 BACKGROUND JOB: Job queued', {
            sessionId,
            userId,
            source,
            queueSize: this.jobQueue.size,
            activeJobs: this.activeJobs.size
        });
        
        // Start processing if we have capacity
        this.processQueue();
    }
    
    /**
     * Process the job queue
     */
    private async processQueue(): Promise<void> {
        // Check if we can start more jobs
        if (this.activeJobs.size >= this.MAX_CONCURRENT_JOBS) {
            logger.debug('📋 BACKGROUND JOB: Max concurrent jobs reached, waiting...');
            return;
        }
        
        // Get next job from queue
        const [sessionId, job] = Array.from(this.jobQueue.entries())[0] || [];
        if (!sessionId || !job) {
            return; // No jobs in queue
        }
        
        // Remove from queue and add to active jobs
        this.jobQueue.delete(sessionId);
        this.activeJobs.add(sessionId);
        
        logger.info('🚀 BACKGROUND JOB: Starting job processing', {
            sessionId,
            activeJobs: this.activeJobs.size,
            remainingInQueue: this.jobQueue.size
        });
        
        // Process job asynchronously
        this.processImportJob(job)
            .finally(() => {
                // Job completed (success or failure)
                this.activeJobs.delete(sessionId);
                
                logger.info('✅ BACKGROUND JOB: Job completed', {
                    sessionId,
                    activeJobs: this.activeJobs.size,
                    remainingInQueue: this.jobQueue.size
                });
                
                // Process next job if any
                setTimeout(() => this.processQueue(), 1000);
            });
    }
    
    /**
     * Process a single import job
     */
    private async processImportJob(job: ImportJob): Promise<void> {
        const { sessionId, userId, source, data } = job;
        
        try {
            // Update session status to running
            await importStateManager.updateProgress(sessionId, {
                currentAction: 'Processing import data...'
            });
            
            let articles: any[] = [];
            
            if (source === 'pocket') {
                // Transform Pocket data to our format
                articles = this.transformPocketData(data.articles || []);
            } else if (source === 'manual') {
                articles = data.articles || [];
            }
            
            if (articles.length === 0) {
                await importStateManager.completeSession(sessionId, 'completed');
                return;
            }
            
            // Update total count
            await importStateManager.updateProgress(sessionId, {
                totalArticles: articles.length,
                currentAction: `Starting import of ${articles.length} articles...`
            });
            
            // Process articles in batches
            const result = await bulkArticleProcessor.processBatch(
                userId,
                articles,
                (processed, total) => {
                    // Update progress
                    importStateManager.updateProgress(sessionId, {
                        articlesProcessed: processed,
                        currentAction: `Processed ${processed} of ${total} articles...`
                    }).catch(err => {
                        logger.error('❌ BACKGROUND JOB: Failed to update progress', { sessionId, err });
                    });
                }
            );
            
            // Update final progress
            await importStateManager.updateProgress(sessionId, {
                imported: result.imported,
                skipped: result.skipped,
                failed: result.failed,
                articlesProcessed: articles.length,
                currentAction: 'Import completed successfully'
            });
            
            // Complete session
            if (result.failed > 0 && result.imported === 0) {
                await importStateManager.completeSession(
                    sessionId, 
                    'failed', 
                    `Import failed: ${result.errors.join(', ')}`
                );
            } else {
                await importStateManager.completeSession(sessionId, 'completed');
            }
            
            logger.info('✅ BACKGROUND JOB: Import job completed successfully', {
                sessionId,
                userId,
                source,
                ...result
            });
            
        } catch (error) {
            logger.error('❌ BACKGROUND JOB: Import job failed', {
                sessionId,
                userId,
                source,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // Mark session as failed
            await importStateManager.completeSession(
                sessionId,
                'failed',
                error instanceof Error ? error.message : 'Unknown error'
            ).catch(err => {
                logger.error('❌ BACKGROUND JOB: Failed to mark session as failed', { sessionId, err });
            });
        }
    }
    
    /**
     * Transform Pocket API data to our article format
     */
    private transformPocketData(pocketArticles: any[]): any[] {
        return pocketArticles.map(item => ({
            url: item.resolved_url || item.given_url,
            title: item.resolved_title || item.given_title || 'Untitled',
            content: item.excerpt || '',
            excerpt: item.excerpt || '',
            author: item.authors && item.authors.length > 0 ? item.authors[0].name : undefined,
            publishedDate: item.time_added ? new Date(parseInt(item.time_added) * 1000) : undefined,
            savedAt: item.time_added ? new Date(parseInt(item.time_added) * 1000) : new Date(),
            tags: item.tags ? Object.keys(item.tags) : [],
            source: 'pocket' as const,
            sourceId: item.item_id
        }));
    }
    
    /**
     * Get job status
     */
    getJobStatus(sessionId: string): 'queued' | 'running' | 'not_found' {
        if (this.activeJobs.has(sessionId)) {
            return 'running';
        }
        if (this.jobQueue.has(sessionId)) {
            return 'queued';
        }
        return 'not_found';
    }
    
    /**
     * Cancel a job
     */
    cancelJob(sessionId: string): boolean {
        if (this.jobQueue.has(sessionId)) {
            this.jobQueue.delete(sessionId);
            logger.info('🚫 BACKGROUND JOB: Job cancelled (was queued)', { sessionId });
            return true;
        }
        
        // Note: Can't cancel running jobs easily, would need more complex implementation
        logger.warn('🚫 BACKGROUND JOB: Cannot cancel running job', { sessionId });
        return false;
    }
    
    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queuedJobs: this.jobQueue.size,
            activeJobs: this.activeJobs.size,
            maxConcurrentJobs: this.MAX_CONCURRENT_JOBS
        };
    }
}

export const backgroundJobProcessor = BackgroundJobProcessor.getInstance();