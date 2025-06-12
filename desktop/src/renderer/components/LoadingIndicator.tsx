export function LoadingIndicator() {
    return (
        <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="text-gray-500 dark:text-gray-400">Loading more articles...</span>
            </div>
        </div>
    )
}
