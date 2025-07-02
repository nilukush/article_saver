import { useState, useEffect, useCallback } from 'react'
import { useArticleStore } from '../stores/articleStore'
import { useImportStore } from '../stores/importStore'
import { ImportStatusSection } from './ImportStatusSection'
import { AccountLinking } from './AccountLinking'
import { EnterpriseAccountLinkingPrompt } from './EnterpriseAccountLinkingPrompt'
import { logger } from '../utils/logger'
import { getApiUrl } from '../../config/production'
// Simplified imports - removed unused hooks

interface SettingsProps {
    onClose: () => void
}


export function Settings({ onClose }: SettingsProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showAccountLinking, setShowAccountLinking] = useState(false)
    const [accountLinkingData, setAccountLinkingData] = useState<{
        existingProvider: string
        linkingProvider: string
        linkingToken: string
        email: string
        trustLevel?: 'high' | 'medium' | 'low'
        requiresVerification?: boolean
    } | null>(null)
    
    // Debug: Track component lifecycle
    useEffect(() => {
        logger.ui('Settings component mounted', undefined, 'Settings')
        return () => {
            logger.ui('Settings component unmounted', undefined, 'Settings')
        }
    }, [])

    // Get stores
    const { loadArticles, loadInitialArticles, resetArticles, totalArticles, setPreventAutoLoad } = useArticleStore()
    const { startImport, activeImports, removeImport, discoverAndRecoverSessions } = useImportStore()
    
    // Check if Pocket import is currently active
    const isPocketImportActive = activeImports.some(imp => 
        imp.provider === 'pocket' && imp.status === 'running'
    )
    
    // Active import tracking removed - now handled by ImportProgressHeader
    
    // Real-time progress updates now handled by ImportProgressHeader component

    // Import status detection
    const hasImportedArticles = totalArticles > 0
    const importCount = totalArticles
    const [lastImportTime, setLastImportTime] = useState<string | null>(
        localStorage.getItem('lastPocketImport')
    )
    
    // Pocket authorization states
    const [pocketAuthorized, setPocketAuthorized] = useState(false)
    const [pocketUsername, setPocketUsername] = useState<string | null>(null)
    const [pocketLastSynced, setPocketLastSynced] = useState<Date | null>(null)
    const [checkingPocketAuth, setCheckingPocketAuth] = useState(false)
    // Removed unused state variables - simplified import flow

    // Set fallback timestamp for existing imported articles without timestamp
    useEffect(() => {
        if (hasImportedArticles && !lastImportTime) {
            // If articles exist but no timestamp, set a fallback timestamp
            const fallbackTimestamp = new Date().toISOString()
            localStorage.setItem('lastPocketImport', fallbackTimestamp)
            setLastImportTime(fallbackTimestamp)
        }
    }, [hasImportedArticles, lastImportTime])

    // Check Pocket auth and discover sessions when user logs in
    useEffect(() => {
        if (isLoggedIn) {
            checkPocketAuth()
            discoverAndRecoverSessions()
        }
    }, [isLoggedIn, discoverAndRecoverSessions])
    
    // Debug: Log active imports
    useEffect(() => {
        logger.debug('Active imports', { activeImports }, 'Import', 'Settings')
        // Clear any stuck imports that are older than 10 minutes
        const now = Date.now()
        activeImports.forEach(imp => {
            const importTime = new Date(imp.startTime).getTime()
            const age = now - importTime
            if (age > 10 * 60 * 1000 && imp.status === 'running') {
                logger.info('Clearing stuck import', { importId: imp.id }, 'Import', 'Settings')
                removeImport(imp.id)
            }
        })
    }, [activeImports.length]) // Only when count changes
    
    // Progress polling is now handled by useProgressPolling hook in ImportProgressHeader

    // Use the correct API URL based on environment
    const serverUrl = getApiUrl()

    // Check Pocket authorization status - memoized to prevent infinite loops
    const checkPocketAuth = useCallback(async () => {
        if (!isLoggedIn) return
        
        setCheckingPocketAuth(true)
        try {
            const token = localStorage.getItem('authToken')
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/pocket/auth/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            })

            if (response.success && response.data) {
                setPocketAuthorized(response.data.authorized)
                setPocketUsername(response.data.username)
                if (response.data.lastSynced) {
                    setPocketLastSynced(new Date(response.data.lastSynced))
                }
                return response.data.authorized
            } else {
                setPocketAuthorized(false)
                setPocketUsername(null)
                setPocketLastSynced(null)
                return false
            }
        } catch (error) {
            logger.error('Failed to check Pocket auth status', error, 'Auth', 'Settings')
            setPocketAuthorized(false)
            return false
        } finally {
            setCheckingPocketAuth(false)
        }
    }, [isLoggedIn, serverUrl])

    // Poll for Pocket authorization completion
    const startPocketAuthPolling = (importAfterAuth: boolean) => {
        let pollCount = 0
        const maxPolls = 60 // Poll for up to 2 minutes (60 * 2 seconds)
        
        setError('Waiting for Pocket authorization... Please complete authorization in your browser.')
        
        const pollInterval = setInterval(async () => {
            pollCount++
            
            // Update status message every 10 seconds
            if (pollCount % 5 === 0) {
                setError(`Still waiting for Pocket authorization... (${Math.floor(pollCount * 2)} seconds elapsed)`)
            }
            
            const isAuthorized = await checkPocketAuth()
            logger.debug(`Pocket poll ${pollCount} - Authorization status`, { isAuthorized }, 'Auth', 'Settings')
            
            if (isAuthorized) {
                clearInterval(pollInterval)
                setError('Pocket has been authorized successfully!')
                
                // If user wanted to import after auth, start the import
                const shouldImportFlag = localStorage.getItem('pocketImportAfterAuth') === 'true'
                if (importAfterAuth || shouldImportFlag) {
                    localStorage.removeItem('pocketImportAfterAuth')
                    setError('Starting Pocket import...')
                    setTimeout(() => {
                        handlePocketImport()
                        // Close the settings modal after 2 seconds to show import progress
                        setTimeout(() => {
                            onClose()
                        }, 2000)
                    }, 1000)
                }
            } else if (pollCount >= maxPolls) {
                clearInterval(pollInterval)
                setError('Pocket authorization timed out. Please try again.')
                localStorage.removeItem('pocketImportAfterAuth')
            }
        }, 2000) // Check every 2 seconds
    }

    // Check for Pocket authorization callback in URL
    useEffect(() => {
        if (!isLoggedIn) return

        const checkUrlForPocketAuth = () => {
            const urlParams = new URLSearchParams(window.location.search)
            const pocketAuthorizedParam = urlParams.get('pocket_authorized')
            const shouldImportFlag = localStorage.getItem('pocketImportAfterAuth') === 'true'
            
            const debugMsg = `URL: ${window.location.href}, pocket_authorized: ${pocketAuthorizedParam}, shouldImport: ${shouldImportFlag}`
            logger.debug(debugMsg, undefined, 'Auth', 'Settings')
            
            logger.debug('Pocket auth check URL', { url: window.location.href }, 'Auth', 'Settings')
            logger.debug('Pocket auth check param', { pocketAuthorizedParam }, 'Auth', 'Settings')
            logger.debug('Pocket auth check login status', { isLoggedIn }, 'Auth', 'Settings')
            logger.debug('Pocket auth check import flag', { shouldImportFlag }, 'Auth', 'Settings')
            
            if (pocketAuthorizedParam === 'true') {
                // Pocket authorization completed - refresh auth status
                setError('Pocket authorization successful! Refreshing status...')
                
                // Clean up URL parameters immediately
                window.history.replaceState({}, document.title, window.location.pathname)
                
                checkPocketAuth().then((authSuccessful) => {
                    logger.debug('Pocket auth check result', { authSuccessful }, 'Auth', 'Settings')
                    logger.debug('Pocket authorized state', { pocketAuthorized }, 'Auth', 'Settings')
                    
                    // Check the flag from localStorage since state might have been reset
                    if (shouldImportFlag) {
                        localStorage.removeItem('pocketImportAfterAuth')
                        setError('Starting Pocket import...')
                        logger.info('Starting Pocket import after auth', undefined, 'Import', 'Settings')
                        // Give a slight delay to ensure Pocket auth state is updated
                        setTimeout(() => {
                            // Check if we're actually authorized before importing
                            checkPocketAuth().then(() => {
                                handlePocketImport()
                            })
                        }, 1000)
                    } else {
                        setError('Pocket has been authorized successfully! You can now import your articles.')
                    }
                })
            }
        }

        // Check on mount
        checkUrlForPocketAuth()

        // Also check when URL changes (for SPA navigation)
        const handlePopState = () => checkUrlForPocketAuth()
        window.addEventListener('popstate', handlePopState)

        // Check periodically for a short time in case the URL changed without navigation
        let checkCount = 0
        const interval = setInterval(() => {
            checkUrlForPocketAuth()
            checkCount++
            // Stop checking after 10 seconds
            if (checkCount > 10) {
                clearInterval(interval)
            }
        }, 1000)

        return () => {
            window.removeEventListener('popstate', handlePopState)
            clearInterval(interval)
        }
    }, [isLoggedIn])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            logger.debug('Login response received', { response }, 'Auth', 'Settings')

            if (response.success) {
                const data = response.data
                localStorage.setItem('authToken', data.token)
                localStorage.setItem('serverUrl', serverUrl)
                localStorage.setItem('userEmail', data.user?.email || email)
                setIsLoggedIn(true)
                setError(null)
                // Don't close if we're expecting account linking
                if (!accountLinkingData) {
                    // Close settings modal immediately after successful login
                    onClose()
                }
            } else {
                logger.error('Authentication failed', { error: response.error }, 'Auth', 'Settings')
                setError(response.error || 'Login failed')
            }
        } catch (err) {
            logger.error('Login network error', err, 'Auth', 'Settings')
            setError(err instanceof Error ? err.message : 'Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            logger.debug('Register response received', { response }, 'Auth', 'Settings')

            if (response.success) {
                const data = response.data
                localStorage.setItem('authToken', data.token)
                localStorage.setItem('serverUrl', serverUrl)
                localStorage.setItem('userEmail', data.user?.email || email)
                setIsLoggedIn(true)
                setError(null)
                // Close settings modal immediately after successful registration
                onClose()
            } else {
                logger.error('Registration failed', { error: response.error }, 'Auth', 'Settings')
                setError(response.error || 'Registration failed')
            }
        } catch (err) {
            logger.error('Register network error', err, 'Auth', 'Settings')
            setError(err instanceof Error ? err.message : 'Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }

    const handleExtractContent = async () => {
        setLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem('authToken')
            logger.info('Starting fix for articles with limited content', undefined, 'Maintenance', 'Settings')
            
            // First, use the new fix endpoint to mark limited content articles
            const fixResponse = await window.electronAPI.netFetch(`${serverUrl}/api/articles/fix/limited-content`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            })
            
            logger.info('Fix limited content response', { response: fixResponse }, 'Maintenance', 'Settings')

            if (fixResponse && fixResponse.success) {
                const data = fixResponse.data
                if (data && data.fixed > 0) {
                    setError(`✅ Fixed ${data.fixed} articles with limited content! Content extraction started in background.`)
                    
                    // Wait a moment for extraction to start
                    setTimeout(async () => {
                        await loadArticles()
                    }, 2000)
                } else {
                    setError('✅ No articles with limited content found. All articles are properly configured.')
                    await loadArticles()
                }
            } else {
                setError(fixResponse?.error || 'Failed to fix limited content articles')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fix limited content')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteAllArticles = async (scope: 'current' | 'all-linked' = 'current') => {
        // Check if user has linked accounts
        const checkResponse = await window.electronAPI.netFetch(`${serverUrl}/api/articles/bulk/all?scope=current`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
            body: JSON.stringify({ dryRun: true }) // Just check, don't delete
        })
        
        const hasLinkedAccounts = checkResponse.data?.linkedAccountsInfo?.hasLinkedAccounts || false
        const articlesInLinked = checkResponse.data?.linkedAccountsInfo?.articlesInLinkedAccounts || 0
        
        // Show appropriate confirmation based on context
        if (hasLinkedAccounts && articlesInLinked > 0 && scope === 'current') {
            const choice = confirm(
                `You have ${totalArticles} articles in this account and ${articlesInLinked} articles in linked accounts.\n\n` +
                `Delete from:\n` +
                `• This account only (${totalArticles} articles)\n` +
                `• All linked accounts (${totalArticles + articlesInLinked} articles)\n\n` +
                `Click OK to delete from this account only, or Cancel to choose a different option.`
            )
            
            if (!choice) {
                // Show options for linked account deletion
                const deleteAll = confirm(
                    `Would you like to delete articles from ALL linked accounts?\n\n` +
                    `This will permanently delete ${totalArticles + articlesInLinked} articles across all your linked accounts.`
                )
                
                if (deleteAll) {
                    return handleDeleteAllArticles('all-linked')
                }
                return // User cancelled
            }
        } else if (scope === 'all-linked') {
            if (!confirm(
                `⚠️ WARNING: Delete from ALL linked accounts?\n\n` +
                `This will permanently delete articles from ALL your linked accounts.\n` +
                `This action cannot be undone.\n\n` +
                `Are you absolutely sure?`
            )) {
                return
            }
        } else {
            if (!confirm(`Are you sure you want to delete all ${totalArticles} articles? This cannot be undone.`)) {
                return
            }
        }

        setLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem('authToken')
            const url = `${serverUrl}/api/articles/bulk/all?scope=${scope}`
            
            // Generate confirmation token for cross-account deletion
            const confirmationToken = scope === 'all-linked' ? 
                btoa(Date.now() + ':' + Math.random()) : undefined
            
            const response = await window.electronAPI.netFetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ confirmationToken })
            })

            if (response.success) {
                const data = response.data
                logger.info('Delete all articles response', { data }, 'Maintenance', 'Settings')
                
                const message = scope === 'all-linked'
                    ? `✅ Deleted ${data.deletedCount} articles from all linked accounts!`
                    : `✅ Deleted ${data.deletedCount} articles from current account!`
                    
                if (data.linkedAccountsInfo?.articlesInLinkedAccounts > 0) {
                    setError(message + `\n\n${data.linkedAccountsInfo.articlesInLinkedAccounts} articles remain in linked accounts.`)
                } else {
                    setError(message)
                }
                
                // Clear import timestamp since we deleted everything
                localStorage.removeItem('lastPocketImport')
                setLastImportTime(null)
                
                // Prevent auto-loading for a short time to avoid race conditions
                logger.debug('Setting preventAutoLoad flag', undefined, 'Maintenance', 'Settings')
                setPreventAutoLoad(true)
                
                // Reset and reload articles to show empty state
                logger.debug('Resetting article store', undefined, 'Maintenance', 'Settings')
                resetArticles()
                
                // Clear the prevent flag after a longer delay to ensure UI stability
                // This prevents any race conditions with component mounting/unmounting
                setTimeout(() => {
                    logger.debug('Clearing preventAutoLoad flag', undefined, 'Maintenance', 'Settings')
                    setPreventAutoLoad(false)
                }, 5000) // Increased to 5 seconds for safety
                
                // Close modal after 3 seconds to allow reading the message
                setTimeout(() => {
                    onClose()
                }, 3000)
            } else {
                setError(response.error || 'Failed to delete articles')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete articles')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        // Clear all auth-related items from localStorage
        localStorage.removeItem('authToken')
        localStorage.removeItem('serverUrl')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('lastPocketImport')
        localStorage.removeItem('pocketToken')
        
        // Reset component state
        setIsLoggedIn(false)
        setEmail('')
        setPassword('')
        setLastImportTime(null)
        
        // Clear articles from store
        const { resetArticles } = useArticleStore.getState()
        resetArticles()
        
        // Close settings modal after logout
        setTimeout(() => {
            onClose()
        }, 100)
    }

    const handleGoogleLogin = async () => {
        setLoading(true)
        setError(null)

        try {
            // Create OAuth server first
            const serverResult = await window.electronAPI.createOAuthServer()
            if (!serverResult.success) {
                throw new Error(serverResult.error || 'Failed to create OAuth server')
            }

            const port = serverResult.data?.port
            if (!port) {
                throw new Error('Failed to get OAuth server port')
            }

            // Get Google OAuth URL from backend with server port using Electron's net module
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/auth/google/url?port=${port}`)

            if (!response.success) {
                throw new Error(response.error || 'Failed to get OAuth URL')
            }

            const data = response.data

            // Open OAuth URL in system browser
            const result = await window.electronAPI.openOAuthUrl(data.url)
            if (!result.success) {
                throw new Error(result.error || 'Failed to open OAuth URL')
            }

            // OAuth callback will be handled by the localhost server
        } catch (err) {
            logger.error('Google login error', err, 'OAuth', 'Settings')
            setError(err instanceof Error ? err.message : 'Google login failed')
            setLoading(false)
        }
    }

    const handleGitHubLogin = async () => {
        setLoading(true)
        setError(null)

        try {
            // Create OAuth server first
            const serverResult = await window.electronAPI.createOAuthServer()
            if (!serverResult.success) {
                throw new Error(serverResult.error || 'Failed to create OAuth server')
            }

            const port = serverResult.data?.port
            if (!port) {
                throw new Error('Failed to get OAuth server port')
            }

            // Get GitHub OAuth URL from backend with server port using Electron's net module
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/auth/github/url?port=${port}`)

            if (!response.success) {
                throw new Error(response.error || 'Failed to get OAuth URL')
            }

            const data = response.data

            // Open OAuth URL in system browser
            const result = await window.electronAPI.openOAuthUrl(data.url)
            if (!result.success) {
                throw new Error(result.error || 'Failed to open OAuth URL')
            }

            // OAuth callback will be handled by the localhost server
        } catch (err) {
            logger.error('GitHub login error', err, 'OAuth', 'Settings')
            setError(err instanceof Error ? err.message : 'GitHub login failed')
            setLoading(false)
        }
    }

    // Handle Pocket authorization
    const handlePocketAuthorize = async (importAfterAuth = false) => {
        setLoading(true)
        setError(null)
        
        // Persist the flag to localStorage
        if (importAfterAuth) {
            localStorage.setItem('pocketImportAfterAuth', 'true')
        } else {
            localStorage.removeItem('pocketImportAfterAuth')
        }

        try {
            const token = localStorage.getItem('authToken')
            
            // Create OAuth server first (same pattern as Google/GitHub)
            const serverResult = await window.electronAPI.createOAuthServer()
            if (!serverResult.success) {
                throw new Error(serverResult.error || 'Failed to create OAuth server')
            }

            const port = serverResult.data?.port
            if (!port) {
                throw new Error('Failed to get OAuth server port')
            }

            // Get Pocket OAuth URL from backend with server port
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/pocket/auth/url?port=${port}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            logger.debug('Pocket auth URL response', { response }, 'OAuth', 'Settings')
            
            if (response.success) {
                const data = response.data
                // Open OAuth URL in system browser using Electron IPC
                await window.electronAPI.openOAuthUrl(data.url)
                setError('Please authorize Pocket access in your browser. The app will automatically detect when you complete authorization.')
                
                // Start polling for authorization completion
                startPocketAuthPolling(importAfterAuth)
            } else {
                setError(response.error || 'Failed to get Pocket authorization URL')
            }
        } catch (err) {
            logger.error('Pocket authorization error', err, 'OAuth', 'Settings')
            setError(err instanceof Error ? err.message : 'Failed to connect to Pocket')
        } finally {
            setLoading(false)
        }
    }

    // Handle Pocket import using stored authorization - memoized
    const handlePocketImport = useCallback(async () => {
        logger.info('Starting Pocket import process', undefined, 'Import', 'Settings')
        setLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem('authToken')
            logger.debug('Pocket import token check', { hasToken: !!token }, 'Import', 'Settings')
            
            // Verify Pocket authorization
            logger.debug('Checking Pocket authorization', undefined, 'Import', 'Settings')
            const isAuthorized = await checkPocketAuth()
            logger.info('Pocket authorization status', { isAuthorized }, 'Import', 'Settings')
            
            if (!isAuthorized) {
                logger.warn('Pocket not authorized, stopping import', undefined, 'Import', 'Settings')
                setError('Please authorize Pocket access first')
                setLoading(false)
                return
            }

            // Start import with backend
            logger.info('Making Pocket import request to backend', undefined, 'Import', 'Settings')
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/pocket/import/stored`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    batchSize: 100,
                    includeArchived: true
                }),
            })
            
            logger.debug('Pocket import backend response', { response }, 'Import', 'Settings')

            if (response.success) {
                const data = response.data
                logger.debug('Pocket import response data', { data }, 'Import', 'Settings')
                logger.debug('Pocket import session ID', { sessionId: data?.sessionId }, 'Import', 'Settings')
                
                setError(`Import started successfully! Session ID: ${data.sessionId}`)
                
                // Create import job in store with session tracking
                const userId = localStorage.getItem('userEmail') || 'unknown'
                logger.info('Creating import job', { sessionId: data.sessionId }, 'Import', 'Settings')
                
                const importJobId = startImport({
                    sessionId: data.sessionId,
                    userId,
                    provider: 'pocket',
                    status: 'running',
                    progress: {
                        total: 0,
                        current: 0,
                        percentage: 0,
                        currentAction: 'Import started using stored authorization...',
                        timeRemaining: 0
                    }
                })
                
                logger.info('Import job created', { importJobId }, 'Import', 'Settings')
                
                // Update last import time
                const importTimestamp = new Date().toISOString()
                localStorage.setItem('lastPocketImport', importTimestamp)
                setLastImportTime(importTimestamp)
                
                // Close modal after 1.5 seconds so user can see the import progress
                setTimeout(() => {
                    onClose()
                }, 1500)
            } else {
                setError(response.error || 'Failed to start import')
            }
        } catch (err) {
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }, [checkPocketAuth, startImport, loadArticles, serverUrl])

    // Handle revoking Pocket authorization
    const handlePocketRevoke = async () => {
        setLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem('authToken')
            
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/pocket/auth/revoke`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })

            if (response.success) {
                setPocketAuthorized(false)
                setPocketUsername(null)
                setPocketLastSynced(null)
                setError('Pocket authorization has been revoked')
            } else {
                setError(response.error || 'Failed to revoke authorization')
            }
        } catch (err) {
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }

    // Initialize authentication state
    useEffect(() => {
        const token = localStorage.getItem('authToken')
        if (token) {
            setIsLoggedIn(true)
            // Initial setup - stale import clearing now handled by new progress system
        }
    }, []) // Only run on mount
    
    // Force update mechanism removed - using new progress tracking system
    
    // Legacy polling mechanism removed - progress tracking now handled by ImportProgressHeader

    // OAuth event listeners - separate effect to avoid nesting
    useEffect(() => {
        logger.debug('Setting up OAuth event listeners', undefined, 'OAuth', 'Settings')
        
        // Define OAuth success handler
        const handleOAuthSuccess = async (data: { 
            provider: string; 
            token: string; 
            email: string;
            pocket_authorized?: boolean;
            action?: string;
            existingProvider?: string;
            linkingToken?: string;
            trustLevel?: string;
            requiresVerification?: string;
        }) => {
                logger.info('OAuth success event received', {
                    ...data,
                    hasAction: !!data.action,
                    hasLinkingToken: !!data.linkingToken,
                    requiresVerification: data.requiresVerification
                }, 'OAuth', 'Settings')
                
                // Check if this is an account linking response
                if (data.action === 'link_account' || data.action === 'verify_existing_link') {
                    logger.info('Account linking detected in OAuth success', { 
                        action: data.action,
                        existingProvider: data.existingProvider,
                        linkingProvider: data.provider,
                        hasLinkingToken: !!data.linkingToken,
                        trustLevel: data.trustLevel,
                        requiresVerification: data.requiresVerification
                    }, 'OAuth', 'Settings')
                    setLoading(false)
                    
                    // Set auth token first so user is authenticated
                    localStorage.setItem('authToken', data.token)
                    localStorage.setItem('userEmail', data.email)
                    setIsLoggedIn(true)
                    
                    // Trigger account linking flow
                    const linkingData = {
                        existingProvider: data.existingProvider || 'unknown',
                        linkingProvider: data.provider,
                        linkingToken: data.linkingToken || '',
                        email: data.email,
                        trustLevel: data.trustLevel as 'high' | 'medium' | 'low' | undefined,
                        requiresVerification: data.requiresVerification === 'true'
                    }
                    logger.debug('Setting account linking data state', { linkingData }, 'OAuth', 'Settings')
                    setAccountLinkingData(linkingData)
                    logger.debug('Account linking data state set', { linkingData }, 'OAuth', 'Settings')
                    
                    // CRITICAL: Store in window for debugging
                    ;(window as any).debugAccountLinkingData = linkingData
                    logger.debug('Account linking data stored in window debug', undefined, 'OAuth', 'Settings')
                    
                    // Force a re-render by using setTimeout
                    setTimeout(() => {
                        logger.debug('Checking account linking state after timeout', { 
                            accountLinkingData, 
                            windowData: (window as any).debugAccountLinkingData 
                        }, 'OAuth', 'Settings')
                    }, 100)
                    return
                }
                
                if (data.provider === 'pocket') {
                    // OAuth completed successfully - refresh auth status
                    setError('Pocket authorization successful! Refreshing status...')
                    await checkPocketAuth()
                    setError('Pocket has been authorized successfully! You can now import your articles.')
                } else {
                    // For Google/GitHub, handle normal login
                    localStorage.setItem('authToken', data.token)
                    localStorage.setItem('userEmail', data.email)
                    setIsLoggedIn(true)
                    setError(`Successfully logged in with ${data.provider}!`)
                    setLoading(false)
                    
                    // ENTERPRISE UX: Close modal after successful OAuth login
                    // BUT NOT if we're handling account linking
                    if (!data.action) {
                        setTimeout(() => {
                            onClose()
                        }, 1500) // Brief delay to show success message
                    }
                    // Don't close modal if we're expecting account linking
                    // The linking prompt will handle closing
                }
            }
        
        // Register OAuth success handler
        if (window.electronAPI?.onOAuthSuccess) {
            window.electronAPI.onOAuthSuccess(handleOAuthSuccess)
        }

        // Register OAuth error handler
        if (window.electronAPI?.onOAuthError) {
            window.electronAPI.onOAuthError((data: { provider: string; error: string }) => {
                setError(`${data.provider} login failed: ${data.error}`)
                setLoading(false)
            })
        }

        // Listen for account linking events
        if (window.electronAPI?.onOAuthAccountLinking) {
            window.electronAPI.onOAuthAccountLinking((data: { 
                provider: string; 
                existingProvider: string; 
                linkingToken: string; 
                email: string; 
                action: string;
                token?: string;
                trustLevel?: string;
                requiresVerification?: string;
            }) => {
                setLoading(false)
                
                // If we have a token, save it first so user is authenticated
                if (data.token) {
                    localStorage.setItem('authToken', data.token)
                    localStorage.setItem('userEmail', data.email)
                    setIsLoggedIn(true)
                }
                
                const linkingData = {
                    existingProvider: data.existingProvider,
                    linkingProvider: data.provider,
                    linkingToken: data.linkingToken,
                    email: data.email,
                    trustLevel: data.trustLevel as 'high' | 'medium' | 'low' | undefined,
                    requiresVerification: data.requiresVerification === 'true'
                }
                setAccountLinkingData(linkingData)
            })
        }

        // Cleanup listeners on unmount
        return () => {
            if (window.electronAPI?.removeOAuthListeners) {
                window.electronAPI.removeOAuthListeners()
            }
        }
    }, [checkPocketAuth, onClose]) // Include dependencies

    // Debug logging for account linking state changes
    useEffect(() => {
        logger.debug('Account linking state changed', {
            hasAccountLinkingData: !!accountLinkingData,
            accountLinkingData
        }, 'OAuth', 'Settings')
    }, [accountLinkingData])
    
    // Debug logging for account linking state
    logger.debug('Settings render - account linking state', {
        hasAccountLinkingData: !!accountLinkingData,
        accountLinkingData
    }, 'UI', 'Settings')

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Account
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className={`mb-4 p-3 rounded ${error.includes('successfully') || error.includes('🎉') || error.includes('Import started')
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                        {error}
                    </div>
                )}
                
                {/* Debug info - only show when logged in */}
                {isLoggedIn && (
                    <div className="mb-2 text-xs text-gray-500">
                        Active imports: {activeImports.length}
                    </div>
                )}
                
                {/* Debug: Clear stuck imports button - only show when logged in */}
                {isLoggedIn && activeImports.length > 0 && (
                    <button
                        onClick={() => {
                            activeImports.forEach(imp => {
                                removeImport(imp.id)
                            })
                            // Also clear localStorage
                            localStorage.removeItem('import-store')
                            // Force reload to clear everything
                            setTimeout(() => {
                                window.location.reload()
                            }, 500)
                        }}
                        className="mb-4 text-xs text-red-600 hover:text-red-700 underline"
                    >
                        Clear {activeImports.length} stuck import(s)
                    </button>
                )}
                

                {!isLoggedIn ? (
                    <div className="space-y-4">
                        {/* Social Login Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                            >
                                <span>🔍</span>
                                <span>{loading ? 'Connecting...' : 'Login with Google'}</span>
                            </button>

                            <button
                                onClick={handleGitHubLogin}
                                disabled={loading}
                                className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center space-x-2"
                            >
                                <span>⚡</span>
                                <span>{loading ? 'Connecting...' : 'Login with GitHub'}</span>
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
                            </div>
                        </div>

                        {/* Email/Password Form */}
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Logging in...' : 'Login'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRegister}
                                    disabled={loading}
                                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading ? 'Registering...' : 'Register'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* User Info */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Account
                            </div>
                            <div className="text-gray-900 dark:text-white font-medium">
                                {localStorage.getItem('userEmail') || 'Unknown User'}
                            </div>
                        </div>

                        {/* Pocket Authorization Status */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Pocket Integration
                            </div>
                            {checkingPocketAuth ? (
                                <div className="text-gray-500 dark:text-gray-400">
                                    Checking authorization status...
                                </div>
                            ) : pocketAuthorized ? (
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-green-500">✓</span>
                                        <span className="text-green-700 dark:text-green-400 font-medium">
                                            Authorized
                                        </span>
                                        {pocketUsername && (
                                            <span className="text-gray-600 dark:text-gray-400">
                                                ({pocketUsername})
                                            </span>
                                        )}
                                    </div>
                                    {pocketLastSynced && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            Last synced: {pocketLastSynced.toLocaleDateString()}
                                        </div>
                                    )}
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handlePocketRevoke}
                                            disabled={loading}
                                            className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800 disabled:opacity-50"
                                        >
                                            Revoke Access
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-gray-400">○</span>
                                        <span className="text-gray-600 dark:text-gray-400">
                                            Not authorized
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handlePocketAuthorize(false)}
                                        disabled={loading}
                                        className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-1 rounded hover:bg-orange-200 dark:hover:bg-orange-800 disabled:opacity-50"
                                    >
                                        Authorize Pocket
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Import Options */}
                        <div className="space-y-3">
                            {hasImportedArticles ? (
                                <ImportStatusSection
                                    articleCount={importCount}
                                    lastImportTime={lastImportTime}
                                    onResync={handlePocketImport}
                                    loading={loading}
                                />
                            ) : (
                                <div>
                                    <button
                                        onClick={() => {
                                            if (pocketAuthorized) {
                                                handlePocketImport()
                                            } else {
                                                handlePocketAuthorize(true)
                                            }
                                        }}
                                        disabled={loading || isPocketImportActive}
                                        className="w-full bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors"
                                    >
                                        <span>📚</span>
                                        <span>
                                            {isPocketImportActive ? 'Import in progress...' :
                                             loading ? 'Processing...' : 
                                             pocketAuthorized ? 'Import from Pocket' : 'Authorize & Import from Pocket'}
                                        </span>
                                    </button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
                                        {isPocketImportActive ? 
                                         'Pocket import is currently running. Check the banner above for progress.' :
                                         pocketAuthorized ? 
                                         'Import your saved articles from Pocket (runs in background)' :
                                         'First authorize Pocket access, then import your articles'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-3">
                            {/* Extract Content Button */}
                            {hasImportedArticles && (
                                <button
                                    onClick={handleExtractContent}
                                    disabled={loading}
                                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors"
                                >
                                    <span>📄</span>
                                    <span>{loading ? 'Extracting...' : 'Extract Full Content for Limited Articles'}</span>
                                </button>
                            )}
                            
                            {/* Delete All Articles Button */}
                            {hasImportedArticles && (
                                <button
                                    onClick={() => handleDeleteAllArticles('current')}
                                    disabled={loading}
                                    className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors"
                                >
                                    <span>🗑️</span>
                                    <span>{loading ? 'Deleting...' : 'Delete All Articles'}</span>
                                </button>
                            )}
                            
                            {/* Linked Accounts Button */}
                            <button
                                onClick={() => setShowAccountLinking(true)}
                                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 flex items-center justify-center space-x-2 transition-colors"
                            >
                                <span>🔗</span>
                                <span>Manage Linked Accounts</span>
                            </button>
                            
                            {/* Stale import clearing removed - handled automatically by new progress system */}
                            
                            <button
                                onClick={handleLogout}
                                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 flex items-center justify-center space-x-2 transition-colors"
                            >
                                <span>🚪</span>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Account Linking Modal */}
            {showAccountLinking && (
                <AccountLinking onClose={() => setShowAccountLinking(false)} />
            )}
            
            {/* Enterprise Account Linking Prompt */}
            {accountLinkingData && (
                <EnterpriseAccountLinkingPrompt
                    existingProvider={accountLinkingData.existingProvider}
                    linkingProvider={accountLinkingData.linkingProvider}
                    linkingToken={accountLinkingData.linkingToken}
                    email={accountLinkingData.email}
                    trustLevel={accountLinkingData.trustLevel}
                    requiresVerification={accountLinkingData.requiresVerification}
                    onClose={() => {
                        setAccountLinkingData(null)
                        // Also close the Settings modal after account linking is handled
                        onClose()
                    }}
                />
            )}
        </div>
    )
}
