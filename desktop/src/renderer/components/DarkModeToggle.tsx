import React from 'react'
import { useDarkModeContext } from '../contexts/DarkModeContext'

interface DarkModeToggleProps {
    size?: 'sm' | 'md' | 'lg'
    showLabel?: boolean
    className?: string
}

/**
 * Enterprise-grade Dark Mode Toggle Component
 * Supports three modes: light, dark, system
 * Follows accessibility best practices
 */
export function DarkModeToggle({ 
    size = 'md', 
    showLabel = true, 
    className = '' 
}: DarkModeToggleProps) {
    const { isDarkMode, preference, setPreference, toggle } = useDarkModeContext()

    const sizes = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg'
    }

    const getIcon = () => {
        switch (preference) {
            case 'light':
                return '☀️'
            case 'dark':
                return '🌙'
            case 'system':
                return '🖥️'
            default:
                return isDarkMode ? '🌙' : '☀️'
        }
    }

    const getLabel = () => {
        switch (preference) {
            case 'light':
                return 'Light mode'
            case 'dark':
                return 'Dark mode'
            case 'system':
                return 'System theme'
            default:
                return isDarkMode ? 'Dark mode' : 'Light mode'
        }
    }

    const handleCycle = () => {
        // Cycle through: light → dark → system → light
        switch (preference) {
            case 'light':
                setPreference('dark')
                break
            case 'dark':
                setPreference('system')
                break
            case 'system':
                setPreference('light')
                break
            default:
                setPreference('dark')
        }
    }

    return (
        <div className={`flex items-center ${className}`}>
            <button
                onClick={handleCycle}
                className={`
                    ${sizes[size]}
                    flex items-center justify-center
                    rounded-lg
                    bg-gray-100 hover:bg-gray-200
                    dark:bg-gray-800 dark:hover:bg-gray-700
                    text-gray-700 dark:text-gray-300
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                    dark:focus:ring-offset-gray-800
                    border border-gray-200 dark:border-gray-700
                    shadow-sm hover:shadow-md
                `}
                title={`Current: ${getLabel()}. Click to cycle themes.`}
                aria-label={`Theme toggle: ${getLabel()}`}
            >
                <span className="text-lg" role="img" aria-hidden="true">
                    {getIcon()}
                </span>
            </button>
            
            {showLabel && (
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getLabel()}
                </span>
            )}
        </div>
    )
}

/**
 * Simple toggle button (just light/dark, no system)
 */
export function DarkModeSimpleToggle({ className = '' }: { className?: string }) {
    const { isDarkMode, toggle } = useDarkModeContext()

    return (
        <button
            onClick={toggle}
            className={`
                w-10 h-10
                flex items-center justify-center
                rounded-lg
                bg-gray-100 hover:bg-gray-200
                dark:bg-gray-800 dark:hover:bg-gray-700
                text-gray-700 dark:text-gray-300
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
                border border-gray-200 dark:border-gray-700
                shadow-sm hover:shadow-md
                ${className}
            `}
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            aria-label={`Toggle theme: currently ${isDarkMode ? 'dark' : 'light'} mode`}
        >
            <span className="text-lg" role="img" aria-hidden="true">
                {isDarkMode ? '☀️' : '🌙'}
            </span>
        </button>
    )
}