import { prisma } from '../src/database'
import { getAllLinkedUserIds } from '../src/utils/authHelpers'

async function debugDeletion() {
    try {
        // Find users with articles
        const usersWithArticles = await prisma.user.findMany({
            where: {
                articles: {
                    some: {}
                }
            },
            include: {
                _count: {
                    select: { articles: true }
                }
            }
        })

        console.log('\n=== USERS WITH ARTICLES ===')
        for (const user of usersWithArticles) {
            console.log(`User: ${user.email} (${user.id})`)
            console.log(`  Provider: ${user.provider || 'email'}`)
            console.log(`  Articles: ${user._count.articles}`)
            
            // Check linked accounts
            const linkedUserIds = await getAllLinkedUserIds(user.id)
            console.log(`  Linked accounts: ${linkedUserIds.length}`)
            console.log(`  Linked IDs: ${linkedUserIds.join(', ')}`)
        }

        // Check all linked accounts
        const allLinkedAccounts = await prisma.linkedAccount.findMany({
            include: {
                primaryUser: true,
                linkedUser: true
            }
        })

        console.log('\n=== ALL LINKED ACCOUNTS ===')
        for (const link of allLinkedAccounts) {
            console.log(`Primary: ${link.primaryUser.email} (${link.primaryUserId})`)
            console.log(`Linked: ${link.linkedUser.email} (${link.linkedUserId})`)
            console.log(`Verified: ${link.verified}`)
            console.log('---')
        }

        // Test getAllLinkedUserIds function
        if (usersWithArticles.length > 0) {
            const testUserId = usersWithArticles[0].id
            console.log(`\n=== TESTING getAllLinkedUserIds for ${testUserId} ===`)
            const linkedIds = await getAllLinkedUserIds(testUserId)
            console.log('Result:', linkedIds)
            
            // Count articles for each linked ID
            for (const id of linkedIds) {
                const count = await prisma.article.count({ where: { userId: id } })
                const user = await prisma.user.findUnique({ where: { id } })
                console.log(`  ${id}: ${count} articles (${user?.email})`)
            }
        }

    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

debugDeletion()