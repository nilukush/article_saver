import { app, BrowserWindow, ipcMain, shell, protocol } from 'electron'
import path from 'path'
import http from 'http'
import url from 'url'
import { DatabaseService } from './database/database'
import { ArticleService } from './services/articleService'

// DISABLE DEV TOOLS AT CHROMIUM ENGINE LEVEL - MUST BE BEFORE app.ready
app.commandLine.appendSwitch('--disable-dev-tools')
app.commandLine.appendSwitch('--disable-extensions')
app.commandLine.appendSwitch('--disable-gpu-debug')
// Remove --disable-web-security to allow WebAuthn
// app.commandLine.appendSwitch('--disable-web-security')

// Set app name early in the process - Multiple ways for macOS compatibility
app.setName('Article Saver')
app.name = 'Article Saver'

// Set environment variables to disable debugging
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// Register custom protocol for OAuth callbacks
if (!app.isDefaultProtocolClient('article-saver')) {
    app.setAsDefaultProtocolClient('article-saver')
}

let mainWindow: BrowserWindow
let databaseService: DatabaseService
let articleService: ArticleService

// OAuth HTTP server for localhost callbacks
function createOAuthServer(): Promise<{ server: http.Server; port: number }> {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url!, `http://localhost`)

            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

            if (req.method === 'OPTIONS') {
                res.writeHead(200)
                res.end()
                return
            }

            if (url.pathname.startsWith('/auth/callback/')) {
                const provider = url.pathname.split('/')[3] // google, github, pocket
                const code = url.searchParams.get('code')
                const token = url.searchParams.get('token')
                const email = url.searchParams.get('email')
                const error = url.searchParams.get('error')
                const action = url.searchParams.get('action')
                const existingProvider = url.searchParams.get('existingProvider')
                const linkingToken = url.searchParams.get('linkingToken')

                // Send success page to browser
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Authentication Complete</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            .success { color: #4CAF50; }
                            .error { color: #f44336; }
                        </style>
                    </head>
                    <body>
                        <h1 class="${error ? 'error' : 'success'}">
                            ${error ? 'Authentication Failed' : 'Authentication Successful!'}
                        </h1>
                        <p>${error ? `Error: ${error}` : 'You can now close this window and return to the app.'}</p>
                        <script>
                            setTimeout(() => window.close(), 3000);
                        </script>
                    </body>
                    </html>
                `)

                // Send result to main window
                if (mainWindow) {
                    if (error) {
                        console.error('OAuth error:', error)
                        mainWindow.webContents.send('oauth-error', { provider, error })
                    } else if (action === 'link_account' && linkingToken) {
                        // If we also have a token, save it first
                        if (token && email) {
                            mainWindow.webContents.send('oauth-success', { provider, token, email })
                        }
                        // Then show the linking prompt
                        mainWindow.webContents.send('oauth-account-linking', { 
                            provider, 
                            existingProvider, 
                            linkingToken, 
                            email,
                            action,
                            token, // Pass token along
                            trustLevel: url.searchParams.get('trustLevel'),
                            requiresVerification: url.searchParams.get('requiresVerification')
                        })
                    } else if (token && email) {
                        mainWindow.webContents.send('oauth-success', { provider, token, email })
                    } else if (code) {
                        mainWindow.webContents.send('oauth-callback', { provider, code })
                    } else if (provider === 'pocket') {
                        // For Pocket, call backend to exchange request token for access token
                        const options = {
                            hostname: 'localhost',
                            port: 3003,
                            path: '/api/pocket/callback',
                            method: 'GET',
                            timeout: 10000 // 10 second timeout
                        }

                        const req = http.request(options, (response) => {
                            let data = ''
                            response.on('data', (chunk) => {
                                data += chunk
                            })

                            response.on('end', () => {
                                if (response.statusCode === 200) {
                                    mainWindow.webContents.send('oauth-success', {
                                        provider: 'pocket',
                                        token: 'exchanged',
                                        email: 'pocket-user'
                                    })
                                } else if (response.statusCode === 302 && response.headers.location) {
                                    // Handle successful redirect with Pocket credentials
                                    const locationUrl = new URL(response.headers.location)
                                    const pocketToken = locationUrl.searchParams.get('pocket_token')
                                    const pocketUsername = locationUrl.searchParams.get('pocket_username')

                                    if (pocketToken && pocketUsername) {
                                        mainWindow.webContents.send('oauth-success', {
                                            provider: 'pocket',
                                            token: pocketToken,
                                            email: pocketUsername
                                        })
                                    } else {
                                        console.error('Missing Pocket credentials in redirect')
                                        mainWindow.webContents.send('oauth-error', {
                                            provider: 'pocket',
                                            error: 'Missing credentials in OAuth redirect'
                                        })
                                    }
                                } else {
                                    console.error('Pocket token exchange failed:', response.statusCode)
                                    mainWindow.webContents.send('oauth-error', {
                                        provider: 'pocket',
                                        error: `Token exchange failed: ${response.statusCode}`
                                    })
                                }
                            })
                        })

                        req.on('error', (error: any) => {
                            console.error('OAuth HTTP request error:', error.message)
                            mainWindow.webContents.send('oauth-error', {
                                provider: 'pocket',
                                error: `Network error during token exchange: ${error.message}`
                            })
                        })

                        req.on('timeout', () => {
                            console.error('OAuth HTTP request timeout')
                            req.destroy()
                            mainWindow.webContents.send('oauth-error', {
                                provider: 'pocket',
                                error: 'Request timeout during token exchange'
                            })
                        })

                        req.end()
                    }

                    // Focus the main window
                    if (mainWindow.isMinimized()) mainWindow.restore()
                    mainWindow.focus()
                }

                // Close server after handling callback
                setTimeout(() => {
                    server.close()
                }, 1000)
            } else {
                res.writeHead(404)
                res.end('Not Found')
            }
        })

        server.listen(0, 'localhost', () => {
            const address = server.address()
            if (address && typeof address === 'object') {
                resolve({ server, port: address.port })
            } else {
                reject(new Error('Failed to get server address'))
            }
        })

        server.on('error', reject)
    })
}

const createWindow = (): void => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        height: 800,
        width: 1200,
        title: 'Article Saver',
        icon: process.platform === 'darwin' ? undefined : path.join(__dirname, '../../../public/logo.svg'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: true,
            allowRunningInsecureContent: false,
            webSecurity: true,
            enableWebSQL: false
        },
        titleBarStyle: 'hiddenInset',
        show: false,
    })

    // Set app-specific menu for proper naming on macOS
    if (process.platform === 'darwin') {
        const { Menu } = require('electron')
        const template = [
            {
                label: 'Article Saver', // This fixes the menu bar name issue
                submenu: [
                    { label: 'About Article Saver', role: 'about' },
                    { type: 'separator' },
                    { label: 'Hide Article Saver', role: 'hide' },
                    { label: 'Hide Others', role: 'hideothers' },
                    { label: 'Show All', role: 'unhide' },
                    { type: 'separator' },
                    { label: 'Quit Article Saver', role: 'quit' }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectall' }
                ]
            }
        ]
        Menu.setApplicationMenu(Menu.buildFromTemplate(template))
    } else {
        // Remove menu bar completely on non-macOS (prevents F12 menu option)
        mainWindow.setMenuBarVisibility(false)
        mainWindow.setMenu(null)
    }

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        // Load from live Vite dev server for proper environment variables
        mainWindow.loadURL('http://localhost:19858')
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()

        // Add keyboard shortcut for dev tools (F12 or Cmd+Option+I) in development only
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.on('before-input-event', (event, input) => {
                // F12 or Cmd+Option+I to open dev tools
                if (input.key === 'F12' || 
                    (input.meta && input.alt && input.key.toLowerCase() === 'i')) {
                    mainWindow.webContents.toggleDevTools()
                }
            })
        } else {
            // Enterprise security: Completely prevent dev tools in production
            preventDevTools()
        }
    })

    function preventDevTools() {
        // Override ALL dev tools methods
        mainWindow.webContents.openDevTools = () => false
        mainWindow.webContents.closeDevTools = () => false
        mainWindow.webContents.toggleDevTools = () => false
        mainWindow.webContents.isDevToolsOpened = () => false


        // Completely prevent dev tools from opening
        mainWindow.webContents.on('devtools-opened', () => {
            mainWindow.webContents.closeDevTools()
        })

        // Block all keyboard shortcuts that open dev tools
        mainWindow.webContents.on('before-input-event', (event, input) => {
            // Block F12, Cmd+Option+I, Ctrl+Shift+I, Cmd+Option+J, Cmd+Shift+C
            if (input.key === 'F12' ||
                (input.meta && input.alt && (input.key === 'i' || input.key === 'I' || input.key === 'j' || input.key === 'J')) ||
                (input.control && input.shift && (input.key === 'I' || input.key === 'i' || input.key === 'J' || input.key === 'j' || input.key === 'C' || input.key === 'c')) ||
                (input.meta && input.shift && (input.key === 'C' || input.key === 'c'))) {
                event.preventDefault()
            }
        })

        // Block context menu completely
        mainWindow.webContents.on('context-menu', (event) => {
            event.preventDefault()
        })

        // Block new window creation that might open dev tools
        mainWindow.webContents.setWindowOpenHandler(() => {
            return { action: 'deny' }
        })
    }
}

// WebAuthn/Passkey functionality has been removed to fix development server issues
// The protocol interception was causing ERR_FAILED errors with Vite dev server

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    app.whenReady().then(async () => {
        // BULLETPROOF FAILSAFE: Never setup WebAuthn protocol fix in development
        // This approach doesn't rely on environment variables which may not propagate correctly

        // Check multiple indicators that we're in development mode
        const isPackaged = app.isPackaged
        const hasElectronInPath = process.execPath.includes('electron')
        const isDefaultApp = !!process.defaultApp

        // Ultimate failsafe: if ANY development indicator is true, skip protocol interception
        const isDevelopmentMode = !isPackaged || hasElectronInPath || isDefaultApp

        // WebAuthn/Passkey functionality has been completely removed

        // Initialize database first
        databaseService = new DatabaseService()
        await databaseService.initialize()
        articleService = new ArticleService(databaseService)

        // Register IPC handlers before creating window
        setupIpcHandlers()

        createWindow()

        // Focus window when app is activated
        app.on('open-url', (event, url) => {
            event.preventDefault()
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore()
                mainWindow.focus()
            }
        })

        // Handle second instance (focus existing window)
        app.on('second-instance', (event, commandLine) => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore()
                mainWindow.focus()
            }
        })

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

    // Setup IPC handlers
    function setupIpcHandlers() {
        // IPC handlers
        ipcMain.handle('save-article', async (_, url: string, tags?: string[]) => {
            try {
                const article = await articleService.saveArticle(url, tags)
                return { success: true, data: article }
            } catch (error) {
                console.error('Error saving article:', error)
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            }
        })

        ipcMain.handle('get-articles', async (_, options?: { limit?: number; offset?: number }) => {
            try {
                const articles = await articleService.getArticles(options)
                return { success: true, data: articles }
            } catch (error) {
                console.error('Error getting articles:', error)
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            }
        })

        ipcMain.handle('get-article', async (_, id: string) => {
            try {
                const article = await articleService.getArticle(id)
                return { success: true, data: article }
            } catch (error) {
                console.error('Error getting article:', error)
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            }
        })

        ipcMain.handle('update-article', async (_, id: string, updates: any) => {
            try {
                const article = await articleService.updateArticle(id, updates)
                return { success: true, data: article }
            } catch (error) {
                console.error('Error updating article:', error)
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            }
        })

        ipcMain.handle('delete-article', async (_, id: string) => {
            try {
                await articleService.deleteArticle(id)
                return { success: true }
            } catch (error) {
                console.error('Error deleting article:', error)
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            }
        })

        ipcMain.handle('search-articles', async (_, query: string) => {
            try {
                const articles = await articleService.searchArticles(query)
                return { success: true, data: articles }
            } catch (error) {
                console.error('Error searching articles:', error)
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            }
        })

        // OAuth URL opening handler
        ipcMain.handle('open-oauth-url', async (_, url: string) => {
            try {
                await shell.openExternal(url)
                return { success: true }
            } catch (error) {
                console.error('Error opening OAuth URL:', error)
                return { success: false, error: error instanceof Error ? error.message : 'Failed to open browser' }
            }
        })

        // Create OAuth server handler
        ipcMain.handle('create-oauth-server', async () => {
            try {
                const { server, port } = await createOAuthServer()
                return { success: true, data: { port } }
            } catch (error) {
                console.error('Error creating OAuth server:', error)
                return { success: false, error: error instanceof Error ? error.message : 'Failed to create OAuth server' }
            }
        })

        // Smart fetch handler - uses regular fetch for localhost HTTP, net.fetch for others
        ipcMain.handle('net-fetch', async (_, url: string, options?: any) => {
            try {
                // For localhost HTTP requests, use regular fetch to avoid SSL issues
                if (url.startsWith('http://localhost:')) {
                    const response = await fetch(url, options)
                    const data = await response.json()
                    
                    // Check if response is successful (2xx status codes)
                    if (response.ok) {
                        return {
                            success: true,
                            data,
                            status: response.status,
                            statusText: response.statusText
                        }
                    } else {
                        // Handle error responses (4xx, 5xx)
                        return {
                            success: false,
                            error: data?.error?.message || data?.message || `${response.status} ${response.statusText}`,
                            status: response.status,
                            statusText: response.statusText,
                            data // Include data for additional error details
                        }
                    }
                } else {
                    // For other requests, use Electron's net.fetch with bypass
                    const { net } = require('electron')
                    const response = await net.fetch(url, {
                        ...options,
                        bypassCustomProtocolHandlers: true
                    })
                    const data = await response.json()
                    
                    // Check if response is successful (2xx status codes)
                    if (response.ok) {
                        return {
                            success: true,
                            data,
                            status: response.status,
                            statusText: response.statusText
                        }
                    } else {
                        // Handle error responses (4xx, 5xx)
                        return {
                            success: false,
                            error: data?.error?.message || data?.message || `${response.status} ${response.statusText}`,
                            status: response.status,
                            statusText: response.statusText,
                            data // Include data for additional error details
                        }
                    }
                }
            } catch (error) {
                console.error('Net fetch error:', error)
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Network request failed'
                }
            }
        })

    }

    // Cleanup on app quit
    app.on('before-quit', async () => {
        if (databaseService) {
            await databaseService.close()
        }
    })
}
