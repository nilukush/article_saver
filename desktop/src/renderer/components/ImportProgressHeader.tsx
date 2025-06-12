import { useImportStore } from '../stores/importStore'

export function ImportProgressHeader() {
    const { activeImports, expandedView, toggleExpanded, removeImport } = useImportStore()

    // Only show if there are active imports
    if (activeImports.length === 0) return null

    const activeImport = activeImports[0] // Show first active import
    const { progress, status, provider, results } = activeImport

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
                        {status === 'running' && `Importing ${progress.current} of ${progress.total} articles from ${provider}`}
                        {status === 'completed' && `Import complete! Added ${results?.imported || 0} articles from ${provider}`}
                        {status === 'failed' && `Import failed from ${provider}`}
                    </span>
                </div>

                <div className="flex items-center space-x-3">
                    {status === 'running' && progress.total > 0 && (
                        <span className="text-white text-opacity-90">
                            {progress.percentage}%
                        </span>
                    )}

                    {status === 'running' && progress.timeRemaining > 0 && (
                        <span className="text-white text-opacity-75 text-xs">
                            {formatTimeRemaining(progress.timeRemaining)}
                        </span>
                    )}

                    {status === 'completed' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                removeImport(activeImport.id)
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
            {status === 'running' && progress.total > 0 && (
                <div className="mt-2 w-full bg-white bg-opacity-20 rounded-full h-1">
                    <div
                        className="bg-white h-1 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
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
                                <div>Current Action: {progress.currentAction}</div>
                                {progress.total > 0 && (
                                    <div>Progress: {progress.current} of {progress.total} articles ({progress.percentage}%)</div>
                                )}
                                {progress.timeRemaining > 0 && (
                                    <div>Time Remaining: {formatTimeRemaining(progress.timeRemaining)}</div>
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
                                Error: {activeImport.error || 'Unknown error occurred'}
                            </div>
                        )}
                    </div>

                    {status === 'running' && (
                        <div className="flex space-x-2 mt-3">
                            <button
                                onClick={() => removeImport(activeImport.id)}
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
