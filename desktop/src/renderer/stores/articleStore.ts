import { create } from 'zustand'
import type { Article } from '../../../shared/types'
import { logger } from '../utils/logger'

interface ArticleStore {
    articles: Article[]
    loading: boolean
    error: string | null
    searchResults: Article[] | null

    // New pagination properties
    currentPage: number
    totalPages: number
    totalArticles: number
    hasMore: boolean
    loadingMore: boolean
    
    // Flag to prevent auto-loading after bulk deletion
    preventAutoLoad: boolean

    // Actions
    loadArticles: () => Promise<void>
    loadInitialArticles: () => Promise<void>
    loadMoreArticles: () => Promise<void>
    resetArticles: () => void
    saveArticle: (url: string, tags?: string[]) => Promise<void>
    updateArticle: (id: string, updates: Partial<Article>) => Promise<void>
    deleteArticle: (id: string) => Promise<void>
    searchArticles: (query: string) => Promise<void>
    clearSearch: () => void
    setError: (error: string | null) => void
    setPreventAutoLoad: (prevent: boolean) => void
}

// Get API URL from environment
const getApiUrl = () => {
    return (import.meta as any).env?.VITE_API_URL || 'http://localhost:3003'
}

// Get auth token from localStorage
const getAuthToken = () => {
    return localStorage.getItem('authToken')
}

