import { prisma } from '../database';
import logger from '../utils/logger';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

/**
 * Enterprise-grade content extraction service
 * Automatically extracts full content for articles after import
 */
export class ContentExtractionService {
    private static instance: ContentExtractionService;
    private isRunning = false;
    private readonly BATCH_SIZE = 50;
    private readonly CONCURRENT_EXTRACTIONS = 5;
    private readonly RETRY_DELAY = 2000; // 2 seconds between retries
    
    static getInstance(): ContentExtractionService {
        if (!ContentExtractionService.instance) {
            ContentExtractionService.instance = new ContentExtractionService();
        }
        return ContentExtractionService.instance;
    }
    
    /**
     * Start automatic extraction for a user's articles
     */
    async startAutomaticExtraction(userId: string): Promise<void> {
        if (this.isRunning) {
            logger.info('⏳ CONTENT EXTRACTION: Already running, skipping start');
            return;
        }
        
        this.isRunning = true;
        logger.info('🚀 CONTENT EXTRACTION: Starting automatic extraction', { userId });
        
        try {
            let processed = 0;
            let hasMore = true;
            
            while (hasMore && this.isRunning) {
                // Get articles needing extraction
                const articles = await prisma.article.findMany({
                    where: {
                        userId,
                        OR: [
                            { contentExtracted: false },
                            { extractionStatus: null },
                            { extractionStatus: 'pending' }
                        ]
                    },
                    take: this.BATCH_SIZE,
                    orderBy: { savedAt: 'desc' }
                });
                
                if (articles.length === 0) {
                    hasMore = false;
                    break;
                }
                
                logger.info('📦 CONTENT EXTRACTION: Processing batch', {
                    batchSize: articles.length,
                    totalProcessed: processed
                });
                
                // Process articles in parallel chunks
                for (let i = 0; i < articles.length; i += this.CONCURRENT_EXTRACTIONS) {
                    const chunk = articles.slice(i, i + this.CONCURRENT_EXTRACTIONS);
                    
                    await Promise.all(
                        chunk.map(article => this.extractArticleContent(article))
                    );
                    
                    // Small delay between chunks to avoid overwhelming servers
                    if (i + this.CONCURRENT_EXTRACTIONS < articles.length) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
                
                processed += articles.length;
                
                // Check if we should continue
                hasMore = articles.length === this.BATCH_SIZE;
            }
            
            logger.info('✅ CONTENT EXTRACTION: Automatic extraction completed', {
                userId,
                totalProcessed: processed
            });
            
        } catch (error) {
            logger.error('❌ CONTENT EXTRACTION: Fatal error', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            this.isRunning = false;
        }
    }
    
    /**
     * Extract content for a single article
     */
    private async extractArticleContent(article: any): Promise<void> {
        try {
            // Mark as processing
            await prisma.article.update({
                where: { id: article.id },
                data: { extractionStatus: 'processing' }
            });
            
            logger.info('🔄 CONTENT EXTRACTION: Extracting content', {
                articleId: article.id,
                url: article.url
            });
            
            // Fetch the webpage
            const response = await fetch(article.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            
            // Extract content using Readability
            const dom = new JSDOM(html, { 
                url: article.url,
                // Disable resource loading for performance
                resources: undefined,
                runScripts: undefined,
                pretendToBeVisual: true
            });
            
            const reader = new Readability(dom.window.document as any, {
                charThreshold: 50, // Lower threshold for more content
                classesToPreserve: ['highlight', 'code', 'pre', 'syntax', 'language-'],
                keepClasses: true
            });
            
            const parsed = reader.parse();
            
            if (parsed && parsed.content && parsed.content.length > 100) {
                // Successfully extracted content
                await prisma.article.update({
                    where: { id: article.id },
                    data: {
                        content: parsed.content,
                        // CRITICAL FIX: Don't overwrite existing title from Pocket
                        // Only use extracted title if article has no title
                        title: article.title || parsed.title || 'Untitled',
                        excerpt: parsed.excerpt || article.excerpt || this.generateExcerpt(parsed.content),
                        author: parsed.byline || article.author,
                        contentExtracted: true,
                        extractionStatus: 'completed'
                    }
                });
                
                logger.info('✅ CONTENT EXTRACTION: Successfully extracted', {
                    articleId: article.id,
                    contentLength: parsed.content.length
                });
            } else {
                throw new Error('Insufficient content extracted');
            }
            
        } catch (error) {
            logger.error('❌ CONTENT EXTRACTION: Failed to extract', {
                articleId: article.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // Mark as failed
            await prisma.article.update({
                where: { id: article.id },
                data: {
                    extractionStatus: 'failed',
                    contentExtracted: false
                }
            });
        }
    }
    
    /**
     * Generate excerpt from content
     */
    private generateExcerpt(content: string): string {
        const text = content.replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        return text.length > 200 ? text.substring(0, 200) + '...' : text;
    }
    
    /**
     * Stop extraction process
     */
    stop(): void {
        this.isRunning = false;
        logger.info('🛑 CONTENT EXTRACTION: Stopping extraction service');
    }
}

export const contentExtractionService = ContentExtractionService.getInstance();