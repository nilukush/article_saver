export function ArticleSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/2"></div>
            <div className="flex justify-between">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
            </div>
        </div>
    )
}

export function ArticleSkeletonList({ count = 5 }: { count?: number }) {
    return (
        <div className="p-4 space-y-4">
            {Array.from({ length: count }).map((_, index) => (
                <ArticleSkeleton key={index} />
            ))}
        </div>
    )
}
