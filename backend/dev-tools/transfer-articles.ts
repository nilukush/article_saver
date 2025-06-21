import { prisma } from '../src/database'

async function transferArticles() {
    try {
        // Find the accounts
        const googleAccount = await prisma.user.findUnique({
            where: { email: 'nilukush@gmail.com.google.1750402875382' }
        })
        
        const mainAccount = await prisma.user.findUnique({
            where: { email: 'nilukush@gmail.com' }
        })
        
        if (!googleAccount || !mainAccount) {
            console.error('Could not find one or both accounts')
            return
        }
        
        console.log(`Transferring articles from ${googleAccount.email} to ${mainAccount.email}`)
        
        // Count articles to transfer
        const articlesToTransfer = await prisma.article.count({
            where: { userId: googleAccount.id }
        })
        
        console.log(`Articles to transfer: ${articlesToTransfer}`)
        
        // Transfer articles in batches
        const batchSize = 100
        let transferred = 0
        
        while (transferred < articlesToTransfer) {
            const batch = await prisma.article.findMany({
                where: { userId: googleAccount.id },
                take: batchSize,
                skip: transferred
            })
            
            // Update articles to new user
            await prisma.article.updateMany({
                where: {
                    id: { in: batch.map(a => a.id) }
                },
                data: {
                    userId: mainAccount.id
                }
            })
            
            transferred += batch.length
            console.log(`Transferred ${transferred}/${articlesToTransfer} articles...`)
        }
        
        console.log('✅ Transfer complete!')
        
        // Verify
        const mainAccountArticles = await prisma.article.count({
            where: { userId: mainAccount.id }
        })
        console.log(`Main account now has ${mainAccountArticles} articles`)
        
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

transferArticles()