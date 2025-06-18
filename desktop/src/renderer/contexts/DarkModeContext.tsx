import React, { createContext, useContext, ReactNode } from 'react'
import { useDarkMode, UseDarkModeReturn } from '../hooks/useDarkMode'

interface DarkModeContextType extends UseDarkModeReturn {}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

interface DarkModeProviderProps {
    children: ReactNode
}

/**
 * Enterprise-grade Dark Mode Provider
 * Provides centralized dark mode state management across the entire application
 */
export function DarkModeProvider({ children }: DarkModeProviderProps) {
    const darkMode = useDarkMode()

    return (
        <DarkModeContext.Provider value={darkMode}>
            {children}
        </DarkModeContext.Provider>
    )
}

/**
 * Hook to consume dark mode context
 * @throws Error if used outside of DarkModeProvider
 */
export function useDarkModeContext(): DarkModeContextType {
    const context = useContext(DarkModeContext)
    
    if (context === undefined) {
        throw new Error('useDarkModeContext must be used within a DarkModeProvider')
    }
    
    return context
}

/**
 * HOC for components that need dark mode awareness
 */
export function withDarkMode<P extends object>(
    Component: React.ComponentType<P & { isDarkMode: boolean }>
) {
    return function DarkModeAwareComponent(props: P) {
        const { isDarkMode } = useDarkModeContext()
        return <Component {...props} isDarkMode={isDarkMode} />
    }
}