import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ImportJob {
    id: string
    sessionId: string
    userId: string
    provider: 'pocket' | 'instapaper' | 'readwise'
    status: 'running' | 'completed' | 'failed' | 'paused'
    progress: {
        total: number
        current: number
        percentage: number
        currentAction: string
        timeRemaining: number
        estimatedTotal?: number
    }
    startTime: Date
    endTime?: Date
    results?: {
        imported: number
        skipped: number
        failed: number
        total: number
    }
    error?: string
    lastSyncTime?: Date
}

interface ImportState {
    activeImports: ImportJob[]
    showProgress: boolean
    expandedView: boolean
    lastUpdate: number // Force re-render timestamp

    // Actions
    startImport: (job: Omit<ImportJob, 'id' | 'startTime' | 'lastSyncTime'>) => string
    updateProgress: (jobId: string, progress: Partial<ImportJob['progress']>) => void
    completeImport: (jobId: string, results: ImportJob['results'], error?: string) => void
    removeImport: (jobId: string) => void
    toggleExpanded: () => void
    hideProgress: () => void
    showProgressIndicator: () => void
    discoverAndRecoverSessions: () => Promise<void>
    recoverSession: (sessionData: any) => string
}

export const useImportStore = create<ImportState>()(
    persist(
        (set, get) => ({
            activeImports: [],
            showProgress: false,
            expandedView: false,
            lastUpdate: Date.now(),

    startImport: (job) => {
        const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const now = new Date()
        const newJob: ImportJob = {
            ...job,
            id: jobId,
            startTime: now,
            lastSyncTime: now,
            progress: {
                ...job.progress,
                total: job.progress?.total || 0,
                current: job.progress?.current || 0,
                percentage: job.progress?.percentage || 0,
                currentAction: job.progress?.currentAction || 'Initializing import...',
                timeRemaining: job.progress?.timeRemaining || 0
            }
        }

        set(state => ({
            activeImports: [...state.activeImports.filter(imp => 
                !(imp.provider === job.provider && imp.status === 'running')
            ), newJob],
            showProgress: true
        }))

        return jobId
    },

    // syncWithBackend function removed - using new progress tracking system

    updateProgress: (jobId, progressUpdate) => {
        set(state => {
            const updatedImports = state.activeImports.map(job => {
                if (job.id === jobId) {
                    // Create completely new objects to ensure React detects changes
                    const updatedJob = {
                        ...job,
                        progress: { 
                            ...job.progress, 
                            ...progressUpdate,
                            // Ensure we're updating the timestamp to force re-render
                            lastUpdate: Date.now()
                        },
                        // Update job-level lastSyncTime to trigger re-renders
                        lastSyncTime: new Date()
                    }
                    
                    return updatedJob
                }
                return job
            })
            
            // Return completely new state object
            return {
                ...state,
                activeImports: [...updatedImports], // New array reference
                lastUpdate: Date.now(), // Force re-render
                showProgress: true // Ensure progress is visible
            }
        })
    },

    completeImport: (jobId, results, error) => {
        set(state => ({
            activeImports: state.activeImports.map(job =>
                job.id === jobId
                    ? {
                        ...job,
                        status: error ? 'failed' : 'completed',
                        endTime: new Date(),
                        results,
                        error,
                        progress: {
                            ...job.progress,
                            percentage: 100,
                            currentAction: error ? `Failed: ${error}` : 'Import completed!'
                        }
                    }
                    : job
            )
        }))

        // Auto-hide progress after 5 seconds for completed imports
        if (!error) {
            setTimeout(() => {
                const currentState = get()
                const job = currentState.activeImports.find(j => j.id === jobId)
                if (job && job.status === 'completed') {
                    get().removeImport(jobId)
                }
            }, 5000)
        }
    },

    removeImport: (jobId) => {
        set(state => {
            const newImports = state.activeImports.filter(job => job.id !== jobId)
            return {
                activeImports: newImports,
                showProgress: newImports.length > 0,
                expandedView: newImports.length > 0 ? state.expandedView : false
            }
        })
    },

    // Legacy cleanup functions removed - enterprise progress system handles cleanup automatically

    toggleExpanded: () => {
        set(state => ({ expandedView: !state.expandedView }))
    },

    hideProgress: () => {
        set({ showProgress: false, expandedView: false })
    },

    showProgressIndicator: () => {
        set({ showProgress: true })
    },

    // Enterprise session discovery and recovery
    discoverAndRecoverSessions: async () => {
        try {
            const token = localStorage.getItem('authToken')
            const serverUrl = 'http://localhost:3003'
            
            if (!token) {
                console.log('🔍 SESSION DISCOVERY: No auth token, skipping discovery')
                return
            }

            console.log('🔍 SESSION DISCOVERY: Starting session discovery...')
            
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/pocket/sessions/discover`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            })

            if (response.success && response.data?.activeSessions) {
                const activeSessions = response.data.activeSessions
                console.log('🔍 SESSION DISCOVERY: Found sessions:', activeSessions.length)

                // Get current state to check for existing imports
                const currentState = get()
                
                // Recover sessions that aren't already tracked
                activeSessions.forEach((sessionData: any) => {
                    const existingImport = currentState.activeImports.find(
                        imp => imp.sessionId === sessionData.id
                    )
                    
                    if (!existingImport) {
                        console.log('🔄 SESSION RECOVERY: Recovering session', sessionData.id)
                        get().recoverSession(sessionData)
                    } else {
                        console.log('🔄 SESSION RECOVERY: Session already tracked', sessionData.id)
                        // Update existing import with fresh data
                        get().syncWithBackend(sessionData.id, sessionData.progress)
                    }
                })

                if (activeSessions.length > 0) {
                    set({ showProgress: true })
                }
            } else {
                console.log('🔍 SESSION DISCOVERY: No active sessions found')
            }
        } catch (error) {
            console.error('❌ SESSION DISCOVERY: Failed to discover sessions:', error)
        }
    },

    recoverSession: (sessionData: any) => {
        const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const userId = localStorage.getItem('userEmail') || 'unknown'
        
        const recoveredJob: ImportJob = {
            id: jobId,
            sessionId: sessionData.id,
            userId,
            provider: sessionData.source as any,
            status: sessionData.status === 'running' ? 'running' : 'paused',
            progress: {
                total: sessionData.progress?.totalArticles || 0,
                current: sessionData.progress?.articlesProcessed || 0,
                percentage: sessionData.progress?.percentage || 0,
                currentAction: sessionData.progress?.currentAction || 'Recovered session...',
                timeRemaining: sessionData.metadata?.estimatedTimeRemaining || 0
            },
            startTime: new Date(sessionData.createdAt),
            lastSyncTime: new Date()
        }

        console.log('🔄 SESSION RECOVERY: Recovered job:', recoveredJob)

        set(state => ({
            activeImports: [...state.activeImports, recoveredJob],
            showProgress: true
        }))

        return jobId
    }
        }),
        {
            name: 'import-store',
            partialize: (state) => ({ 
                activeImports: state.activeImports.filter(job => 
                    job.status === 'running' || job.status === 'paused'
                ),
                showProgress: state.showProgress 
            }),
            // Convert dates from strings when hydrating from localStorage
            onRehydrateStorage: () => (state) => {
                if (state?.activeImports) {
                    state.activeImports = state.activeImports.map(job => ({
                        ...job,
                        startTime: new Date(job.startTime),
                        endTime: job.endTime ? new Date(job.endTime) : undefined,
                        lastSyncTime: job.lastSyncTime ? new Date(job.lastSyncTime) : undefined
                    }))
                }
            }
        }
    )
)
