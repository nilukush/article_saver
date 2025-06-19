import { useState, useEffect } from 'react'
import { useArticleStore } from '../stores/articleStore'

export function AccountInfo() {
    const [email, setEmail] = useState<string>('')
    const [lastSync, setLastSync] = useState<string>('')
    const { articles, totalArticles } = useArticleStore()

    useEffect(() => {
        // Get user email
        const userEmail = localStorage.getItem('userEmail')
        if (userEmail) {
            setEmail(userEmail)
        }

        // Update sync time periodically
        const updateSyncTime = () => {
            const lastImport = localStorage.getItem('lastPocketImport')
            if (lastImport) {
                const date = new Date(lastImport)
                const now = new Date()
                const diff = now.getTime() - date.getTime()
                
                // Validate the timestamp is reasonable (not in the future, not too old)
                if (isNaN(diff) || diff < 0 || diff > 365 * 24 * 60 * 60 * 1000) {
                    // Invalid or unreasonable timestamp, clear it
                    localStorage.removeItem('lastPocketImport')
                    setLastSync('')
                    return
                }
                
                if (diff < 60000) { // Less than 1 minute
                    setLastSync('Just now')
                } else if (diff < 3600000) { // Less than 1 hour
                    const minutes = Math.floor(diff / 60000)
                    setLastSync(`${minutes}m ago`)
                } else if (diff < 86400000) { // Less than 1 day
                    const hours = Math.floor(diff / 3600000)
                    setLastSync(`${hours}h ago`)
                } else {
                    const days = Math.floor(diff / 86400000)
                    setLastSync(`${days}d ago`)
                }
            } else {
                setLastSync('')
            }
        }

        // Update immediately
        updateSyncTime()

        // Update every minute
        const interval = setInterval(updateSyncTime, 60000)

        return () => clearInterval(interval)
    }, [articles])

    const unreadCount = articles.filter(a => !a.isRead && !a.isArchived).length
    const displayTotal = totalArticles || articles.length

    return (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
                <div className="truncate mb-1">{email}</div>
                <div className="flex justify-between items-center">
                    <span>{displayTotal.toLocaleString()} articles</span>
                    {lastSync && (
                        <span className="text-gray-400 dark:text-gray-500">
                            Synced {lastSync}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}