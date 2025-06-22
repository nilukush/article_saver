import { create } from 'zustand'
import { logger } from '../utils/logger'

interface LinkedAccount {
    id: string
    user: {
        id: string
        email: string
        provider: string
        createdAt: string
    }
    isPrimary: boolean
    linkedAt: string
}

interface AccountLinkingState {
    currentUser: {
        id: string
        email: string
        provider: string
        createdAt: string
    } | null
    linkedAccounts: LinkedAccount[]
    loading: boolean
    error: string | null
    
    // Actions
    loadLinkedAccounts: () => Promise<void>
    linkAccount: (linkingToken: string, provider: string, verificationCode?: string) => Promise<void>
    unlinkAccount: (linkId: string) => Promise<void>
    setError: (error: string | null) => void
}

export const useAccountLinkingStore = create<AccountLinkingState>((set, get) => ({
    currentUser: null,
    linkedAccounts: [],
    loading: false,
    error: null,
    
    loadLinkedAccounts: async () => {
        set({ loading: true, error: null })
        
        try {
            const token = localStorage.getItem('authToken')
            const serverUrl = 'http://localhost:3003' // Backend runs on port 3003
            
            if (!token) {
                set({ error: 'Not authenticated. Please log in.', loading: false })
                return
            }
            
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/account-linking/linked`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            
            logger.info('Account linking response received', { response }, 'Store', 'AccountLinkingStore')
            
            if (response.success && response.data) {
                set({
                    currentUser: response.data.currentUser,
                    linkedAccounts: response.data.linkedAccounts || [],
                    loading: false
                })
            } else {
                const errorMessage = response.error || response.data?.error || response.data?.message || 'Failed to load linked accounts'
                logger.error('Account linking error', { errorMessage, status: response.status }, 'Store', 'AccountLinkingStore')
                
                // If token is invalid/expired, prompt to re-login
                if (response.status === 403 || response.status === 401) {
                    set({ error: 'Session expired. Please log in again.', loading: false })
                } else {
                    set({ error: errorMessage, loading: false })
                }
            }
        } catch (err) {
            set({ 
                error: err instanceof Error ? err.message : 'Failed to load linked accounts', 
                loading: false 
            })
        }
    },
    
    linkAccount: async (linkingToken: string, provider: string, verificationCode?: string) => {
        set({ loading: true, error: null })
        
        try {
            const serverUrl = 'http://localhost:3003' // Backend runs on port 3003
            
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/account-linking/complete-oauth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    linkingToken,
                    verificationCode
                })
            })
            
            if (response.success) {
                const data = response.data
                // Update auth token with the new one that includes linked accounts
                localStorage.setItem('authToken', data.token)
                
                // Update user email if provided
                if (data.user && data.user.email) {
                    localStorage.setItem('userEmail', data.user.email)
                }
                
                // Reload linked accounts
                await get().loadLinkedAccounts()
                
                // CRITICAL: Refresh articles to show all linked account articles
                const articleStore = await import('./articleStore')
                if (articleStore.useArticleStore && typeof articleStore.useArticleStore.getState === 'function') {
                    articleStore.useArticleStore.getState().loadInitialArticles()
                }
                
                set({ loading: false })
            } else {
                set({ error: response.error || 'Failed to link account', loading: false })
            }
        } catch (err) {
            set({ 
                error: err instanceof Error ? err.message : 'Failed to link account', 
                loading: false 
            })
        }
    },
    
    unlinkAccount: async (linkId: string) => {
        set({ loading: true, error: null })
        
        try {
            const token = localStorage.getItem('authToken')
            const serverUrl = 'http://localhost:3003' // Backend runs on port 3003
            
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/account-linking/unlink/${linkId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            
            if (response.success) {
                // Reload linked accounts
                await get().loadLinkedAccounts()
                set({ loading: false })
            } else {
                set({ error: response.error || 'Failed to unlink account', loading: false })
            }
        } catch (err) {
            set({ 
                error: err instanceof Error ? err.message : 'Failed to unlink account', 
                loading: false 
            })
        }
    },
    
    setError: (error: string | null) => set({ error })
}))