import { prisma } from '../src/database'
import { getAllLinkedUserIds } from '../src/utils/authHelpers'

async function testBulkDelete() {
    try {
        // Test with the Google account user ID
        const googleUserId = '16ac50a9-be22-4858-96cf-cacb935361a0'
        
        console.log(`\n=== SIMULATING BULK DELETE FOR USER ${googleUserId} ===`)
        
        // Get all linked user IDs (this is what the API does)
        const userIds = await getAllLinkedUserIds(googleUserId)
        console.log('Linked user IDs:', userIds)
        
        // Count articles before deletion
        const countBefore = await prisma.article.count({
            where: { userId: { in: userIds } }
        })
        console.log(`Articles before deletion: ${countBefore}`)
        
        // Show breakdown by user
        for (const id of userIds) {
            const count = await prisma.article.count({ where: { userId: id } })
            const user = await prisma.user.findUnique({ where: { id } })
            console.log(`  ${user?.email}: ${count} articles`)
        }
        
        console.log('\nIf we delete with WHERE userId IN (...), it would delete from ALL linked accounts')
        console.log('This is what the fixed API endpoint should do!')
        
        // Let's also check what the old code would have done
        const oldCodeCount = await prisma.article.count({
            where: { userId: googleUserId }
        })
        console.log(`\nOld code would only delete: ${oldCodeCount} articles (just from Google account)`)
        
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

testBulkDelete()