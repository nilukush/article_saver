/// <reference types="electron" />
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { Article, UpdateArticleRequest, ApiResponse } from '../../../shared/types'

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

    // OAuth URL opening
    openOAuthUrl: (url: string): Promise<ApiResponse<void>> =>
        ipcRenderer.invoke('open-oauth-url', url),

    // Create OAuth server
    createOAuthServer: (): Promise<ApiResponse<{ port: number }>> =>
        ipcRenderer.invoke('create-oauth-server'),

    // OAuth callback handlers
    onOAuthCallback: (callback: (data: { provider: string; code: string }) => void) =>
        ipcRenderer.on('oauth-callback', (_event: IpcRendererEvent, data) => callback(data)),

    onOAuthError: (callback: (data: { provider: string; error: string }) => void) =>
        ipcRenderer.on('oauth-error', (_event: IpcRendererEvent, data) => callback(data)),

    onOAuthSuccess: (callback: (data: { provider: string; token: string; email: string }) => void) =>
        ipcRenderer.on('oauth-success', (_event: IpcRendererEvent, data) => callback(data)),

    onOAuthAccountLinking: (callback: (data: { provider: string; existingProvider: string; linkingToken: string; email: string; action: string; token?: string; trustLevel?: string; requiresVerification?: string }) => void) =>
        ipcRenderer.on('oauth-account-linking', (_event: IpcRendererEvent, data) => callback(data)),

    removeOAuthListeners: () => {
        ipcRenderer.removeAllListeners('oauth-callback')
        ipcRenderer.removeAllListeners('oauth-error')
        ipcRenderer.removeAllListeners('oauth-success')
        ipcRenderer.removeAllListeners('oauth-account-linking')
    },

    // Network fetch using Electron's net module (bypasses protocol interception)
    netFetch: (url: string, options?: RequestInit): Promise<ApiResponse<unknown>> =>
        ipcRenderer.invoke('net-fetch', url, options),
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
            openOAuthUrl: (url: string) => Promise<ApiResponse<void>>
            createOAuthServer: () => Promise<ApiResponse<{ port: number }>>
            onOAuthCallback: (callback: (data: { provider: string; code: string }) => void) => void
            onOAuthError: (callback: (data: { provider: string; error: string }) => void) => void
            onOAuthSuccess: (callback: (data: { provider: string; token: string; email: string }) => void) => void
            onOAuthAccountLinking: (callback: (data: { provider: string; existingProvider: string; linkingToken: string; email: string; action: string; token?: string; trustLevel?: string; requiresVerification?: string }) => void) => void
            removeOAuthListeners: () => void
            netFetch: (url: string, options?: RequestInit) => Promise<ApiResponse<unknown>>
        }
    }
}
