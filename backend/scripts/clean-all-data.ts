/**
 * ENTERPRISE-GRADE DATA CLEANUP SCRIPT
 * 
 * Safely deletes all articles and import sessions from the database
 * - Maintains referential integrity
 * - Uses proper transaction handling
 * - Provides detailed logging
 * - Confirms before destructive operations
 */

import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

async function confirmAction(message: string): Promise<boolean> {
    return new Promise((resolve) => {
        rl.question(`${message} (type 'YES' to confirm): `, (answer) => {
            resolve(answer === 'YES')
        })
    })
}

async function cleanAllData() {
    console.log('🧹 ENTERPRISE DATA CLEANUP SCRIPT')
    console.log('=====================================')
    
    try {
        // First, get current counts
        const articleCount = await prisma.article.count()
        const importSessionCount = await prisma.importSession.count()
        
        console.log(`📊 Current Data:`)
        console.log(`   Articles: ${articleCount}`)
        console.log(`   Import Sessions: ${importSessionCount}`)
        console.log('')
        
        if (articleCount === 0 && importSessionCount === 0) {
            console.log('✅ Database is already clean. No data to remove.')
            return
        }
        
        // Confirm destructive operation
        const confirmed = await confirmAction(
            `⚠️  WARNING: This will permanently delete ALL ${articleCount} articles and ${importSessionCount} import sessions.`
        )
        
        if (!confirmed) {
            console.log('❌ Operation cancelled by user.')
            return
        }
        
        console.log('')
        console.log('🚀 Starting data cleanup...')
        
        // Use transaction for data integrity
        await prisma.$transaction(async (tx) => {
            console.log('🗑️  Deleting import sessions...')
            const deletedSessions = await tx.importSession.deleteMany({})
            console.log(`   ✅ Deleted ${deletedSessions.count} import sessions`)
            
            console.log('🗑️  Deleting articles...')
            const deletedArticles = await tx.article.deleteMany({})
            console.log(`   ✅ Deleted ${deletedArticles.count} articles`)
        })
        
        console.log('')
        console.log('🎉 DATA CLEANUP COMPLETED SUCCESSFULLY')
        console.log('=====================================')
        console.log('✅ All articles and import sessions have been removed')
        console.log('✅ Database integrity maintained')
        console.log('✅ User accounts remain intact')
        
    } catch (error) {
        console.error('')
        console.error('❌ ERROR during data cleanup:')
        console.error(error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
        rl.close()
    }
}

// Run the cleanup
cleanAllData().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
})