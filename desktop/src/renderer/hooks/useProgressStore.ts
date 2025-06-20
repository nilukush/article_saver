/**
 * ENTERPRISE-GRADE PROGRESS TRACKING HOOK
 * 
 * Uses React 18's useSyncExternalStore for real-time progress updates
 * - Prevents tearing during concurrent rendering
 * - Ensures consistent snapshots across components
 * - Properly cached to prevent infinite loops
 * - Follows React 18 best practices
 */

import { useSyncExternalStore, useCallback } from 'react'

interface ProgressData {
    total: number
    current: number
    percentage: number
    currentAction: string
    sessionId: string | null
    isActive: boolean
}

class ProgressStoreManager {
    private listeners = new Set<() => void>()
    private currentProgress: ProgressData = {
        total: 0,
        current: 0,
        percentage: 0,
        currentAction: '',
        sessionId: null,
        isActive: false
    }
    
    // CRITICAL: Cache the last snapshot to prevent infinite loops
    private lastSnapshot: ProgressData = this.currentProgress
    private lastSnapshotString = JSON.stringify(this.currentProgress)

    subscribe = (callback: () => void) => {
        this.listeners.add(callback)
        return () => {
            this.listeners.delete(callback)
        }
    }

    // ENTERPRISE PATTERN: Return cached snapshot unless data changed
    getSnapshot = (): ProgressData => {
        const currentString = JSON.stringify(this.currentProgress)
        
        // Only create new snapshot if data actually changed
        if (currentString !== this.lastSnapshotString) {
            this.lastSnapshotString = currentString
            this.lastSnapshot = { ...this.currentProgress }
        }
        
        // Always return the same reference for unchanged data
        return this.lastSnapshot
    }

    updateProgress = (progress: Partial<ProgressData>) => {
        const newProgress = { ...this.currentProgress, ...progress }
        const newString = JSON.stringify(newProgress)
        
        // Only update if data actually changed
        if (newString !== JSON.stringify(this.currentProgress)) {
            this.currentProgress = newProgress
            
            // Notify all subscribers
            this.listeners.forEach(callback => callback())
        }
    }

    clearProgress = () => {
        const emptyProgress: ProgressData = {
            total: 0,
            current: 0,
            percentage: 0,
            currentAction: '',
            sessionId: null,
            isActive: false
        }
        
        const emptyString = JSON.stringify(emptyProgress)
        
        // Only clear if not already empty
        if (JSON.stringify(this.currentProgress) !== emptyString) {
            this.currentProgress = emptyProgress
            
            // Notify all subscribers
            this.listeners.forEach(callback => callback())
        }
    }
}

// ENTERPRISE PATTERN: Global singleton instance
const progressStore = new ProgressStoreManager()

// CRITICAL: Define these outside the component to ensure stable references
const subscribe = (callback: () => void) => progressStore.subscribe(callback)
const getSnapshot = () => progressStore.getSnapshot()

/**
 * Enterprise hook for real-time progress tracking
 * Uses useSyncExternalStore with proper caching
 */
export function useProgressStore() {
    // Use stable references defined outside component
    const progress = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getSnapshot // Server snapshot (same as client)
    )

    // Stable function references using useCallback
    const updateProgress = useCallback((newProgress: Partial<ProgressData>) => {
        progressStore.updateProgress(newProgress)
    }, [])

    const clearProgress = useCallback(() => {
        progressStore.clearProgress()
    }, [])

    // Return merged object with progress data and methods
    return {
        ...progress,
        updateProgress,
        clearProgress
    }
}

// Export store instance for external updates
export { progressStore }