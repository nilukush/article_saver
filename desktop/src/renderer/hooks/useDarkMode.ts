import { useState, useEffect } from 'react'

export type DarkModePreference = 'light' | 'dark' | 'system'

interface DarkModeState {
    isDarkMode: boolean
    preference: DarkModePreference
    systemPreference: boolean
}

interface DarkModeActions {
    setPreference: (preference: DarkModePreference) => void
    toggle: () => void
}

export interface UseDarkModeReturn extends DarkModeState, DarkModeActions {}

/**
 * Enterprise-grade dark mode hook with system preference support
 * Follows industry standards from GitHub, Vercel, and other major platforms
 */
export function useDarkMode(): UseDarkModeReturn {
    // Get initial preference from localStorage or default to system
    const getInitialPreference = (): DarkModePreference => {
        if (typeof window === 'undefined') return 'system'
        
        try {
            const stored = localStorage.getItem('article-saver-theme')
            if (stored === 'light' || stored === 'dark' || stored === 'system') {
                return stored
            }
        } catch (error) {
            console.warn('Failed to read theme preference from localStorage:', error)
        }
        
        return 'system'
    }

    // Get system preference
    const getSystemPreference = (): boolean => {
        if (typeof window === 'undefined') return false
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    const [preference, setPreferenceState] = useState<DarkModePreference>(getInitialPreference)
    const [systemPreference, setSystemPreference] = useState<boolean>(getSystemPreference)

    // Calculate actual dark mode state
    const isDarkMode = preference === 'dark' || (preference === 'system' && systemPreference)

    // Apply dark mode class to document
    const applyDarkMode = (dark: boolean) => {
        try {
            const htmlElement = document.documentElement
            const bodyElement = document.body

            if (dark) {
                htmlElement.classList.add('dark')
                bodyElement.classList.add('dark')
                // Set CSS custom property for additional styling
                htmlElement.style.setProperty('--color-scheme', 'dark')
            } else {
                htmlElement.classList.remove('dark')
                bodyElement.classList.remove('dark')
                htmlElement.style.setProperty('--color-scheme', 'light')
            }

            // Update meta theme-color for native integration
            const themeColorMeta = document.querySelector('meta[name="theme-color"]')
            if (themeColorMeta) {
                themeColorMeta.setAttribute('content', dark ? '#111827' : '#ffffff')
            } else {
                const meta = document.createElement('meta')
                meta.name = 'theme-color'
                meta.content = dark ? '#111827' : '#ffffff'
                document.head.appendChild(meta)
            }

            console.log('🌙 DARK MODE APPLIED:', {
                isDark: dark,
                preference,
                systemPreference,
                htmlClass: htmlElement.className,
                bodyClass: bodyElement.className
            })
        } catch (error) {
            console.error('Failed to apply dark mode:', error)
        }
    }

    // Set preference and persist to localStorage
    const setPreference = (newPreference: DarkModePreference) => {
        try {
            localStorage.setItem('article-saver-theme', newPreference)
            setPreferenceState(newPreference)
            
            console.log('🎨 THEME PREFERENCE CHANGED:', {
                from: preference,
                to: newPreference,
                systemPreference
            })
        } catch (error) {
            console.error('Failed to save theme preference:', error)
            setPreferenceState(newPreference) // Still update state even if localStorage fails
        }
    }

    // Toggle between light and dark (skips system)
    const toggle = () => {
        const newPreference = isDarkMode ? 'light' : 'dark'
        setPreference(newPreference)
    }

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        
        const handleSystemChange = (e: MediaQueryListEvent) => {
            setSystemPreference(e.matches)
            console.log('🖥️ SYSTEM PREFERENCE CHANGED:', e.matches)
        }

        mediaQuery.addEventListener('change', handleSystemChange)
        return () => mediaQuery.removeEventListener('change', handleSystemChange)
    }, [])

    // Apply dark mode whenever the computed state changes
    useEffect(() => {
        applyDarkMode(isDarkMode)
    }, [isDarkMode, preference, systemPreference])

    // Initialize dark mode on mount
    useEffect(() => {
        // Force initial application
        applyDarkMode(isDarkMode)
        
        // Add transition class after initial load for smooth transitions
        setTimeout(() => {
            document.documentElement.classList.add('theme-transition')
        }, 100)
    }, [])

    return {
        isDarkMode,
        preference,
        systemPreference,
        setPreference,
        toggle
    }
}