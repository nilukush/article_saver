import { bulkArticleProcessor } from './BulkArticleProcessor';
import { importStateManager } from './ImportStateManager';
import logger from '../utils/logger';
import { prisma } from '../database';

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
            
            // Also update session status to running
            await prisma.importSession.update({
                where: { id: sessionId },
                data: { status: 'running' }
            });
            
            let articles: any[] = [];
            
            if (source === 'pocket') {
                if (data.articles) {
                    // Transform Pocket data to our format (for legacy calls)
                    articles = this.transformPocketData(data.articles);
                } else if (data.accessToken && data.consumerKey) {
                    // Fetch articles from Pocket API directly
                    logger.info('🔍 BACKGROUND JOB: Fetching articles from Pocket API', { sessionId });
                    articles = await this.fetchPocketArticles(sessionId, data);
                } else {
                    throw new Error('Invalid Pocket import data: missing articles or API credentials');
                }
            } else if (source === 'manual') {
                articles = data.articles || [];
            }
            
            if (articles.length === 0) {
                logger.info('✅ BACKGROUND JOB: No articles to import', { sessionId });
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
                
                // Start automatic content extraction for imported articles
                if (result.imported > 0) {
                    logger.info('🔄 BACKGROUND JOB: Starting content extraction for imported articles', {
                        sessionId,
                        userId,
                        imported: result.imported
                    });
                    
                    // Import ContentExtractionService
                    const { contentExtractionService } = await import('./ContentExtractionService');
                    
                    // Start extraction asynchronously
                    contentExtractionService.startAutomaticExtraction(userId).catch(err => {
                        logger.error('❌ BACKGROUND JOB: Failed to start content extraction', { 
                            sessionId,
                            userId,
                            error: err 
                        });
                    });
                }
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
     * Fetch articles from Pocket API
     */
    private async fetchPocketArticles(sessionId: string, data: any): Promise<any[]> {
        const { accessToken, consumerKey, batchSize = 100, includeArchived = true } = data;
        
        // Update progress
        await importStateManager.updateProgress(sessionId, {
            currentAction: 'Fetching articles from Pocket API...'
        });
        
        const POCKET_PAGE_SIZE = 30;
        const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
        const MAX_RETRIES = 3;
        
        let allArticles: any = {};
        let offset = 0;
        let hasMoreResults = true;
        let totalFetched = 0;
        let pageNumber = 1;
        
        logger.info('🔍 POCKET IMPORT: Starting rate-limited paginated fetch from Pocket API...', { sessionId });
        
        // Fetch all articles using pagination with rate limiting
        while (hasMoreResults) {
            // Update progress with current state
            await importStateManager.updateProgress(sessionId, {
                currentPage: pageNumber,
                currentAction: `Fetching page ${pageNumber} from Pocket API...`,
                totalArticles: totalFetched > 0 ? totalFetched : 0, // Show current fetch count
                articlesProcessed: totalFetched, // Show fetched count as progress during fetch phase
                totalPages: pageNumber
            });
            
            logger.info(`🔍 POCKET IMPORT: Fetching page ${pageNumber} at offset ${offset}...`, { sessionId });
            
            let retryCount = 0;
            let pageSuccess = false;
            let pocketData: any = null;
            
            // Retry logic for rate limiting
            while (!pageSuccess && retryCount < MAX_RETRIES) {
                try {
                    // Add delay before each request to respect rate limits
                    if (pageNumber > 1) {
                        logger.info(`🔍 POCKET IMPORT: Waiting ${RATE_LIMIT_DELAY}ms to respect rate limits...`, { sessionId });
                        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
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
                            state: includeArchived ? 'all' : 'unread',
                            sort: 'newest',
                            count: POCKET_PAGE_SIZE,
                            offset: offset
                        }),
                    });
                    
                    // Check for rate limiting or server errors
                    if (retrieveResponse.status === 429 || retrieveResponse.status === 502 || retrieveResponse.status === 503) {
                        retryCount++;
                        const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                        logger.warn(`⚠️ POCKET IMPORT: Rate limited or server error (${retrieveResponse.status}), retry ${retryCount}/${MAX_RETRIES} in ${backoffDelay}ms`, { sessionId });
                        
                        if (retryCount < MAX_RETRIES) {
                            await new Promise(resolve => setTimeout(resolve, backoffDelay));
                            continue;
                        } else {
                            throw new Error(`Pocket API rate limited after ${MAX_RETRIES} retries`);
                        }
                    }
                    
                    if (!retrieveResponse.ok) {
                        const errorText = await retrieveResponse.text();
                        logger.error('❌ POCKET IMPORT: API Error Response:', { sessionId, errorText });
                        throw new Error(`Pocket API error: ${retrieveResponse.status} ${retrieveResponse.statusText}`);
                    }
                    
                    const contentType = retrieveResponse.headers.get('content-type');
                    if (!contentType?.includes('application/json')) {
                        throw new Error('Pocket API returned invalid response. Check your access token.');
                    }
                    
                    pocketData = await retrieveResponse.json();
                    
                    if (pocketData.status !== 1) {
                        logger.error('❌ POCKET IMPORT: Invalid Pocket response status:', { sessionId, status: pocketData.status });
                        throw new Error('Failed to retrieve articles from Pocket');
                    }
                    
                    pageSuccess = true;
                    
                } catch (error) {
                    retryCount++;
                    if (retryCount >= MAX_RETRIES) {
                        throw error;
                    }
                    
                    const backoffDelay = Math.pow(2, retryCount) * 1000;
                    logger.warn(`⚠️ POCKET IMPORT: Error on page ${pageNumber}, retry ${retryCount}/${MAX_RETRIES} in ${backoffDelay}ms:`, { sessionId, error });
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                }
            }
            
            const pageArticles = pocketData.list || {};
            const pageCount = Object.keys(pageArticles).length;
            
            logger.info(`🔍 POCKET IMPORT: Page ${pageNumber} fetched - ${pageCount} articles`, { sessionId });
            
            // Check if we have any articles on this page
            if (pageCount === 0) {
                hasMoreResults = false;
                logger.info('🔍 POCKET IMPORT: No more articles found, ending pagination', { sessionId });
                break;
            }
            
            // Merge articles from this page
            allArticles = { ...allArticles, ...pageArticles };
            totalFetched += pageCount;
            
            // Update progress after each successful page fetch
            await importStateManager.updateProgress(sessionId, {
                currentPage: pageNumber,
                currentAction: `Fetched ${totalFetched} articles so far...`,
                totalArticles: totalFetched,
                articlesProcessed: totalFetched, // Show fetched count as progress
                totalPages: pageCount < POCKET_PAGE_SIZE ? pageNumber : pageNumber + 1
            });
            
            // Check if we have fewer articles than requested (end of data)
            if (pageCount < POCKET_PAGE_SIZE) {
                hasMoreResults = false;
                logger.info('🔍 POCKET IMPORT: Received fewer articles than requested, reached end of data', { sessionId });
            } else {
                offset += POCKET_PAGE_SIZE;
                pageNumber++;
                logger.info(`🔍 POCKET IMPORT: More results available, continuing with offset ${offset}`, { sessionId });
            }
            
            // Safety check to prevent infinite loops - allow much larger imports
            if (pageNumber > 500) { // Max 15,000 articles (500 pages * 30 articles)
                logger.warn('🔍 POCKET IMPORT: Safety limit reached (500 pages), stopping pagination', { sessionId });
                hasMoreResults = false;
            }
        }
        
        const articleEntries = Object.entries(allArticles);
        const totalArticleCount = articleEntries.length;
        
        logger.info(`🔍 POCKET IMPORT: Pagination complete! Retrieved ${totalArticleCount} articles from Pocket API`, { sessionId });
        
        // Update final fetch count
        await importStateManager.updateProgress(sessionId, {
            currentAction: `Fetched ${totalArticleCount} articles, preparing for import...`,
            totalArticles: totalArticleCount,
            articlesProcessed: 0 // Reset for actual processing phase
        });
        
        // Transform to our format
        return this.transformPocketData(articleEntries.map(([itemId, item]) => ({ ...(item as any), item_id: itemId })));
    }
    
    /**
     * Transform Pocket API data to our article format
     */
    private transformPocketData(pocketArticles: any[]): any[] {
        return pocketArticles.map(item => ({
            url: item.resolved_url || item.given_url,
            title: item.resolved_title || item.given_title || 'Untitled',
            content: null, // Don't set content to excerpt - let ContentExtractionService handle it
            excerpt: item.excerpt || '',
            author: item.authors && item.authors.length > 0 ? item.authors[0].name : undefined,
            publishedDate: item.time_added ? new Date(parseInt(item.time_added) * 1000) : undefined,
            savedAt: item.time_added ? new Date(parseInt(item.time_added) * 1000) : new Date(),
            tags: item.tags ? Object.keys(item.tags) : [],
            source: 'pocket' as const,
            sourceId: item.item_id,
            contentExtracted: false, // Explicitly mark as needing extraction
            extractionStatus: 'pending' // Set status for extraction service
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