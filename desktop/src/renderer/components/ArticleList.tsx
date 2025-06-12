import type { Article } from '../../../shared/types'
import { useArticleStore } from '../stores/articleStore'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { LoadingIndicator } from './LoadingIndicator'
import { ArticleSkeletonList } from './ArticleSkeleton'

interface ArticleListProps {
    articles: Article[]
    loading: boolean
    onArticleSelect: (article: Article) => void
    searchQuery?: string
}

export function ArticleList({ articles, loading, onArticleSelect, searchQuery }: ArticleListProps) {
    const {
        loadMoreArticles,
        hasMore,
        loadingMore,
        totalArticles,
        currentPage,
        totalPages
    } = useArticleStore()

    const { isFetching } = useInfiniteScroll({
        threshold: 0.8,
        onLoadMore: loadMoreArticles,
        hasMore,
        loading: loadingMore
    })
    if (loading && articles.length === 0) {
        return <ArticleSkeletonList count={10} />
    }

    if (articles.length === 0 && !loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="text-gray-500 dark:text-gray-400 mb-2">
                        {searchQuery ? 'No articles found for your search.' : 'No articles yet.'}
                    </div>
                    {!searchQuery && (
                        <div className="text-sm text-gray-400 dark:text-gray-500">
                            Click "Add Article" to save your first article.
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="overflow-y-auto h-full">
            <div className="p-4 space-y-4">
                {/* Article count header */}
                {totalArticles > 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center justify-between">
                        <span>
                            Showing {articles.length} of {totalArticles} articles
                            {searchQuery && ` for "${searchQuery}"`}
                        </span>
                        {totalPages > 1 && (
                            <span className="text-xs">
                                Page {currentPage} of {totalPages}
                            </span>
                        )}
                    </div>
                )}

                {/* Article cards */}
                {articles.map((article) => (
                    <ArticleCard
                        key={article.id}
                        article={article}
                        onClick={() => onArticleSelect(article)}
                    />
                ))}

                {/* Loading indicator for infinite scroll */}
                {(loadingMore || isFetching) && <LoadingIndicator />}

                {/* Load more fallback button */}
                {!hasMore && articles.length > 0 && (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        <div className="text-sm">
                            All articles loaded ({totalArticles} total)
                        </div>
                        {totalArticles >= 100 && (
                            <div className="text-xs mt-1">
                                🎉 Great collection! You have {totalArticles} articles saved.
                            </div>
                        )}
                    </div>
                )}

                {/* Error state with retry */}
                {!loading && !loadingMore && hasMore && articles.length > 0 && (
                    <div className="text-center py-4">
                        <button
                            onClick={loadMoreArticles}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Load More Articles
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

interface ArticleCardProps {
    article: Article
    onClick: () => void
}

function ArticleCard({ article, onClick }: ArticleCardProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
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

    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {article.title || 'Untitled'}
                </h3>
                {!article.isRead && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2 ml-2"></div>
                )}
            </div>

            {article.excerpt && (
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-3">
                    {(() => {
                        const cleanText = article.excerpt
                            .replace(/<[^>]*>/g, '') // Remove HTML tags
                            .replace(/&[^;]+;/g, ' ') // Remove HTML entities
                            .replace(/\s+/g, ' ') // Normalize whitespace
                            .trim();
                        return cleanText.length > 200 ? cleanText.substring(0, 200) + '...' : cleanText;
                    })()}
                </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                    <span>{getDomain(article.url)}</span>
                    {article.author && <span>by {article.author}</span>}
                </div>
                <span>{formatDate(article.createdAt)}</span>
            </div>

            {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {article.tags.slice(0, 3).map((tag, index) => (
                        <span
                            key={index}
                            className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded"
                        >
                            {tag}
                        </span>
                    ))}
                    {article.tags.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{article.tags.length - 3} more
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
