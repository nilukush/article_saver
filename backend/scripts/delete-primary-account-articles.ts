import { prisma } from '../src/database'
import { getAllLinkedUserIds } from '../src/utils/authHelpers'
import logger from '../src/utils/logger'

async function deletePrimaryAccountArticles() {
    try {
        // Find the primary account (email without provider suffix)
        const primaryAccount = await prisma.user.findUnique({
            where: { email: 'nilukush@gmail.com' },
            include: {
                _count: {
                    select: { articles: true }
                }
            }
        })

        if (!primaryAccount) {
            console.log('❌ Primary account not found')
            return
        }

        console.log('\n=== PRIMARY ACCOUNT FOUND ===')
        console.log(`Email: ${primaryAccount.email}`)
        console.log(`ID: ${primaryAccount.id}`)
        console.log(`Provider: ${primaryAccount.provider || 'local'}`)
        console.log(`Articles: ${primaryAccount._count.articles}`)

        if (primaryAccount._count.articles === 0) {
            console.log('\n✅ Primary account already has 0 articles')
            return
        }

        // Get all linked accounts to show what won't be affected
        const allLinkedIds = await getAllLinkedUserIds(primaryAccount.id)
        console.log(`\nLinked accounts: ${allLinkedIds.length}`)
        
        // Show articles in each account
        console.log('\n=== ARTICLE DISTRIBUTION ===')
        for (const id of allLinkedIds) {
            const user = await prisma.user.findUnique({ where: { id } })
            const count = await prisma.article.count({ where: { userId: id } })
            const isPrimary = id === primaryAccount.id
            console.log(`${isPrimary ? '➤' : ' '} ${user?.email}: ${count} articles ${isPrimary ? '(PRIMARY - WILL BE DELETED)' : '(will remain)'}`);
        }

        // Confirm deletion
        console.log(`\n⚠️  ABOUT TO DELETE ${primaryAccount._count.articles} ARTICLES FROM PRIMARY ACCOUNT ONLY`)
        console.log('Other linked accounts will NOT be affected (enterprise-grade approach)')
        console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...')
        
        await new Promise(resolve => setTimeout(resolve, 5000))

        // Create audit log entry
        await prisma.accountLinkingAudit.create({
            data: {
                userId: primaryAccount.id,
                linkedId: primaryAccount.id,
                action: 'bulk_delete',
                performedBy: 'SYSTEM_ADMIN',
                metadata: {
                    reason: 'Test cleanup requested by user',
                    scope: 'primary_account_only',
                    articlesToDelete: primaryAccount._count.articles,
                    timestamp: new Date()
                }
            }
        }).catch(err => console.error('Failed to create audit log:', err))

        // Perform the deletion - ONLY from primary account
        console.log('\n🗑️  Deleting articles from primary account...')
        const deleteResult = await prisma.article.deleteMany({
            where: { userId: primaryAccount.id }
        })

        console.log(`\n✅ SUCCESS: Deleted ${deleteResult.count} articles from primary account`)

        // Verify deletion
        const remainingInPrimary = await prisma.article.count({
            where: { userId: primaryAccount.id }
        })
        
        const remainingInLinked = await prisma.article.count({
            where: { 
                userId: { 
                    in: allLinkedIds.filter(id => id !== primaryAccount.id) 
                } 
            }
        })

        console.log('\n=== FINAL STATE ===')
        console.log(`Primary account articles: ${remainingInPrimary}`)
        console.log(`Linked accounts articles: ${remainingInLinked}`)
        console.log(`Total articles remaining: ${remainingInPrimary + remainingInLinked}`)

        // Log the operation
        logger.info('🗑️ ADMIN: Primary account articles deleted', {
            primaryAccountId: primaryAccount.id,
            articlesDeleted: deleteResult.count,
            remainingInPrimary,
            remainingInLinked
        })

    } catch (error) {
        console.error('❌ Error:', error)
        logger.error('Failed to delete primary account articles', error)
    } finally {
        await prisma.$disconnect()
    }
}

// Run the deletion
console.log('🏢 ENTERPRISE-GRADE PRIMARY ACCOUNT ARTICLE DELETION')
console.log('This follows data sovereignty principles - only affects primary account')
deletePrimaryAccountArticles()