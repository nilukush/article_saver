import { useState, useEffect } from 'react'
import { useArticleStore } from '../stores/articleStore'
import { useImportStore } from '../stores/importStore'
import { ImportStatusSection } from './ImportStatusSection'
import { AccountLinking } from './AccountLinking'
import { EnterpriseAccountLinkingPrompt } from './EnterpriseAccountLinkingPrompt'

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

    // Get stores
    const { loadArticles, totalArticles } = useArticleStore()
    const { startImport, completeImport } = useImportStore()

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

    // Set fallback timestamp for existing imported articles without timestamp
    useEffect(() => {
        if (hasImportedArticles && !lastImportTime) {
            // If articles exist but no timestamp, set a fallback timestamp
            const fallbackTimestamp = new Date().toISOString()
            localStorage.setItem('lastPocketImport', fallbackTimestamp)
            setLastImportTime(fallbackTimestamp)
        }
    }, [hasImportedArticles, lastImportTime])

    // Check Pocket auth when user logs in
    useEffect(() => {
        if (isLoggedIn) {
            checkPocketAuth()
        }
    }, [isLoggedIn])

    // Use hardcoded API URL for static file serving (protocol interception)
    const serverUrl = 'http://localhost:3003' // Backend runs on port 3003

    // Check Pocket authorization status
    const checkPocketAuth = async () => {
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

            if (response.success) {
                setPocketAuthorized(response.authorized)
                setPocketUsername(response.username)
                if (response.lastSynced) {
                    setPocketLastSynced(new Date(response.lastSynced))
                }
            } else {
                setPocketAuthorized(false)
                setPocketUsername(null)
                setPocketLastSynced(null)
            }
        } catch (error) {
            console.error('Failed to check Pocket auth status:', error)
            setPocketAuthorized(false)
        } finally {
            setCheckingPocketAuth(false)
        }
    }

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

            if (response.success) {
                const data = response.data
                localStorage.setItem('authToken', data.token)
                localStorage.setItem('serverUrl', serverUrl)
                localStorage.setItem('userEmail', email)
                setIsLoggedIn(true)
                setError(null)
                // Close settings modal immediately after successful login
                onClose()
            } else {
                setError(response.error || 'Login failed')
            }
        } catch (err) {
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

            if (response.success) {
                const data = response.data
                localStorage.setItem('authToken', data.token)
                localStorage.setItem('serverUrl', serverUrl)
                localStorage.setItem('userEmail', email)
                setIsLoggedIn(true)
                setError(null)
                // Close settings modal immediately after successful registration
                onClose()
            } else {
                setError(response.error || 'Registration failed')
            }
        } catch (err) {
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
            console.log('🔄 FIX LIMITED CONTENT: Starting fix for articles with limited content')
            
            // First, use the new fix endpoint to mark limited content articles
            const fixResponse = await window.electronAPI.netFetch(`${serverUrl}/api/articles/fix/limited-content`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            })
            
            console.log('🔄 FIX LIMITED CONTENT: Response received:', fixResponse)

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

    const handleDeleteAllArticles = async () => {
        if (!confirm(`Are you sure you want to delete all ${totalArticles} articles? This cannot be undone.`)) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem('authToken')
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/articles/bulk/all`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (response.success) {
                const data = response.data
                setError(`✅ Successfully deleted ${data.deletedCount} articles!`)
                
                // Clear import timestamp since we deleted everything
                localStorage.removeItem('lastPocketImport')
                setLastImportTime(null)
                
                // Reload articles to show empty state
                await loadArticles()
                
                // Close modal after 2 seconds
                setTimeout(() => {
                    onClose()
                }, 2000)
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
            console.error('Google login error:', err)
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
            console.error('GitHub login error:', err)
            setError(err instanceof Error ? err.message : 'GitHub login failed')
            setLoading(false)
        }
    }

    // Handle Pocket authorization
    const handlePocketAuthorize = async () => {
        setLoading(true)
        setError(null)

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

            if (response.success) {
                const data = response.data
                // Open OAuth URL in system browser using Electron IPC
                await window.electronAPI.openOAuthUrl(data.url)
                setError('Please authorize Pocket access in your browser. The app will automatically detect when you complete authorization.')
            } else {
                setError(response.error || 'Failed to get Pocket authorization URL')
            }
        } catch (err) {
            setError('Failed to connect to Pocket')
        } finally {
            setLoading(false)
        }
    }

    // Handle Pocket import using stored authorization
    const handlePocketImport = async () => {
        setLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem('authToken')
            
            if (!pocketAuthorized) {
                setError('Please authorize Pocket access first')
                return
            }

            // Import articles using stored authorization
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

            if (response.success) {
                const data = response.data
                setError(`Import started successfully! Session ID: ${data.sessionId}. Check progress in the Import Status section.`)
                
                // Start background import using the new import store
                const userId = localStorage.getItem('userEmail') || 'unknown'
                startImport({
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
                
                // Update last import time
                const importTimestamp = new Date().toISOString()
                localStorage.setItem('lastPocketImport', importTimestamp)
                setLastImportTime(importTimestamp)
            } else {
                setError(response.error || 'Failed to start import')
            }
        } catch (err) {
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }

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

    useEffect(() => {
        const token = localStorage.getItem('authToken')
        if (token) {
            setIsLoggedIn(true)
        }

        // Listen for OAuth success events (direct token from backend)
        if (window.electronAPI?.onOAuthSuccess) {
            window.electronAPI.onOAuthSuccess(async (data: { provider: string; token: string; email: string; pocket_authorized?: boolean }) => {
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
                    // Don't close modal if we're expecting account linking
                    // The linking prompt will handle closing
                }
            })
        }

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
            }) => {
                setLoading(false)
                
                // If we have a token, save it first so user is authenticated
                if (data.token) {
                    localStorage.setItem('authToken', data.token)
                    localStorage.setItem('userEmail', data.email)
                    setIsLoggedIn(true)
                }
                
                setAccountLinkingData({
                    existingProvider: data.existingProvider,
                    linkingProvider: data.provider,
                    linkingToken: data.linkingToken,
                    email: data.email,
                    trustLevel: data.trustLevel,
                    requiresVerification: data.requiresVerification === 'true'
                })
            })
        }

        // Cleanup listeners on unmount
        return () => {
            if (window.electronAPI?.removeOAuthListeners) {
                window.electronAPI.removeOAuthListeners()
            }
        }
    }, [startImport, completeImport, loadArticles, onClose])

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full">
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
                                        onClick={handlePocketAuthorize}
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
                                        onClick={pocketAuthorized ? handlePocketImport : handlePocketAuthorize}
                                        disabled={loading}
                                        className="w-full bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors"
                                    >
                                        <span>📚</span>
                                        <span>
                                            {loading ? 'Processing...' : 
                                             pocketAuthorized ? 'Import from Pocket' : 'Authorize & Import from Pocket'}
                                        </span>
                                    </button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
                                        {pocketAuthorized ? 
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
                                    onClick={handleDeleteAllArticles}
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
                    onClose={() => setAccountLinkingData(null)}
                />
            )}
        </div>
    )
}
