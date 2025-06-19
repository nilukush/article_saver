import { useState, useEffect } from 'react'

interface AuthState {
    token: string | null
    email: string | null
    isAuthenticated: boolean
}

export const useAuth = () => {
    const [authState, setAuthState] = useState<AuthState>({
        token: null,
        email: null,
        isAuthenticated: false
    })

    useEffect(() => {
        // Check localStorage for auth token
        const token = localStorage.getItem('authToken') // Fixed: was looking for 'token' instead of 'authToken'
        const email = localStorage.getItem('userEmail')
        
        if (token && email) {
            setAuthState({
                token,
                email,
                isAuthenticated: true
            })
        }
    }, [])

    const login = (token: string, email: string) => {
        localStorage.setItem('authToken', token) // Fixed: save as 'authToken' to match
        localStorage.setItem('userEmail', email)
        setAuthState({
            token,
            email,
            isAuthenticated: true
        })
    }

    const logout = () => {
        localStorage.removeItem('authToken') // Fixed: remove 'authToken' to match
        localStorage.removeItem('userEmail')
        setAuthState({
            token: null,
            email: null,
            isAuthenticated: false
        })
    }

    return {
        ...authState,
        login,
        logout
    }
}