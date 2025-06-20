/**
 * ENTERPRISE-GRADE PROGRESS POLLING HOOK
 * 
 * Single source of truth for progress polling
 * - Unified polling mechanism with debouncing
 * - Automatic cleanup and error handling
 * - Real-time updates through progressStore
 * - Optimized for enterprise performance
 */

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { progressStore } from './useProgressStore'

interface ProgressPollingOptions {
    sessionId: string
    enabled: boolean
    interval?: number
    onComplete?: (results: any) => void
    onError?: (error: string) => void
}

export function useProgressPolling({
    sessionId,
    enabled,
    interval = 2000,
    onComplete,
    onError
}: ProgressPollingOptions) {
    const intervalRef = useRef<NodeJS.Timeout>()
    const isPollingRef = useRef(false)
    const lastUpdateRef = useRef<string>('')

    // Enterprise pattern: memoize callback dependencies to prevent recreation
    const memoizedCallbacks = useMemo(() => ({
        onComplete,
        onError
    }), [onComplete, onError])

    const pollProgress = useCallback(async () => {
        if (!enabled || !sessionId || isPollingRef.current) {
            return
        }

        isPollingRef.current = true

        try {
            const token = localStorage.getItem('authToken')
            if (!token) {
                // No auth token available
                return
            }

            // Fetching progress for session

            const response = await window.electronAPI.netFetch(
                `http://localhost:3003/api/pocket/progress/${sessionId}?t=${Date.now()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            )

            if (response.success && response.data) {
                const data = response.data
                const progressData = data.session?.progress || data

                // Received progress data

                // Extract progress values with proper fallbacks
                const total = progressData.totalArticles || progressData.total || 0
                const current = progressData.articlesProcessed || progressData.current || 0
                const currentAction = progressData.currentAction || progressData.action || 'Processing...'

                // Calculate percentage
                const percentage = total > 0 ? Math.round((current / total) * 100) : 0

                // Enterprise pattern: debounce updates to prevent UI thrashing
                const updateKey = `${total}-${current}-${percentage}-${currentAction}`
                if (lastUpdateRef.current !== updateKey) {
                    lastUpdateRef.current = updateKey
                    
                    // Update the progress store (will trigger all components using useProgressStore)
                    progressStore.updateProgress({
                        total,
                        current,
                        percentage,
                        currentAction,
                        sessionId,
                        isActive: true
                    })

                    // Updated progress
                }

                // Check for completion
                const status = data.session?.status || data.status
                if (status === 'completed') {
                    // Import completed!
                    progressStore.updateProgress({ isActive: false })
                    memoizedCallbacks.onComplete?.(data.session?.results || data.results)
                } else if (status === 'failed') {
                    // Import failed!
                    progressStore.updateProgress({ isActive: false })
                    memoizedCallbacks.onError?.(progressData.errorMessage || 'Import failed')
                }
            } else {
                // Invalid response format
                
                // If session not found, clear progress
                if (response.data?.status === 'not_found') {
                    // Session not found, clearing progress
                    progressStore.clearProgress()
                }
            }
        } catch (error) {
            // Error fetching progress
            memoizedCallbacks.onError?.(error instanceof Error ? error.message : 'Polling failed')
        } finally {
            isPollingRef.current = false
        }
    }, [sessionId, enabled, memoizedCallbacks])

    // Start/stop polling based on enabled state
    useEffect(() => {
        if (enabled && sessionId) {
            // Starting polling for session
            
            // Start immediate poll
            pollProgress()
            
            // Set up interval
            intervalRef.current = setInterval(pollProgress, interval)
        } else {
            // Stopping polling
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = undefined
            }
            // Clear progress when polling stops
            progressStore.clearProgress()
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = undefined
            }
        }
    }, [enabled, sessionId, interval, pollProgress])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            isPollingRef.current = false
        }
    }, [])
}