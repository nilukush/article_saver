import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { DatabaseService } from './database/database'
import { ArticleService } from './services/articleService'

let mainWindow: BrowserWindow
let databaseService: DatabaseService
let articleService: ArticleService

const createWindow = (): void => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        height: 800,
        width: 1200,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../main/preload.js'),
        },
        titleBarStyle: 'hiddenInset',
        show: false,
    })

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:19858')
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
    // Initialize database
    databaseService = new DatabaseService()
    await databaseService.initialize()
    articleService = new ArticleService(databaseService)

    createWindow()

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// IPC handlers
ipcMain.handle('save-article', async (_event, url: string, tags?: string[]) => {
    try {
        const article = await articleService.saveArticle(url, tags)
        return { success: true, data: article }
    } catch (error) {
        console.error('Error saving article:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
})

ipcMain.handle('get-articles', async (_event, options?: { limit?: number; offset?: number }) => {
    try {
        const articles = await articleService.getArticles(options)
        return { success: true, data: articles }
    } catch (error) {
        console.error('Error getting articles:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
})

ipcMain.handle('get-article', async (_event, id: string) => {
    try {
        const article = await articleService.getArticle(id)
        return { success: true, data: article }
    } catch (error) {
        console.error('Error getting article:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
})

ipcMain.handle('update-article', async (_event, id: string, updates: any) => {
    try {
        const article = await articleService.updateArticle(id, updates)
        return { success: true, data: article }
    } catch (error) {
        console.error('Error updating article:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
})

ipcMain.handle('delete-article', async (_event, id: string) => {
    try {
        await articleService.deleteArticle(id)
        return { success: true }
    } catch (error) {
        console.error('Error deleting article:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
})

ipcMain.handle('search-articles', async (_event, query: string) => {
    try {
        const articles = await articleService.searchArticles(query)
        return { success: true, data: articles }
    } catch (error) {
        console.error('Error searching articles:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
})

// Cleanup on app quit
app.on('before-quit', async () => {
    if (databaseService) {
        await databaseService.close()
    }
})
