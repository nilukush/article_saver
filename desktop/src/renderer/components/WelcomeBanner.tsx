import { useState, useEffect } from 'react'
import { useArticleStore } from '../stores/articleStore'

interface WelcomeBannerProps {
    onExtractContent?: () => void
    onSync?: () => void
}

export function WelcomeBanner({ onExtractContent, onSync }: WelcomeBannerProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [stats, setStats] = useState<{ total: number; unread: number; read: number } | null>(null)
    const [hasLimitedContent, setHasLimitedContent] = useState(false)
    const { articles } = useArticleStore()

    useEffect(() => {
        // Check if this is first login or if we should show the banner
        const lastDismissed = localStorage.getItem('welcomeBannerDismissed')
        const lastDismissedTime = lastDismissed ? parseInt(lastDismissed) : 0
        const hoursSinceDismissed = (Date.now() - lastDismissedTime) / (1000 * 60 * 60)
        
        // Show banner if never dismissed or dismissed more than 24 hours ago
        if (!lastDismissed || hoursSinceDismissed > 24) {
            setIsVisible(true)
        }

        // Calculate stats
        if (articles.length > 0) {
            const unread = articles.filter(a => !a.isRead && !a.isArchived).length
            const read = articles.filter(a => a.isRead && !a.isArchived).length
            setStats({ total: articles.length, unread, read })
            
            // Check for limited content
            const limited = articles.some(a => a.content && a.content.length < 500)
            setHasLimitedContent(limited)
        }
    }, [articles])

    const handleDismiss = () => {
        setIsVisible(false)
        localStorage.setItem('welcomeBannerDismissed', Date.now().toString())
    }

    if (!isVisible || !stats) return null

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="text-2xl">👋</span>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Welcome back!
                            </h3>
                        </div>
                        
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            You have <span className="font-semibold">{stats.total.toLocaleString()} articles</span> 
                            {' '}• <span className="text-blue-600 dark:text-blue-400">{stats.unread.toLocaleString()} unread</span>
                            {' '}• <span className="text-green-600 dark:text-green-400">{stats.read.toLocaleString()} read</span>
                        </p>

                        <div className="flex items-center space-x-3">
                            {hasLimitedContent && onExtractContent && (
                                <button
                                    onClick={onExtractContent}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                                >
                                    <span>📄</span>
                                    <span>Extract Full Content</span>
                                </button>
                            )}
                            
                            {onSync && (
                                <button
                                    onClick={onSync}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                                >
                                    <span>🔄</span>
                                    <span>Sync with Pocket</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 ml-4"
                        aria-label="Dismiss banner"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}