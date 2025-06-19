import { prisma } from '../database';
import logger from '../utils/logger';

interface BulkArticleData {
    url: string;
    title: string;
    content?: string;
    excerpt?: string;
    author?: string;
    publishedDate?: Date;
    tags: string[];
    source: 'pocket' | 'manual';
    sourceId?: string; // External ID from source
}

/**
 * Enterprise-grade bulk article processing for high-performance imports
 * Replaces individual inserts with optimized batch operations
 */
export class BulkArticleProcessor {
    private readonly BATCH_SIZE = 100;
    private readonly MAX_RETRIES = 3;
    
    /**
     * Process articles in optimized batches
     */
    async processBatch(
        userId: string, 
        articles: BulkArticleData[], 
        onProgress?: (processed: number, total: number) => void
    ): Promise<{
        imported: number;
        skipped: number;
        failed: number;
        errors: string[];
    }> {
        const results = {
            imported: 0,
            skipped: 0,
            failed: 0,
            errors: [] as string[]
        };
        
        logger.info('🚀 BULK PROCESSOR: Starting batch processing', {
            userId,
            totalArticles: articles.length,
            batchSize: this.BATCH_SIZE
        });
        
        // Process in chunks for memory efficiency
        for (let i = 0; i < articles.length; i += this.BATCH_SIZE) {
            const batch = articles.slice(i, i + this.BATCH_SIZE);
            
            try {
                const batchResult = await this.processSingleBatch(userId, batch);
                
                results.imported += batchResult.imported;
                results.skipped += batchResult.skipped;
                results.failed += batchResult.failed;
                results.errors.push(...batchResult.errors);
                
                // Progress callback
                if (onProgress) {
                    onProgress(i + batch.length, articles.length);
                }
                
                logger.info('✅ BULK PROCESSOR: Batch completed', {
                    batchNumber: Math.floor(i / this.BATCH_SIZE) + 1,
                    batchSize: batch.length,
                    imported: batchResult.imported,
                    skipped: batchResult.skipped,
                    failed: batchResult.failed
                });
                
            } catch (error) {
                logger.error('❌ BULK PROCESSOR: Batch failed', {
                    batchNumber: Math.floor(i / this.BATCH_SIZE) + 1,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                
                results.failed += batch.length;
                results.errors.push(`Batch ${Math.floor(i / this.BATCH_SIZE) + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        
        logger.info('🎯 BULK PROCESSOR: Processing complete', {
            userId,
            totalArticles: articles.length,
            ...results
        });
        
        return results;
    }
    
    /**
     * Process a single batch with deduplication and error handling
     */
    private async processSingleBatch(
        userId: string, 
        batch: BulkArticleData[]
    ): Promise<{
        imported: number;
        skipped: number;
        failed: number;
        errors: string[];
    }> {
        const results = {
            imported: 0,
            skipped: 0,
            failed: 0,
            errors: [] as string[]
        };
        
        try {
            // Step 1: Check for existing articles (deduplication)
            const urls = batch.map(article => article.url);
            const existingArticles = await prisma.article.findMany({
                where: {
                    userId,
                    url: { in: urls }
                },
                select: { url: true }
            });
            
            const existingUrls = new Set(existingArticles.map(a => a.url));
            const newArticles = batch.filter(article => !existingUrls.has(article.url));
            
            results.skipped = batch.length - newArticles.length;
            
            if (newArticles.length === 0) {
                logger.debug('⏭️ BULK PROCESSOR: All articles in batch already exist');
                return results;
            }
            
            // Step 2: Prepare data for bulk insert
            const articlesToInsert = newArticles.map(article => ({
                id: crypto.randomUUID(),
                userId,
                url: article.url,
                title: article.title,
                content: article.content || '',
                excerpt: article.excerpt,
                author: article.author,
                publishedDate: article.publishedDate,
                savedAt: (article as any).savedAt || new Date(),
                tags: article.tags,
                isRead: false,
                isArchived: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                syncedAt: new Date()
            }));
            
            // Step 3: Bulk insert with transaction
            await prisma.$transaction(async (tx) => {
                await tx.article.createMany({
                    data: articlesToInsert,
                    skipDuplicates: true // Additional safety
                });
            });
            
            results.imported = newArticles.length;
            
            logger.debug('✅ BULK PROCESSOR: Batch inserted successfully', {
                batchSize: batch.length,
                inserted: results.imported,
                skipped: results.skipped
            });
            
        } catch (error) {
            logger.error('❌ BULK PROCESSOR: Batch processing failed', {
                batchSize: batch.length,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            results.failed = batch.length - results.skipped;
            results.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
        
        return results;
    }
    
    /**
     * Validate article data before processing
     */
    private validateArticle(article: BulkArticleData): boolean {
        try {
            // Basic validation
            if (!article.url || !article.title) {
                return false;
            }
            
            // URL validation
            new URL(article.url);
            
            // Title length validation
            if (article.title.length > 500) {
                return false;
            }
            
            return true;
        } catch {
            return false;
        }
    }
}

export const bulkArticleProcessor = new BulkArticleProcessor();