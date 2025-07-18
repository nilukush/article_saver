import { app, BrowserWindow, ipcMain, shell, Menu, globalShortcut, net, MenuItemConstructorOptions, IpcMainInvokeEvent, IpcMainEvent } from 'electron'
import path from 'path'
import http from 'http'
import url from 'url'
import { DatabaseService } from './database/database'
import { ArticleService } from './services/articleService'
import { logger } from './utils/logger'
import { updateElectronApp } from 'update-electron-app'

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
                
                // Log all OAuth callback parameters
                logger.oauth('OAuth callback received', {
                    provider,
                    hasCode: !!code,
                    hasToken: !!token,
                    hasEmail: !!email,
                    hasError: !!error,
                    action,
                    existingProvider,
                    hasLinkingToken: !!linkingToken,
                    requiresVerification: url.searchParams.get('requiresVerification'),
                    fullUrl: url.href,
                    allParams: Object.fromEntries(url.searchParams.entries())
                })

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


                // Log OAuth callback processing
                logger.oauth('Processing OAuth callback', { mainWindowExists: !!mainWindow });
                
                // Send result to main window
                if (mainWindow) {
                    if (error) {
                        logger.error('OAuth error occurred', { provider, error })
                        mainWindow.webContents.send('oauth-error', { provider, error })
                    } else if ((action === 'link_account' || action === 'verify_existing_link') && linkingToken) {
                        logger.oauth('Account linking action detected', {
                            action,
                            provider,
                            existingProvider,
                            hasLinkingToken: !!linkingToken,
                            willSendOAuthSuccess: !!(token && email),
                            willSendAccountLinking: true
                        })
                        // If we also have a token, save it first
                        if (token && email) {
                            mainWindow.webContents.send('oauth-success', { 
                                provider, 
                                token, 
                                email, 
                                action,
                                existingProvider,
                                linkingToken,
                                trustLevel: url.searchParams.get('trustLevel'),
                                requiresVerification: url.searchParams.get('requiresVerification')
                            })
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
                        logger.oauth('OAuth success', { provider, hasToken: !!token, hasEmail: !!email })
                        mainWindow.webContents.send('oauth-success', { provider, token, email })
                    } else if (code) {
                        logger.oauth('OAuth callback with code', { provider, hasCode: !!code })
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
                            let responseData = ''
                            response.on('data', (chunk) => {
                                responseData += chunk
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
                                        logger.error('Missing Pocket credentials in redirect')
                                        mainWindow.webContents.send('oauth-error', {
                                            provider: 'pocket',
                                            error: 'Missing credentials in OAuth redirect'
                                        })
                                    }
                                } else {
                                    logger.error('Pocket token exchange failed', { statusCode: response.statusCode })
                                    mainWindow.webContents.send('oauth-error', {
                                        provider: 'pocket',
                                        error: `Token exchange failed: ${response.statusCode}`
                                    })
                                }
                            })
                        })

                        req.on('error', (error: any) => {
                            logger.error('OAuth HTTP request error', { error: error.message })
                            mainWindow.webContents.send('oauth-error', {
                                provider: 'pocket',
                                error: `Network error during token exchange: ${error.message}`
                            })
                        })

                        req.on('timeout', () => {
                            logger.error('OAuth HTTP request timeout')
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

// Setup IPC handlers
function setupIpcHandlers() {
    // IPC handlers
    ipcMain.handle('save-article', async (_event: IpcMainInvokeEvent, url: string, tags?: string[]) => {
        try {
            const article = await articleService.saveArticle(url, tags)
            return { success: true, data: article }
        } catch (error) {
            logger.error('Error saving article', { error: error instanceof Error ? error.message : 'Unknown error' })
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })

    ipcMain.handle('get-articles', async (_event: IpcMainInvokeEvent, options?: { limit?: number; offset?: number }) => {
        try {
            const articles = await articleService.getArticles(options)
            return { success: true, data: articles }
        } catch (error) {
            logger.error('Error getting articles', { error: error instanceof Error ? error.message : 'Unknown error' })
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })

    ipcMain.handle('get-article', async (_event: IpcMainInvokeEvent, id: string) => {
        try {
            const article = await articleService.getArticle(id)
            return { success: true, data: article }
        } catch (error) {
            logger.error('Error getting article', { error: error instanceof Error ? error.message : 'Unknown error' })
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })

    ipcMain.handle('update-article', async (_event: IpcMainInvokeEvent, id: string, updates: { isRead?: boolean; isArchived?: boolean; tags?: string[] }) => {
        try {
            const article = await articleService.updateArticle(id, updates)
            return { success: true, data: article }
        } catch (error) {
            logger.error('Error updating article', { error: error instanceof Error ? error.message : 'Unknown error' })
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })

    ipcMain.handle('delete-article', async (_event: IpcMainInvokeEvent, id: string) => {
        try {
            await articleService.deleteArticle(id)
            return { success: true }
        } catch (error) {
            logger.error('Error deleting article', { error: error instanceof Error ? error.message : 'Unknown error' })
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })

    ipcMain.handle('search-articles', async (_event: IpcMainInvokeEvent, query: string) => {
        try {
            const articles = await articleService.searchArticles(query)
            return { success: true, data: articles }
        } catch (error) {
            logger.error('Error searching articles', { error: error instanceof Error ? error.message : 'Unknown error' })
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })

    // OAuth URL opening handler
    ipcMain.handle('open-oauth-url', async (_event: IpcMainInvokeEvent, url: string) => {
        try {
            await shell.openExternal(url)
            return { success: true }
        } catch (error) {
            logger.error('Error opening OAuth URL', { error: error instanceof Error ? error.message : 'Unknown error' })
            return { success: false, error: error instanceof Error ? error.message : 'Failed to open browser' }
        }
    })

    // Create OAuth server handler
    ipcMain.handle('create-oauth-server', async () => {
        try {
            const { port } = await createOAuthServer()
            return { success: true, data: { port } }
        } catch (error) {
            logger.error('Error creating OAuth server', { error: error instanceof Error ? error.message : 'Unknown error' })
            return { success: false, error: error instanceof Error ? error.message : 'Failed to create OAuth server' }
        }
    })

    // Smart fetch handler - uses regular fetch for localhost HTTP, net.fetch for others
    ipcMain.handle('net-fetch', async (_event: IpcMainInvokeEvent, url: string, options?: RequestInit) => {
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
                // net already imported at the top
                const response = await net.fetch(url, {
                    ...options,
                    bypassCustomProtocolHandlers: true
                } as any)
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
            logger.error('Net fetch error', { error: error instanceof Error ? error.message : 'Unknown error' })
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network request failed'
            }
        }
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
            devTools: true, // Temporarily enable for debugging
            allowRunningInsecureContent: false,
            webSecurity: true,
            enableWebSQL: false
        },
        titleBarStyle: 'hiddenInset',
        show: false,
    })

    // Set app-specific menu for proper naming on macOS
    if (process.platform === 'darwin') {
        // Menu already imported at the top
        const template: MenuItemConstructorOptions[] = [
            {
                label: 'Article Saver', // This fixes the menu bar name issue
                submenu: [
                    { label: 'About Article Saver', role: 'about' },
                    { type: 'separator' },
                    { label: 'Hide Article Saver', role: 'hide' },
                    { label: 'Hide Others', role: 'hideOthers' },
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
                    { role: 'selectAll' }
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
        // Load the index.html file for production
        // Handle different path structures for packaged vs unpackaged builds
        let indexPath: string
        
        if (app.isPackaged) {
            // When packaged in asar, the structure is different
            // app.getAppPath() returns the path to the asar file or the app directory
            indexPath = path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')
        } else {
            // When running from dist folder (npm start after build)
            // The main.js is at dist/main/desktop/src/main/main.js
            // The renderer files are at dist/renderer/
            indexPath = path.join(__dirname, '../../../../../renderer/index.html')
        }
        
        logger.info('Loading production app from:', { 
            indexPath,
            __dirname,
            isPackaged: app.isPackaged,
            appPath: app.getAppPath(),
            resolved: path.resolve(indexPath)
        })
        
        // Use loadFile for better path resolution in production
        mainWindow.loadFile(indexPath).catch((err) => {
            logger.error('Failed to load index.html:', err)
            // Try alternative path if first attempt fails
            const altIndexPath = path.join(process.resourcesPath, 'app', 'dist', 'renderer', 'index.html')
            logger.info('Trying alternative path:', { altIndexPath })
            
            return mainWindow.loadFile(altIndexPath).catch((err2) => {
                logger.error('Failed with alternative path:', err2)
                // Final fallback to file:// URL
                const fileUrl = url.format({
                    pathname: indexPath,
                    protocol: 'file:',
                    slashes: true
                })
                logger.info('Trying fallback URL:', { fileUrl })
                return mainWindow.loadURL(fileUrl)
            })
        })
    }

    // Add error handling for page load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        logger.error('Failed to load page', { 
            errorCode, 
            errorDescription, 
            validatedURL,
            isDevelopment: process.env.NODE_ENV === 'development'
        })
    })

    // Log console messages from renderer for debugging
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        // Log all messages in production for debugging blank screen
        logger.info('Renderer console:', { level, message, line, sourceId })
    })
    
    // Add DOM ready event to check if content loaded
    mainWindow.webContents.on('dom-ready', () => {
        logger.info('DOM ready event fired')
        
        // Inject debugging code to check if React app mounted
        mainWindow.webContents.executeJavaScript(`
            console.log('Page loaded, checking for React app...');
            const root = document.getElementById('root');
            console.log('Root element:', root);
            console.log('Root element children:', root ? root.children.length : 'no root');
            console.log('Document body:', document.body.innerHTML.substring(0, 200));
        `).catch(err => logger.error('Failed to execute debug script:', err))
    })

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()

        // Add keyboard shortcut for dev tools (F12 or Cmd+Option+I) in development only
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.on('before-input-event', (event: Electron.Event, input: Electron.Input) => {
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
        mainWindow.webContents.on('before-input-event', (event: Electron.Event, input: Electron.Input) => {
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

        // WebAuthn/Passkey functionality has been completely removed

        // Configure auto-updates for production builds
        if (isPackaged) {
            updateElectronApp({
                repo: 'nilukush/article_saver',
                updateInterval: '1 hour'
            })
        }

        // Initialize database first
        databaseService = new DatabaseService()
        await databaseService.initialize()
        articleService = new ArticleService(databaseService)

        // Register IPC handlers before creating window
        setupIpcHandlers()

        createWindow()
        
        // Enable keyboard shortcuts for developer tools in development
        if (!app.isPackaged) {
            // globalShortcut already imported at the top
            
            // F12 to toggle DevTools
            globalShortcut.register('F12', () => {
                if (mainWindow && mainWindow.webContents) {
                    mainWindow.webContents.toggleDevTools()
                }
            })
            
            // Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows/Linux)
            globalShortcut.register('CommandOrControl+Shift+I', () => {
                if (mainWindow && mainWindow.webContents) {
                    mainWindow.webContents.toggleDevTools()
                }
            })
            
            // Open DevTools automatically in development
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.openDevTools()
            }
        }

        // Focus window when app is activated
        app.on('open-url', (event: Electron.Event, _url: string) => {
            event.preventDefault()
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore()
                mainWindow.focus()
            }
        })

        // Handle second instance (focus existing window)
        app.on('second-instance', (_event: Electron.Event, _commandLine: string[]) => {
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

    // Function has been moved to program root

    // Cleanup on app quit
    app.on('before-quit', async () => {
        if (databaseService) {
            await databaseService.close()
        }
    })
}
