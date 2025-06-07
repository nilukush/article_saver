import React, { useState, useEffect } from 'react'
import { ArticleList } from './components/ArticleList'
import { ArticleReader } from './components/ArticleReader'
import { AddArticleForm } from './components/AddArticleForm'
import { SearchBar } from './components/SearchBar'
import { Sidebar } from './components/Sidebar'
import { useArticleStore } from './stores/articleStore'
import type { Article } from '@shared/types'

function App() {
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [currentView, setCurrentView] = useState<'all' | 'unread' | 'archived'>('all')

    const {
        articles,
        loading,
        error,
        loadArticles,
        searchArticles,
        clearSearch
    } = useArticleStore()

    useEffect(() => {
        loadArticles()
    }, [loadArticles])

    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        if (query.trim()) {
            await searchArticles(query)
        } else {
            clearSearch()
            await loadArticles()
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
        loadArticles() // Refresh the list
    }

    const filteredArticles = articles.filter(article => {
        switch (currentView) {
            case 'unread':
                return !article.isRead && !article.isArchived
            case 'archived':
                return article.isArchived
            default:
                return !article.isArchived
        }
    })

    if (selectedArticle) {
        return (
            <ArticleReader
                article={selectedArticle}
                onBack={handleBackToList}
            />
        )
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar
                currentView={currentView}
                onViewChange={setCurrentView}
                onAddArticle={handleAddArticle}
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
        </div>
    )
}

export default App
