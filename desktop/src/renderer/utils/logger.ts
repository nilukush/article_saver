/**
 * Enterprise-grade logging utility for Electron renderer process
 * Provides structured logging with IPC communication to main process
 */

export interface LogEntry {
    timestamp: string
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    data?: any
    source?: string
    component?: string
}

class RendererLogger {
    private isDevelopment: boolean

    constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development'
    }

    private formatLogEntry(level: LogEntry['level'], message: string, data?: any, source?: string, component?: string): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            data: data ? (typeof data === 'object' ? data : { value: data }) : undefined,
            source,
            component
        }
    }

    private log(level: LogEntry['level'], message: string, data?: any, source?: string, component?: string): void {
        const entry = this.formatLogEntry(level, message, data, source, component)

        // In development, log to console with colors
        if (this.isDevelopment) {
            const colors = {
                debug: '\x1b[36m', // Cyan
                info: '\x1b[32m',  // Green
                warn: '\x1b[33m',  // Yellow
                error: '\x1b[31m', // Red
            }
            const reset = '\x1b[0m'
            const color = colors[level]
            const prefixes = [
                component && `[${component}]`,
                source && `[${source}]`
            ].filter(Boolean).join(' ')
            
            // Note: We intentionally use console.log here for development output
            // This is the logger implementation itself
            console.log(`${color}[${level.toUpperCase()}]${reset} ${prefixes} ${message}`, data || '')
        }

        // TODO: Send to main process for file logging when IPC method is implemented
        // if (typeof window !== 'undefined' && window.electronAPI?.log) {
        //     window.electronAPI.log(entry)
        // }
    }

    debug(message: string, data?: any, source?: string, component?: string): void {
        this.log('debug', message, data, source, component)
    }

    info(message: string, data?: any, source?: string, component?: string): void {
        this.log('info', message, data, source, component)
    }

    warn(message: string, data?: any, source?: string, component?: string): void {
        this.log('warn', message, data, source, component)
    }

    error(message: string, data?: any, source?: string, component?: string): void {
        this.log('error', message, data, source, component)
    }

    // Convenience methods for common logging scenarios
    oauth(message: string, data?: any, component?: string): void {
        this.info(message, data, 'OAuth', component)
    }

    auth(message: string, data?: any, component?: string): void {
        this.info(message, data, 'Auth', component)
    }

    api(message: string, data?: any, component?: string): void {
        this.debug(message, data, 'API', component)
    }

    store(message: string, data?: any, component?: string): void {
        this.debug(message, data, 'Store', component)
    }

    ui(message: string, data?: any, component?: string): void {
        this.debug(message, data, 'UI', component)
    }

    sync(message: string, data?: any, component?: string): void {
        this.info(message, data, 'Sync', component)
    }
}

// Export singleton instance
export const logger = new RendererLogger()
export default logger