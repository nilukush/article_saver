import { useImportStore } from '../stores/importStore'
import { useArticleStore } from '../stores/articleStore'
import { useProgressStore } from '../hooks/useProgressStore'
import { useProgressPolling } from '../hooks/useProgressPolling'
import { ErrorBoundary } from './ErrorBoundary'
import { useEffect } from 'react'

function ImportProgressHeaderContent() {
    // ENTERPRISE-GRADE SOLUTION: Single source of truth for progress
    const progress = useProgressStore()
    
    // Get import store state for session management
    const activeImports = useImportStore(state => state.activeImports)
    const expandedView = useImportStore(state => state.expandedView)
    const toggleExpanded = useImportStore(state => state.toggleExpanded)
    const removeImport = useImportStore(state => state.removeImport)
    const completeImport = useImportStore(state => state.completeImport)
    
    // CRITICAL FIX: Get article store to refresh after import
    const loadInitialArticles = useArticleStore(state => state.loadInitialArticles)
    
    // Get active import session
    const activeImport = activeImports.find(imp => imp.status === 'running')
    
    // Enterprise polling hook - single source of truth
    useProgressPolling({
        sessionId: activeImport?.sessionId || '',
        enabled: !!activeImport && activeImport.status === 'running',
        interval: 2000,
        onComplete: (results) => {
            if (activeImport) {
                // Import completed with results
                completeImport(activeImport.id, results)
                progress.clearProgress()
                
                // CRITICAL FIX: Refresh articles after import completes!
                // This was the missing piece - UI wasn't updating because
                // articles weren't being reloaded after import
                // Use getState to get current preventAutoLoad value
                const { preventAutoLoad } = useArticleStore.getState()
                if (!preventAutoLoad) {
                    loadInitialArticles()
                }
            }
        },
        onError: (error) => {
            if (activeImport) {
                // Import failed
                completeImport(activeImport.id, { imported: 0, skipped: 0, failed: 0, total: 0 }, error)
                progress.clearProgress()
            }
        }
    })
    
    // Clear progress when no active imports
    useEffect(() => {
        if (!activeImport) {
            progress.clearProgress()
        }
    }, [activeImport])
    
    // Only show if there's an active import or active progress
    if (!activeImport && !progress.isActive) return null
    
    // Use progress store values (real-time) or fallback to import store
    const progressTotal = progress.isActive ? progress.total : (activeImport?.progress?.total || 0)
    const progressCurrent = progress.isActive ? progress.current : (activeImport?.progress?.current || 0) 
    const progressPercentage = progress.isActive ? progress.percentage : (activeImport?.progress?.percentage || 0)
    const progressAction = progress.isActive ? progress.currentAction : (activeImport?.progress?.currentAction || 'Starting...')
    
    const status = activeImport?.status || (progress.isActive ? 'running' : 'completed')
    const provider = activeImport?.provider || 'pocket'
    const results = activeImport?.results
    
    // Progress values tracked internally

    // Format time remaining
    const formatTimeRemaining = (ms: number) => {
        if (ms <= 0) return ''
        const minutes = Math.floor(ms / 60000)
        const seconds = Math.floor((ms % 60000) / 1000)
        if (minutes > 0) {
            return `~${minutes}m ${seconds}s remaining`
        }
        return `~${seconds}s remaining`
    }

    // Get status color
    const getStatusColor = () => {
        switch (status) {
            case 'running': return 'bg-blue-600'
            case 'completed': return 'bg-green-600'
            case 'failed': return 'bg-red-600'
            case 'paused': return 'bg-yellow-600'
            default: return 'bg-gray-600'
        }
    }

    return (
        <div className={`${getStatusColor()} text-white px-4 py-2 text-sm`}>
            <div
                className="flex items-center justify-between cursor-pointer hover:bg-black hover:bg-opacity-10 transition-colors rounded px-2 py-1"
                onClick={toggleExpanded}
            >
                <div className="flex items-center space-x-3">
                    {status === 'running' && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {status === 'completed' && <span>✅</span>}
                    {status === 'failed' && <span>❌</span>}

                    <span className="font-medium">
                        {status === 'running' && (
                            <>
                                {progressAction || `Starting import from ${provider}...`}
                                {progressTotal > 0 && ` (${progressCurrent} of ${progressTotal})`}
                            </>
                        )}
                        {status === 'completed' && `Import complete! Added ${results?.imported || 0} articles from ${provider}`}
                        {status === 'failed' && `Import failed from ${provider}`}
                    </span>
                </div>

                <div className="flex items-center space-x-3">
                    {status === 'running' && progressTotal > 0 && (
                        <span className="text-white text-opacity-90">
                            {progressPercentage}%
                        </span>
                    )}

                    {status === 'running' && activeImport?.progress.timeRemaining && activeImport.progress.timeRemaining > 0 && (
                        <span className="text-white text-opacity-75 text-xs">
                            {formatTimeRemaining(activeImport.progress.timeRemaining)}
                        </span>
                    )}

                    {status === 'completed' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                activeImport && removeImport(activeImport.id)
                            }}
                            className="text-white text-opacity-75 hover:text-opacity-100 text-xs px-2 py-1 rounded hover:bg-black hover:bg-opacity-20"
                        >
                            Dismiss
                        </button>
                    )}

                    <span className="text-white text-opacity-75">
                        {expandedView ? '▼' : '▶'}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            {status === 'running' && progressTotal > 0 && (
                <div className="mt-2 w-full bg-white bg-opacity-20 rounded-full h-1">
                    <div
                        className="bg-white h-1 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            )}

            {/* Expanded view */}
            {expandedView && (
                <div className="mt-3 bg-black bg-opacity-20 rounded-lg p-3 space-y-2">
                    <div className="text-xs text-white text-opacity-90">
                        <div className="font-medium mb-2">Import Details</div>

                        {status === 'running' && (
                            <>
                                <div>Current Action: {progressAction}</div>
                                {progressTotal > 0 ? (
                                    <div>Progress: {progressCurrent} of {progressTotal} articles ({progressPercentage}%)</div>
                                ) : (
                                    <div>Fetching articles from Pocket...</div>
                                )}
                                {activeImport?.progress.timeRemaining && activeImport.progress.timeRemaining > 0 && (
                                    <div>Time Remaining: {formatTimeRemaining(activeImport.progress.timeRemaining)}</div>
                                )}
                                <div className="mt-2 text-white text-opacity-75">
                                    Processing at 2-second intervals (API compliance)
                                </div>
                            </>
                        )}

                        {status === 'completed' && results && (
                            <>
                                <div>✅ Imported: {results.imported} new articles</div>
                                <div>⏭️ Skipped: {results.skipped} (already existed)</div>
                                {results.failed > 0 && <div>❌ Failed: {results.failed}</div>}
                                <div>📊 Total Processed: {results.total}</div>
                            </>
                        )}

                        {status === 'failed' && (
                            <div className="text-red-200">
                                Error: {activeImport?.error || 'Unknown error occurred'}
                            </div>
                        )}
                    </div>

                    {status === 'running' && (
                        <div className="flex space-x-2 mt-3">
                            <button
                                onClick={async () => {
                                    if (activeImport) {
                                        try {
                                            const token = localStorage.getItem('authToken')
                                            if (token) {
                                                const response = await window.electronAPI.netFetch(
                                                    'http://localhost:3003/api/pocket/sessions/cancel',
                                                    {
                                                        method: 'POST',
                                                        headers: {
                                                            'Authorization': `Bearer ${token}`,
                                                            'Content-Type': 'application/json'
                                                        }
                                                    }
                                                )
                                                
                                                if (response.success) {
                                                    // Import cancelled successfully
                                                    removeImport(activeImport.id)
                                                    progress.clearProgress()
                                                } else {
                                                    // Failed to cancel import
                                                }
                                            }
                                        } catch (error) {
                                            // Error cancelling import
                                        }
                                    }
                                }}
                                className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                            >
                                Cancel Import
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/**
 * ENTERPRISE-GRADE IMPORT PROGRESS HEADER
 * 
 * Wrapped with error boundary for maximum reliability
 * - Catches and handles any rendering errors
 * - Provides graceful fallback UI
 * - Maintains system stability
 */
export function ImportProgressHeader() {
    return (
        <ErrorBoundary
            fallback={
                <div className="bg-yellow-600 text-white px-4 py-2 text-sm">
                    <div className="flex items-center space-x-2">
                        <span>⚠️</span>
                        <span>Progress display temporarily unavailable</span>
                    </div>
                </div>
            }
            onError={(_error, _errorInfo) => {
                // ImportProgressHeader error occurred
            }}
        >
            <ImportProgressHeaderContent />
        </ErrorBoundary>
    )
}
