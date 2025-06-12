import { useState, useEffect } from 'react'
import { ArticleList } from './components/ArticleList'
import { ArticleReader } from './components/ArticleReader'
import { AddArticleForm } from './components/AddArticleForm'
import { SearchBar } from './components/SearchBar'
import { Sidebar } from './components/Sidebar'
import { Settings } from './components/Settings'
import { ImportProgressHeader } from './components/ImportProgressHeader'
import { useArticleStore } from './stores/articleStore'
import type { Article } from '../../shared/types'

function App() {
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [currentView, setCurrentView] = useState<'all' | 'unread' | 'archived'>('all')
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const {
        articles,
        loading,
        error,
        searchResults,
        loadInitialArticles,
        searchArticles,
        clearSearch
    } = useArticleStore()

    useEffect(() => {
        // Check authentication status
        const token = localStorage.getItem('authToken')
        setIsAuthenticated(!!token)

        // Only load articles if authenticated
        if (token) {
            loadInitialArticles()
        }
    }, [loadInitialArticles])

    // Check for authentication changes
    useEffect(() => {
        const handleStorageChange = () => {
            const token = localStorage.getItem('authToken')
            setIsAuthenticated(!!token)
            if (token) {
                loadInitialArticles()
            }
        }

        // Check for authentication changes via storage events
        window.addEventListener('storage', handleStorageChange)

        // Also check periodically for authentication changes (for OAuth callbacks)
        const authCheckInterval = setInterval(() => {
            const token = localStorage.getItem('authToken')
            const currentAuth = !!token
            if (currentAuth !== isAuthenticated) {
                setIsAuthenticated(currentAuth)
                if (currentAuth) {
                    loadInitialArticles()
                }
            }
        }, 1000) // Check every second

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            clearInterval(authCheckInterval)
        }
    }, [loadInitialArticles, isAuthenticated])

    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        if (query.trim()) {
            await searchArticles(query)
        } else {
            clearSearch()
            await loadInitialArticles()
        }
    }

    const handleArticleSelect = (article: Article) => {
        setSelectedArticle(article)
    }

    const handleBackToList = () => {
        setSelectedArticle(null)
    }

    const handleAddArticle = () => {
        setShowAddForm(true)
    }

    const handleCloseAddForm = () => {
        setShowAddForm(false)
    }

    const handleArticleAdded = () => {
        setShowAddForm(false)
        loadInitialArticles() // Refresh the list
    }

    const handleOpenSettings = () => {
        setShowSettings(true)
    }

    const handleCloseSettings = () => {
        setShowSettings(false)
    }

    // Use search results if available, otherwise use filtered articles
    const displayArticles = searchResults || articles
    const filteredArticles = displayArticles.filter(article => {
        switch (currentView) {
            case 'unread':
                return !article.isRead && !article.isArchived
            case 'archived':
                return article.isArchived
            default:
                return !article.isArchived
        }
    })

    // Show login screen if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex-1 flex items-center justify-center">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                Article Saver
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Please login to access your articles
                            </p>
                        </div>

                        <button
                            onClick={handleOpenSettings}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                            <span>👤</span>
                            <span>Login / Register</span>
                        </button>

                        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            Your articles are stored securely in the cloud
                        </div>
                    </div>
                </div>

                {showSettings && (
                    <Settings onClose={handleCloseSettings} />
                )}
            </div>
        )
    }

    if (selectedArticle) {
        return (
            <ArticleReader
                article={selectedArticle}
                onBack={handleBackToList}
            />
        )
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 flex-col">
            {/* Import Progress Header - shows at top when imports are active */}
            <ImportProgressHeader />

            <div className="flex flex-1">
                <Sidebar
                    currentView={currentView}
                    onViewChange={setCurrentView}
                    onAddArticle={handleAddArticle}
                    onOpenSettings={handleOpenSettings}
                />

                <div className="flex-1 flex flex-col">
                    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {currentView === 'all' && 'All Articles'}
                                {currentView === 'unread' && 'Unread Articles'}
                                {currentView === 'archived' && 'Archived Articles'}
                            </h1>

                            <div className="flex items-center space-x-4">
                                <SearchBar
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    placeholder="Search articles..."
                                />

                                <button
                                    onClick={handleAddArticle}
                                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Add Article
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-hidden">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg m-4">
                                {error}
                            </div>
                        )}

                        <ArticleList
                            articles={filteredArticles}
                            loading={loading}
                            onArticleSelect={handleArticleSelect}
                            searchQuery={searchQuery}
                        />
                    </main>
                </div>

                {showAddForm && (
                    <AddArticleForm
                        onClose={handleCloseAddForm}
                        onArticleAdded={handleArticleAdded}
                    />
                )}

                {showSettings && (
                    <Settings onClose={handleCloseSettings} />
                )}
            </div>
        </div>
    )
}

export default App
