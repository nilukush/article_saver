import React, { useState } from 'react'
import { useArticleStore } from '../stores/articleStore'

interface AddArticleFormProps {
    onClose: () => void
    onArticleAdded: () => void
}

export function AddArticleForm({ onClose, onArticleAdded }: AddArticleFormProps) {
    const [url, setUrl] = useState('')
    const [tags, setTags] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const { saveArticle } = useArticleStore()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!url.trim()) {
            setError('Please enter a URL')
            return
        }

        try {
            new URL(url) // Validate URL
        } catch {
            setError('Please enter a valid URL')
            return
        }

        setLoading(true)
        setError('')

        try {
            const tagArray = tags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)

            await saveArticle(url, tagArray)
            onArticleAdded()
        } catch (err) {
            setError('Failed to save article. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Add Article
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Article URL
                        </label>
                        <input
                            type="url"
                            id="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/article"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tags (optional)
                        </label>
                        <input
                            type="text"
                            id="tags"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="technology, programming, web"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Separate tags with commas
                        </p>
                    </div>

                    {error && (
                        <div className="text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors"
                        >
                            {loading ? 'Saving...' : 'Save Article'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
