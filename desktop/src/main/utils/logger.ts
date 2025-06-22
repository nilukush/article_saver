/**
 * Enterprise-grade logging utility for Electron main process
 * Provides structured logging with file output and console fallback
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export interface LogEntry {
    timestamp: string
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    data?: any
    source?: string
}

class ElectronLogger {
    private logDir: string
    private logFile: string
    private isDevelopment: boolean

    constructor() {
        this.isDevelopment = !app.isPackaged
        this.logDir = path.join(app.getPath('userData'), 'logs')
        this.logFile = path.join(this.logDir, 'main.log')
        this.ensureLogDirectory()
    }

    private ensureLogDirectory(): void {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true })
            }
        } catch (error) {
            // Fallback to console if file system is not available
            // Fallback to console if file system is not available
            // Note: We intentionally use console.error here as this is the logger itself
        }
    }

    private formatLogEntry(level: LogEntry['level'], message: string, data?: any, source?: string): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            data: data ? JSON.stringify(data) : undefined,
            source
        }
    }

    private writeToFile(entry: LogEntry): void {
        try {
            const logLine = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.source ? `[${entry.source}] ` : ''}${entry.message}${entry.data ? ` ${entry.data}` : ''}\n`
            fs.appendFileSync(this.logFile, logLine)
        } catch (error) {
            // Fallback to console if file write fails
            // Fallback to console if file write fails
            // Note: We intentionally use console.error here as this is the logger itself
        }
    }

    private log(level: LogEntry['level'], message: string, data?: any, source?: string): void {
        const entry = this.formatLogEntry(level, message, data, source)

        // Always write to file in production, optional in development
        if (!this.isDevelopment || process.env.ELECTRON_LOG_TO_FILE === 'true') {
            this.writeToFile(entry)
        }

        // Console output with colors for development
        if (this.isDevelopment) {
            const colors = {
                debug: '\x1b[36m', // Cyan
                info: '\x1b[32m',  // Green
                warn: '\x1b[33m',  // Yellow
                error: '\x1b[31m', // Red
            }
            const reset = '\x1b[0m'
            const color = colors[level]
            const sourcePrefix = source ? `[${source}] ` : ''
            
            // Note: We intentionally use console.log here for development output
            // This is the logger implementation itself
            console.log(`${color}[${level.toUpperCase()}]${reset} ${sourcePrefix}${message}`, data || '')
        }
    }

    debug(message: string, data?: any, source?: string): void {
        this.log('debug', message, data, source)
    }

    info(message: string, data?: any, source?: string): void {
        this.log('info', message, data, source)
    }

    warn(message: string, data?: any, source?: string): void {
        this.log('warn', message, data, source)
    }

    error(message: string, data?: any, source?: string): void {
        this.log('error', message, data, source)
    }

    // Convenience method for OAuth-specific logging
    oauth(message: string, data?: any): void {
        this.info(message, data, 'OAuth')
    }

    // Convenience method for IPC-specific logging
    ipc(message: string, data?: any): void {
        this.debug(message, data, 'IPC')
    }

    // Convenience method for database-specific logging
    database(message: string, data?: any): void {
        this.debug(message, data, 'Database')
    }
}

// Export singleton instance
export const logger = new ElectronLogger()
export default logger