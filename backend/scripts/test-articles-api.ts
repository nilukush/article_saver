import { prisma } from '../src/database'
import { getAllLinkedUserIds } from '../src/utils/authHelpers'

async function testArticlesAPI() {
    try {
        // Find the main user
        const mainUser = await prisma.user.findUnique({
            where: { email: 'nilukush@gmail.com' }
        })
        
        if (!mainUser) {
            console.error('Main user not found')
            return
        }
        
        console.log('Main user ID:', mainUser.id)
        
        // Test getAllLinkedUserIds
        const linkedUserIds = await getAllLinkedUserIds(mainUser.id)
        console.log('Linked user IDs:', linkedUserIds)
        
        // Count articles for each user
        for (const userId of linkedUserIds) {
            const user = await prisma.user.findUnique({ where: { id: userId } })
            const count = await prisma.article.count({ where: { userId } })
            console.log(`User ${user?.email}: ${count} articles`)
        }
        
        // Test the query that the API would use
        const articles = await prisma.article.findMany({
            where: { 
                userId: { in: linkedUserIds }
            },
            take: 5,
            orderBy: { savedAt: 'desc' },
            select: {
                id: true,
                title: true,
                userId: true
            }
        })
        
        console.log('\nSample articles from API query:')
        articles.forEach(article => {
            console.log(`- ${article.title || 'No title'} (userId: ${article.userId})`)
        })
        
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

testArticlesAPI()