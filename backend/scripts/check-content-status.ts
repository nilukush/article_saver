import { prisma } from '../src/database'

async function checkContentStatus() {
    try {
        // Count articles with and without content
        const totalArticles = await prisma.article.count()
        const articlesWithContent = await prisma.article.count({
            where: {
                content: {
                    not: null
                }
            }
        })
        const articlesWithoutContent = await prisma.article.count({
            where: {
                content: null
            }
        })
        
        console.log('Content Extraction Status:')
        console.log(`Total articles: ${totalArticles}`)
        console.log(`Articles WITH content: ${articlesWithContent}`)
        console.log(`Articles WITHOUT content: ${articlesWithoutContent}`)
        console.log(`Percentage complete: ${Math.round((articlesWithContent / totalArticles) * 100)}%`)
        
        // Check some articles without content
        const samplesWithoutContent = await prisma.article.findMany({
            where: {
                content: null
            },
            take: 5,
            select: {
                id: true,
                url: true,
                title: true,
                createdAt: true
            }
        })
        
        console.log('\nSample articles without content:')
        samplesWithoutContent.forEach(article => {
            console.log(`- ${article.title || 'No title'} (${article.url})`)
        })
        
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkContentStatus()