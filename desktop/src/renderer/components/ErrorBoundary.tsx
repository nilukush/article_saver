/**
 * ENTERPRISE-GRADE ERROR BOUNDARY COMPONENT
 * 
 * Provides comprehensive error handling for React components
 * - Catches JavaScript errors in component tree
 * - Logs error details for debugging
 * - Provides graceful fallback UI
 * - Optimized for production environments
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '../utils/logger'

interface Props {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        }
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
            errorInfo: null
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Enterprise pattern: comprehensive error logging
        logger.error('ErrorBoundary caught an error', { error, componentStack: errorInfo.componentStack }, 'UI', 'ErrorBoundary')

        this.setState({
            error,
            errorInfo
        })

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo)

        // In production, send to error tracking service
        if (process.env.NODE_ENV === 'production') {
            // Note: Error tracking service (Sentry/LogRocket) would be integrated here
            logger.error('Production error captured', {
                error: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
            }, 'UI', 'ErrorBoundary')
        }
    }

    private handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        })
    }

    render() {
        if (this.state.hasError) {
            // Enterprise fallback UI with retry capability
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="flex items-center justify-center min-h-[200px] p-6 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-center max-w-md">
                        <div className="text-red-600 text-6xl mb-4">⚠️</div>
                        <h2 className="text-lg font-semibold text-red-800 mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-sm text-red-600 mb-4">
                            An unexpected error occurred while rendering this component.
                        </p>
                        
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-4 text-left">
                                <summary className="cursor-pointer text-sm font-medium text-red-700 hover:text-red-800">
                                    Error Details (Development)
                                </summary>
                                <div className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 font-mono">
                                    <div className="font-bold mb-1">Error:</div>
                                    <div className="mb-2">{this.state.error.message}</div>
                                    {this.state.error.stack && (
                                        <>
                                            <div className="font-bold mb-1">Stack:</div>
                                            <pre className="whitespace-pre-wrap text-xs">
                                                {this.state.error.stack}
                                            </pre>
                                        </>
                                    )}
                                </div>
                            </details>
                        )}

                        <button
                            onClick={this.handleRetry}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

/**
 * Enterprise HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode,
    onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
    return function WrappedComponent(props: P) {
        return (
            <ErrorBoundary fallback={fallback} onError={onError}>
                <Component {...props} />
            </ErrorBoundary>
        )
    }
}