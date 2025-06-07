import React from 'react'
import { useArticleStore } from '../stores/articleStore'
import type { Article } from '@shared/types'

interface ArticleReaderProps {
    article: Article
    onBack: () => void
}

export function ArticleReader({ article, onBack }: ArticleReaderProps) {
    const { updateArticle } = useArticleStore()

    const handleMarkAsRead = async () => {
        if (!article.isRead) {
            await updateArticle(article.id, { isRead: true })
        }
    }

    const handleToggleArchive = async () => {
        await updateArticle(article.id, { isArchived: !article.isArchived })
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname
        } catch {
            return url
        }
    }

    // Mark as read when component mounts
    React.useEffect(() => {
        handleMarkAsRead()
    }, [])

    return (
        <div className="h-screen bg-white dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <span className="mr-2">←</span>
                        Back to Articles
                    </button>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleToggleArchive}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            {article.isArchived ? 'Unarchive' : 'Archive'}
                        </button>

                        <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
                        >
                            View Original
                        </a>
                    </div>
                </div>
            </header>

            {/* Article Content */}
            <main className="flex-1 overflow-y-auto">
                <article className="max-w-4xl mx-auto px-6 py-8">
                    {/* Article Meta */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                            {article.title || 'Untitled'}
                        </h1>

                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 space-x-4 mb-4">
                            <span>{getDomain(article.url)}</span>
                            {article.author && <span>by {article.author}</span>}
                            <span>{formatDate(article.createdAt)}</span>
                        </div>

                        {article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6">
                                {article.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm px-3 py-1 rounded-full"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {article.excerpt && (
                            <div className="text-lg text-gray-600 dark:text-gray-300 italic border-l-4 border-primary-500 pl-4 mb-6">
                                {article.excerpt}
                            </div>
                        )}
                    </div>

                    {/* Article Body */}
                    <div
                        className="article-content prose prose-lg dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: article.content || '' }}
                    />
                </article>
            </main>
        </div>
    )
}
