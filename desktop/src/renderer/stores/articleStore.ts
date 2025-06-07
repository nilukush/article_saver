import { create } from 'zustand'
import type { Article, ApiResponse } from '@shared/types'

interface ArticleStore {
    articles: Article[]
    loading: boolean
    error: string | null
    searchResults: Article[] | null

    // Actions
    loadArticles: () => Promise<void>
    saveArticle: (url: string, tags?: string[]) => Promise<void>
    updateArticle: (id: string, updates: Partial<Article>) => Promise<void>
    deleteArticle: (id: string) => Promise<void>
    searchArticles: (query: string) => Promise<void>
    clearSearch: () => void
    setError: (error: string | null) => void
}

export const useArticleStore = create<ArticleStore>((set, get) => ({
    articles: [],
    loading: false,
    error: null,
    searchResults: null,

    loadArticles: async () => {
        set({ loading: true, error: null })
        try {
            const response: ApiResponse<Article[]> = await window.electronAPI.getArticles()
            if (response.success && response.data) {
                set({ articles: response.data, loading: false })
            } else {
                set({ error: response.error || 'Failed to load articles', loading: false })
            }
        } catch (error) {
            set({ error: 'Failed to load articles', loading: false })
        }
    },

    saveArticle: async (url: string, tags?: string[]) => {
        set({ loading: true, error: null })
        try {
            const response: ApiResponse<Article> = await window.electronAPI.saveArticle(url, tags)
            if (response.success && response.data) {
                const { articles } = get()
                set({
                    articles: [response.data, ...articles],
                    loading: false
                })
            } else {
                set({ error: response.error || 'Failed to save article', loading: false })
            }
        } catch (error) {
            set({ error: 'Failed to save article', loading: false })
        }
    },

    updateArticle: async (id: string, updates: Partial<Article>) => {
        try {
            const response: ApiResponse<Article> = await window.electronAPI.updateArticle(id, updates)
            if (response.success && response.data) {
                const { articles } = get()
                const updatedArticles = articles.map(article =>
                    article.id === id ? response.data! : article
                )
                set({ articles: updatedArticles })
            } else {
                set({ error: response.error || 'Failed to update article' })
            }
        } catch (error) {
            set({ error: 'Failed to update article' })
        }
    },

    deleteArticle: async (id: string) => {
        try {
            const response: ApiResponse<void> = await window.electronAPI.deleteArticle(id)
            if (response.success) {
                const { articles } = get()
                const filteredArticles = articles.filter(article => article.id !== id)
                set({ articles: filteredArticles })
            } else {
                set({ error: response.error || 'Failed to delete article' })
            }
        } catch (error) {
            set({ error: 'Failed to delete article' })
        }
    },

    searchArticles: async (query: string) => {
        set({ loading: true, error: null })
        try {
            const response: ApiResponse<Article[]> = await window.electronAPI.searchArticles(query)
            if (response.success && response.data) {
                set({
                    articles: response.data,
                    searchResults: response.data,
                    loading: false
                })
            } else {
                set({ error: response.error || 'Failed to search articles', loading: false })
            }
        } catch (error) {
            set({ error: 'Failed to search articles', loading: false })
        }
    },

    clearSearch: () => {
        set({ searchResults: null })
    },

    setError: (error: string | null) => {
        set({ error })
    }
}))
