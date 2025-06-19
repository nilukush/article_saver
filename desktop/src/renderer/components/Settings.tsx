import { useState, useEffect } from 'react'
import { useArticleStore } from '../stores/articleStore'
import { useImportStore } from '../stores/importStore'
import { ImportStatusSection } from './ImportStatusSection'

interface SettingsProps {
    onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Get stores
    const { loadArticles, totalArticles } = useArticleStore()
    const { startImport, completeImport } = useImportStore()

    // Import status detection
    const hasImportedArticles = totalArticles > 0
    const importCount = totalArticles
    const [lastImportTime, setLastImportTime] = useState<string | null>(
        localStorage.getItem('lastPocketImport')
    )

    // Set fallback timestamp for existing imported articles without timestamp
    useEffect(() => {
        if (hasImportedArticles && !lastImportTime) {
            // If articles exist but no timestamp, set a fallback timestamp
            const fallbackTimestamp = new Date().toISOString()
            localStorage.setItem('lastPocketImport', fallbackTimestamp)
            setLastImportTime(fallbackTimestamp)
        }
    }, [hasImportedArticles, lastImportTime])

    // Use hardcoded API URL for static file serving (protocol interception)
    const serverUrl = 'http://localhost:3003'

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
                setIsLoggedIn(true)
                setError(null)
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
                setIsLoggedIn(true)
                setError(null)
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
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/articles/batch/re-extract`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    limit: 10 // Process 10 articles at a time
                })
            })

            if (response.success) {
                const data = response.data
                setError(`✅ Extracted content for ${data.results.success} articles! ${data.results.failed} failed.`)
                
                // Reload articles to show updated content
                await loadArticles()
                
                // If there are more articles to process, show a message
                if (data.processed === 10) {
                    setError(data.message + '\n\nClick again to process more articles.')
                }
            } else {
                setError(response.error || 'Failed to extract content')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extract content')
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
        localStorage.removeItem('authToken')
        localStorage.removeItem('serverUrl')
        setIsLoggedIn(false)
        setEmail('')
        setPassword('')
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

            // Get GitHub OAuth URL from backend with server port
            const response = await fetch(`${serverUrl}/api/auth/github/url?port=${port}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get OAuth URL')
            }

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

    const handlePocketImport = async () => {
        setLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem('authToken')
            const pocketToken = localStorage.getItem('pocketToken')

            if (!pocketToken) {
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
                return
            }

            // Import articles using stored Pocket token
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/pocket/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accessToken: pocketToken
                }),
            })

            if (response.success) {
                const data = response.data
                setError(`Successfully imported ${data.imported} articles from Pocket!`)
                // Clear the pocket token after successful import
                localStorage.removeItem('pocketToken')
            } else {
                setError(response.error || 'Failed to import from Pocket')
            }
        } catch (err) {
            setError('Failed to connect to Pocket')
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
            window.electronAPI.onOAuthSuccess(async (data: { provider: string; token: string; email: string }) => {
                if (data.provider === 'pocket') {
                    // Start background import using the new import store
                    const userId = localStorage.getItem('userEmail') || 'unknown'
                    const jobId = startImport({
                        userId,
                        provider: 'pocket',
                        status: 'running',
                        progress: {
                            total: 0,
                            current: 0,
                            percentage: 0,
                            currentAction: 'Pocket authorization successful! Starting import...',
                            timeRemaining: 0
                        }
                    })

                    // Close the settings modal immediately - import continues in background
                    setError('Import started! You can close this dialog and continue using the app.')
                    setTimeout(() => {
                        onClose()
                    }, 2000)

                    try {
                        const authToken = localStorage.getItem('authToken')
                        if (!authToken) {
                            completeImport(jobId, { imported: 0, skipped: 0, failed: 0, total: 0 }, 'Please log in first before importing from Pocket')
                            return
                        }

                        // Start the import (this will timeout but backend continues)
                        const importPromise = window.electronAPI.netFetch(`${serverUrl}/api/pocket/import`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${authToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                accessToken: data.token
                            }),
                        })

                        // Start polling for progress immediately
                        const pollProgress = async () => {
                            try {
                                const progressResponse = await window.electronAPI.netFetch(`${serverUrl}/api/pocket/progress`, {
                                    headers: {
                                        'Authorization': `Bearer ${authToken}`,
                                    },
                                })

                                if (progressResponse.success) {
                                    const progressData = progressResponse.data

                                    if (progressData.status === 'not_found') {
                                        // Import hasn't started yet, keep polling
                                        setTimeout(pollProgress, 2000)
                                        return
                                    }

                                    // Update the import store with real backend progress
                                    const currentJob = useImportStore.getState().activeImports.find(j => j.id === jobId)
                                    if (currentJob) {
                                        useImportStore.getState().updateProgress(jobId, {
                                            total: progressData.totalArticles,
                                            current: progressData.articlesProcessed,
                                            percentage: progressData.percentage,
                                            currentAction: progressData.currentAction,
                                            timeRemaining: progressData.estimatedTimeRemaining
                                        })
                                    }

                                    if (progressData.status === 'completed') {
                                        // Import completed successfully
                                        completeImport(jobId, {
                                            imported: progressData.imported,
                                            skipped: progressData.skipped,
                                            failed: progressData.failed,
                                            total: progressData.totalArticles
                                        })

                                        // Update import timestamp for UI state
                                        const timestamp = new Date().toISOString()
                                        localStorage.setItem('lastPocketImport', timestamp)
                                        setLastImportTime(timestamp)

                                        await loadArticles()
                                    } else if (progressData.status === 'failed') {
                                        // Import failed
                                        completeImport(jobId, { imported: 0, skipped: 0, failed: 0, total: 0 }, 'Import failed on backend')
                                    } else {
                                        // Still running, continue polling
                                        setTimeout(pollProgress, 3000) // Poll every 3 seconds
                                    }
                                } else {
                                    // Error getting progress, continue polling
                                    setTimeout(pollProgress, 5000)
                                }
                            } catch (err) {
                                console.error('Progress polling error:', err)
                                // Continue polling even on error
                                setTimeout(pollProgress, 5000)
                            }
                        }

                        // Start polling immediately
                        setTimeout(pollProgress, 1000)

                        // Handle the import response (will likely timeout)
                        try {
                            const response = await importPromise
                            if (response.success) {
                                // Import completed within timeout - update with final results
                                const importData = response.data
                                completeImport(jobId, {
                                    imported: importData.imported,
                                    skipped: importData.skipped,
                                    failed: importData.failed,
                                    total: importData.total
                                })

                                // Update import timestamp for immediate completion
                                const timestamp = new Date().toISOString()
                                localStorage.setItem('lastPocketImport', timestamp)
                                setLastImportTime(timestamp)

                                await loadArticles()
                            }
                        } catch (err) {
                            // Import timed out - this is expected for large imports
                            // Progress polling will handle the real status
                            console.log('Import request timed out (expected for large imports) - progress polling will continue')
                        }
                    } catch (err) {
                        completeImport(jobId, { imported: 0, skipped: 0, failed: 0, total: 0 }, 'Failed to start import')
                        console.error('Pocket import error:', err)
                    }
                } else {
                    // For Google/GitHub, handle normal login
                    localStorage.setItem('authToken', data.token)
                    localStorage.setItem('userEmail', data.email)
                    setIsLoggedIn(true)
                    setError(`Successfully logged in with ${data.provider}!`)
                    setLoading(false)
                }
            })
        }

        if (window.electronAPI?.onOAuthError) {
            window.electronAPI.onOAuthError((data: { provider: string; error: string }) => {
                setError(`${data.provider} login failed: ${data.error}`)
                setLoading(false)
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

                        {/* Account Management Options */}
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
                                        onClick={handlePocketImport}
                                        disabled={loading}
                                        className="w-full bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors"
                                    >
                                        <span>📚</span>
                                        <span>{loading ? 'Importing...' : 'Import from Pocket'}</span>
                                    </button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
                                        Import your saved articles from Pocket (runs in background)
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
        </div>
    )
}
