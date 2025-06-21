import { prisma } from '../src/database'

async function checkAllArticles() {
    try {
        // Get all users
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                _count: {
                    select: {
                        articles: true
                    }
                }
            }
        })

        console.log('\n=== ALL USERS AND ARTICLE COUNTS ===\n')
        
        for (const user of users) {
            console.log(`User: ${user.email}`)
            console.log(`  ID: ${user.id}`)
            console.log(`  Articles: ${user._count.articles}`)
            
            if (user._count.articles > 0) {
                // Get first 5 articles as a sample
                const sampleArticles = await prisma.article.findMany({
                    where: { userId: user.id },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        url: true,
                        createdAt: true
                    }
                })
                
                console.log('\n  Sample articles:')
                sampleArticles.forEach(article => {
                    console.log(`    - ${article.title || 'No title'} (${article.createdAt.toISOString()})`)
                })
            }
            console.log('\n---\n')
        }

        // Get total article count
        const totalArticles = await prisma.article.count()
        console.log(`\nTOTAL ARTICLES IN DATABASE: ${totalArticles}\n`)

    } catch (error) {
        console.error('Error checking articles:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkAllArticles()