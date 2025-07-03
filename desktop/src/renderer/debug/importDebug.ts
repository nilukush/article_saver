/**
 * Debug utility for import progress issues
 */

import { getApiUrl } from '../../config/production'

export async function debugImportProgress(sessionId: string) {
    console.log('=== IMPORT DEBUG START ===')
    console.log('Session ID:', sessionId)
    console.log('API URL:', getApiUrl())
    
    const token = localStorage.getItem('authToken')
    if (!token) {
        console.error('No auth token found!')
        return
    }
    
    try {
        const url = `${getApiUrl()}/api/pocket/progress/${sessionId}?t=${Date.now()}`
        console.log('Fetching from:', url)
        
        const response = await window.electronAPI.netFetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        })
        
        console.log('Response:', response)
        
        if (response.success && response.data) {
            console.log('Progress data:', response.data)
            const data = response.data
            const progressData = data.session?.progress || data
            
            console.log('Total articles:', progressData.totalArticles || progressData.total || 0)
            console.log('Articles processed:', progressData.articlesProcessed || progressData.current || 0)
            console.log('Current action:', progressData.currentAction || progressData.action || 'Processing...')
            console.log('Status:', data.session?.status || data.status)
        } else {
            console.error('Failed to get progress:', response)
        }
    } catch (error) {
        console.error('Error fetching progress:', error)
    }
    
    console.log('=== IMPORT DEBUG END ===')
}

// Expose to window for console debugging
if (typeof window !== 'undefined') {
    (window as any).debugImportProgress = debugImportProgress
}