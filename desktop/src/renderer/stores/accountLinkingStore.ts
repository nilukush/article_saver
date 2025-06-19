import { create } from 'zustand'

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
    linkAccount: (linkingToken: string, provider: string) => Promise<void>
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
            const serverUrl = localStorage.getItem('serverUrl') || 'http://localhost:3003'
            
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/account-linking/linked`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            
            if (response.success) {
                set({
                    currentUser: response.data.currentUser,
                    linkedAccounts: response.data.linkedAccounts,
                    loading: false
                })
            } else {
                set({ error: response.error || 'Failed to load linked accounts', loading: false })
            }
        } catch (err) {
            set({ 
                error: err instanceof Error ? err.message : 'Failed to load linked accounts', 
                loading: false 
            })
        }
    },
    
    linkAccount: async (linkingToken: string, provider: string) => {
        set({ loading: true, error: null })
        
        try {
            const serverUrl = localStorage.getItem('serverUrl') || 'http://localhost:3003'
            
            const response = await window.electronAPI.netFetch(`${serverUrl}/api/account-linking/oauth/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    linkingToken,
                    provider
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
            const serverUrl = localStorage.getItem('serverUrl') || 'http://localhost:3003'
            
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