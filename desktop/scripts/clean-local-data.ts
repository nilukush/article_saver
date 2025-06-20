/**
 * ENTERPRISE-GRADE LOCAL DATA CLEANUP SCRIPT
 * 
 * Safely deletes all local articles from desktop JSON database
 * - Maintains database file integrity
 * - Creates backup before cleanup
 * - Provides detailed logging
 * - Confirms before destructive operations
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const readline = require('readline')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

async function confirmAction(message: string): Promise<boolean> {
    return new Promise((resolve) => {
        rl.question(`${message} (type 'YES' to confirm): `, (answer: string) => {
            resolve(answer === 'YES')
        })
    })
}

function getDataFilePath(): string {
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'Article Saver')
    return path.join(userDataPath, 'articles.json')
}

function getBackupPath(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'Article Saver')
    return path.join(userDataPath, `articles-backup-${timestamp}.json`)
}

async function cleanLocalData() {
    console.log('🧹 ENTERPRISE LOCAL DATA CLEANUP SCRIPT')
    console.log('=========================================')
    
    const dataFilePath = getDataFilePath()
    
    try {
        // Check if data file exists
        if (!fs.existsSync(dataFilePath)) {
            console.log('✅ Local database file does not exist. Nothing to clean.')
            return
        }
        
        // Read current data
        const rawData = fs.readFileSync(dataFilePath, 'utf8')
        let articles = []
        
        try {
            const data = JSON.parse(rawData)
            articles = data.articles || []
        } catch (parseError) {
            console.log('⚠️  Database file exists but contains invalid JSON. Will reset to empty state.')
            articles = []
        }
        
        console.log(`📊 Current Local Data:`)
        console.log(`   Articles: ${articles.length}`)
        console.log(`   File: ${dataFilePath}`)
        console.log('')
        
        if (articles.length === 0) {
            console.log('✅ Local database is already clean. No articles to remove.')
            return
        }
        
        // Confirm destructive operation
        const confirmed = await confirmAction(
            `⚠️  WARNING: This will permanently delete ALL ${articles.length} local articles.`
        )
        
        if (!confirmed) {
            console.log('❌ Operation cancelled by user.')
            return
        }
        
        console.log('')
        console.log('🚀 Starting local data cleanup...')
        
        // Create backup
        const backupPath = getBackupPath()
        console.log('💾 Creating backup...')
        
        // Ensure backup directory exists
        const backupDir = path.dirname(backupPath)
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
        }
        
        fs.copyFileSync(dataFilePath, backupPath)
        console.log(`   ✅ Backup created: ${backupPath}`)
        
        // Clean the data
        const cleanData = {
            articles: [],
            lastSync: null,
            version: '1.0.0'
        }
        
        console.log('🗑️  Clearing local articles...')
        fs.writeFileSync(dataFilePath, JSON.stringify(cleanData, null, 2), 'utf8')
        console.log(`   ✅ Cleared ${articles.length} local articles`)
        
        // Clear localStorage-related data (for when app is running)
        console.log('🧹 Note: Clear browser storage manually if app is running:')
        console.log('   - localStorage keys: authToken, userEmail, lastPocketImport')
        console.log('   - Or restart the application')
        
        console.log('')
        console.log('🎉 LOCAL DATA CLEANUP COMPLETED SUCCESSFULLY')
        console.log('==========================================')
        console.log('✅ All local articles have been removed')
        console.log('✅ Database file reset to clean state')
        console.log('✅ Backup created for recovery if needed')
        console.log(`📁 Backup location: ${backupPath}`)
        
    } catch (error) {
        console.error('')
        console.error('❌ ERROR during local data cleanup:')
        console.error(error)
        process.exit(1)
    } finally {
        rl.close()
    }
}

// Run the cleanup
cleanLocalData().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
})