import { create } from 'zustand'

export interface ImportJob {
    id: string
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
}

interface ImportState {
    activeImports: ImportJob[]
    showProgress: boolean
    expandedView: boolean

    // Actions
    startImport: (job: Omit<ImportJob, 'id' | 'startTime'>) => string
    updateProgress: (jobId: string, progress: Partial<ImportJob['progress']>) => void
    completeImport: (jobId: string, results: ImportJob['results'], error?: string) => void
    removeImport: (jobId: string) => void
    toggleExpanded: () => void
    hideProgress: () => void
    showProgressIndicator: () => void
}

export const useImportStore = create<ImportState>((set, get) => ({
    activeImports: [],
    showProgress: false,
    expandedView: false,

    startImport: (job) => {
        const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newJob: ImportJob = {
            ...job,
            id: jobId,
            startTime: new Date(),
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
            activeImports: [...state.activeImports, newJob],
            showProgress: true
        }))

        return jobId
    },

    updateProgress: (jobId, progressUpdate) => {
        set(state => ({
            activeImports: state.activeImports.map(job =>
                job.id === jobId
                    ? {
                        ...job,
                        progress: { ...job.progress, ...progressUpdate }
                    }
                    : job
            )
        }))
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

    toggleExpanded: () => {
        set(state => ({ expandedView: !state.expandedView }))
    },

    hideProgress: () => {
        set({ showProgress: false, expandedView: false })
    },

    showProgressIndicator: () => {
        set({ showProgress: true })
    }
}))
