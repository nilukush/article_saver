import { prisma } from '../src/database'

async function checkRedditArticle() {
    try {
        // Find the reddit article
        const redditArticles = await prisma.article.findMany({
            where: {
                OR: [
                    { url: { contains: 'reddit.com' } },
                    { title: { contains: 'heart of the internet' } }
                ]
            },
            select: {
                id: true,
                url: true,
                title: true,
                excerpt: true,
                createdAt: true
            }
        })
        
        console.log('Reddit articles found:', redditArticles.length)
        redditArticles.forEach(article => {
            console.log('\n---')
            console.log('ID:', article.id)
            console.log('URL:', article.url)
            console.log('Title:', article.title)
            console.log('Excerpt:', article.excerpt?.substring(0, 100) + '...')
            console.log('Created:', article.createdAt)
        })
        
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkRedditArticle()