import { prisma } from '../src/database';
import logger from '../src/utils/logger';

async function runMigration() {
    try {
        logger.info('🔄 Running migration to mark articles for content extraction...');
        
        // Mark articles that likely came from Pocket (have excerpt but limited content)
        const result = await prisma.$executeRaw`
            UPDATE articles 
            SET 
                content_extracted = false,
                extraction_status = 'pending'
            WHERE 
                -- Articles where content equals excerpt (Pocket imports)
                (content = excerpt AND excerpt IS NOT NULL)
                -- Or articles with very short content (likely just excerpts)
                OR (LENGTH(content) < 500 AND excerpt IS NOT NULL)
                -- Or articles with no content
                OR content IS NULL 
                OR content = ''
        `;
        
        logger.info(`✅ Migration completed! Updated ${result} articles for content extraction.`);
        
        // Get count of articles needing extraction
        const needingExtraction = await prisma.article.count({
            where: {
                contentExtracted: false
            }
        });
        
        logger.info(`📊 Total articles needing content extraction: ${needingExtraction}`);
        
    } catch (error) {
        logger.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runMigration();