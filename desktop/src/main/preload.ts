import { contextBridge, ipcRenderer } from 'electron'
import type { Article, UpdateArticleRequest, ApiResponse } from '../../shared/types'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Article operations
    saveArticle: (url: string, tags?: string[]): Promise<ApiResponse<Article>> =>
        ipcRenderer.invoke('save-article', url, tags),

    getArticles: (options?: { limit?: number; offset?: number }): Promise<ApiResponse<Article[]>> =>
        ipcRenderer.invoke('get-articles', options),

    getArticle: (id: string): Promise<ApiResponse<Article>> =>
        ipcRenderer.invoke('get-article', id),

    updateArticle: (id: string, updates: UpdateArticleRequest): Promise<ApiResponse<Article>> =>
        ipcRenderer.invoke('update-article', id, updates),

    deleteArticle: (id: string): Promise<ApiResponse<void>> =>
        ipcRenderer.invoke('delete-article', id),

    searchArticles: (query: string): Promise<ApiResponse<Article[]>> =>
        ipcRenderer.invoke('search-articles', query),
})

// Type definitions for the exposed API
declare global {
    interface Window {
        electronAPI: {
            saveArticle: (url: string, tags?: string[]) => Promise<ApiResponse<Article>>
            getArticles: (options?: { limit?: number; offset?: number }) => Promise<ApiResponse<Article[]>>
            getArticle: (id: string) => Promise<ApiResponse<Article>>
            updateArticle: (id: string, updates: UpdateArticleRequest) => Promise<ApiResponse<Article>>
            deleteArticle: (id: string) => Promise<ApiResponse<void>>
            searchArticles: (query: string) => Promise<ApiResponse<Article[]>>
        }
    }
}