// Make authenticated API request using Electron's net module
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken()
    const apiUrl = getApiUrl()

    if (!token) {
        throw new Error('Authentication required')
    }

    const response = await window.electronAPI.netFetch(`${apiUrl}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    })

    if (!response.success) {
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
            // Token expired or invalid
            localStorage.removeItem('authToken')
            throw new Error('Authentication expired. Please login again.')
        }
        throw new Error(response.error || 'API request failed')
    }

    return response.data
}

export const useArticleStore = create<ArticleStore>((set, get) => ({
    articles: [],
    loading: false,
    error: null,
    searchResults: null,

    // Pagination properties
    currentPage: 0,
    totalPages: 0,
    totalArticles: 0,
    hasMore: false,
    loadingMore: false,
    preventAutoLoad: false,

    loadArticles: async () => {
        set({ loading: true, error: null })
        try {
            const data = await apiRequest('/api/articles')

            if (data.articles) {
                set({ articles: data.articles, loading: false })
            } else {
                set({ articles: [], loading: false })
            }
        } catch (error) {
            logger.error('Error loading articles', error, 'Store', 'ArticleStore')
            const errorMessage = error instanceof Error ? error.message : 'Failed to load articles'
            set({ error: errorMessage, loading: false })
        }
    },

    saveArticle: async (url: string, tags?: string[]) => {
        set({ loading: true, error: null })
        try {
            const article = await apiRequest('/api/articles', {
                method: 'POST',
                body: JSON.stringify({
                    url,
                    tags: tags || []
                }),
            })

            if (article) {
                const { articles } = get()
                set({
                    articles: [article, ...articles],
                    loading: false
                })
            } else {
                throw new Error('Invalid response from server')
            }
        } catch (error) {
            logger.error('Error saving article', error, 'Store', 'ArticleStore')
            const errorMessage = error instanceof Error ? error.message : 'Failed to save article'
            set({ error: errorMessage, loading: false })
        }
    },

    updateArticle: async (id: string, updates: Partial<Article>) => {
        try {
            const { articles } = get();
            const localArticle = articles.find(a => a.id === id);
            
            // CRITICAL FIX: If local article has no userId, fetch it from backend first
            if (!localArticle?.userId) {
                try {
                    const backendArticle = await apiRequest(`/api/articles/${id}`, {
                        method: 'GET'
                    });
                    
                    // Update local cache with correct backend data
                    if (backendArticle && backendArticle.userId) {
                        const { articles } = get();
                        const updatedArticles = articles.map(article =>
                            article.id === id ? { ...article, ...backendArticle } : article
                        );
                        set({ articles: updatedArticles });
                    }
                } catch (fetchError) {
                    logger.error('Failed to refresh article from backend', fetchError, 'Store', 'ArticleStore');
                }
            }

            const updatedArticle = await apiRequest(`/api/articles/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            })

            if (updatedArticle) {
                const { articles } = get()
                const updatedArticles = articles.map(article =>
                    article.id === id ? updatedArticle : article
                )
                set({ articles: updatedArticles })
            } else {
                throw new Error('Invalid response from server')
            }
        } catch (error) {
            logger.error('Error updating article', { message: error instanceof Error ? error.message : 'Unknown error' }, 'Store', 'ArticleStore');
            const errorMessage = error instanceof Error ? error.message : 'Failed to update article'
            set({ error: errorMessage })
            throw error; // Re-throw to let caller handle it
        }
    },

    deleteArticle: async (id: string) => {
        try {
            await apiRequest(`/api/articles/${id}`, {
                method: 'DELETE',
            })

            const { articles } = get()
            const filteredArticles = articles.filter(article => article.id !== id)
            set({ articles: filteredArticles })
        } catch (error) {
            logger.error('Error deleting article', error, 'Store', 'ArticleStore')
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete article'
            set({ error: errorMessage })
        }
    },

    searchArticles: async (query: string) => {
        set({ loading: true, error: null })
        try {
            const data = await apiRequest(`/api/articles?search=${encodeURIComponent(query)}`)

            if (data.articles) {
                set({
                    searchResults: data.articles,
                    loading: false
                })
            } else {
                set({ searchResults: [], loading: false })
            }
        } catch (error) {
            logger.error('Error searching articles', error, 'Store', 'ArticleStore')
            const errorMessage = error instanceof Error ? error.message : 'Failed to search articles'
            set({ error: errorMessage, loading: false })
        }
    },

    clearSearch: () => {
        set({ searchResults: null })
    },

    loadInitialArticles: async () => {
        const { preventAutoLoad } = get()
        if (preventAutoLoad) {
            return
        }
        
        set({ loading: true, error: null })
        try {
            const data = await apiRequest('/api/articles?page=1&limit=100')

            if (data.articles && data.pagination) {
                set({
                    articles: data.articles,
                    currentPage: 1,
                    totalPages: data.pagination.pages,
                    totalArticles: data.pagination.total,
                    hasMore: data.pagination.page < data.pagination.pages,
                    loading: false
                })
            } else {
                set({
                    articles: [],
                    currentPage: 0,
                    totalPages: 0,
                    totalArticles: 0,
                    hasMore: false,
                    loading: false
                })
            }
        } catch (error) {
            logger.error('Error loading initial articles', error, 'Store', 'ArticleStore')
            const errorMessage = error instanceof Error ? error.message : 'Failed to load articles'
            set({ error: errorMessage, loading: false })
        }
    },

    loadMoreArticles: async () => {
        const { hasMore, loadingMore, currentPage } = get()

        if (!hasMore || loadingMore) {
            return
        }

        set({ loadingMore: true, error: null })

        try {
            const nextPage = currentPage + 1
            const data = await apiRequest(`/api/articles?page=${nextPage}&limit=50`)

            if (data.articles && data.pagination) {
                const { articles } = get()
                set({
                    articles: [...articles, ...data.articles],
                    currentPage: nextPage,
                    hasMore: nextPage < data.pagination.pages,
                    loadingMore: false
                })
            } else {
                set({ loadingMore: false })
            }
        } catch (error) {
            logger.error('Error loading more articles', error, 'Store', 'ArticleStore')
            const errorMessage = error instanceof Error ? error.message : 'Failed to load more articles'
            set({ error: errorMessage, loadingMore: false })
        }
    },

    resetArticles: () => {
        set({
            articles: [],
            currentPage: 0,
            totalPages: 0,
            totalArticles: 0,
            hasMore: false,
            loadingMore: false,
            loading: false,
            error: null,
            searchResults: null
        })
    },

    setError: (error: string | null) => {
        set({ error })
    },
    
    setPreventAutoLoad: (prevent: boolean) => {
        set({ preventAutoLoad: prevent })
    }
}))
