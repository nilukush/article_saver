
interface SidebarProps {
    currentView: 'all' | 'unread' | 'archived'
    onViewChange: (view: 'all' | 'unread' | 'archived') => void
    onAddArticle: () => void
    onOpenSettings: () => void
}

export function Sidebar({ currentView, onViewChange, onAddArticle, onOpenSettings }: SidebarProps) {
    const menuItems = [
        { id: 'all', label: 'All Articles', icon: '📚' },
        { id: 'unread', label: 'Unread', icon: '📖' },
        { id: 'archived', label: 'Archived', icon: '📦' },
    ] as const

    return (
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Article Saver
                </h2>
            </div>

            <nav className="flex-1 p-4 overflow-y-auto">
                <ul className="space-y-2">
                    {menuItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onViewChange(item.id)}
                                className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${currentView === item.id
                                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <span className="mr-3 text-lg">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Fixed bottom CTAs - always visible */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2 flex-shrink-0 bg-white dark:bg-gray-800">
                <button
                    onClick={onAddArticle}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                    <span className="mr-2">+</span>
                    Add Article
                </button>
                <button
                    onClick={onOpenSettings}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                    <span className="mr-2">👤</span>
                    Account
                </button>
            </div>
        </div>
    )
}
