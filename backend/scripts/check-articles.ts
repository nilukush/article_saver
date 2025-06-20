import { prisma } from '../src/database'

async function checkArticles() {
    try {
        // Count total articles
        const totalArticles = await prisma.article.count()
        console.log(`Total articles in database: ${totalArticles}`)
        
        // Get articles for the user
        const users = await prisma.user.findMany()
        console.log(`\nTotal users: ${users.length}`)
        
        for (const user of users) {
            const userArticles = await prisma.article.count({
                where: { userId: user.id }
            })
            console.log(`User ${user.email}: ${userArticles} articles`)
        }
        
        // Check import sessions
        const sessions = await prisma.importSession.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        })
        
        console.log(`\nRecent import sessions:`)
        sessions.forEach(session => {
            console.log(`- Session ${session.id}: ${session.status} (${session.source})`)
            console.log(`  Progress: ${JSON.stringify(session.progress)}`)
        })
        
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkArticles()