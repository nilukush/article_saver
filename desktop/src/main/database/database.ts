import path from 'path'
import fs from 'fs/promises'
import { app } from 'electron'
import type { Article } from '../../../../shared/types'

export class DatabaseService {
    private dbPath: string
    private isInitialized = false
    private articles: Article[] = []

    constructor() {
        const userDataPath = app.getPath('userData')
        this.dbPath = path.join(userDataPath, 'articles.json')
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) return

        try {
            // Try to load existing data
            try {
                const data = await fs.readFile(this.dbPath, 'utf-8')
                this.articles = JSON.parse(data)
                console.log(`Loaded ${this.articles.length} articles from database`)
            } catch (error) {
                // File doesn't exist, start with empty array
                this.articles = []
                console.log('Creating new database file')
                await this.saveToFile()
            }

            this.isInitialized = true
            console.log('Database initialized successfully')
        } catch (error) {
            console.error('Failed to initialize database:', error)
            throw error
        }
    }

    private async saveToFile(): Promise<void> {
        try {
            await fs.writeFile(this.dbPath, JSON.stringify(this.articles, null, 2))
        } catch (error) {
            console.error('Failed to save database:', error)
            throw error
        }
    }

    // Article operations
    async insertArticle(article: Omit<Article, 'createdAt' | 'updatedAt'>): Promise<Article> {
        if (!this.isInitialized) throw new Error('Database not initialized')

        const now = new Date().toISOString()
        const newArticle: Article = {
            ...article,
            createdAt: now,
            updatedAt: now
        }

        this.articles.unshift(newArticle) // Add to beginning for newest first
        await this.saveToFile()

        console.log('Article saved:', newArticle.title)
        return newArticle
    }

    async getArticle(id: string): Promise<Article | null> {
        if (!this.isInitialized) throw new Error('Database not initialized')

        const article = this.articles.find(a => a.id === id)
        return article || null
    }

    async getArticles(options: { limit?: number; offset?: number } = {}): Promise<Article[]> {
        if (!this.isInitialized) throw new Error('Database not initialized')

        const { limit = 50, offset = 0 } = options

        // Filter out archived articles and apply pagination
        const activeArticles = this.articles
            .filter(article => !article.isArchived)
            .slice(offset, offset + limit)

        return activeArticles
    }

    async updateArticle(id: string, updates: Partial<Article>): Promise<Article | null> {
        if (!this.isInitialized) throw new Error('Database not initialized')

        const index = this.articles.findIndex(a => a.id === id)
        if (index === -1) return null

        const now = new Date().toISOString()
        this.articles[index] = {
            ...this.articles[index],
            ...updates,
            updatedAt: now
        }

        await this.saveToFile()
        return this.articles[index]
    }

    async deleteArticle(id: string): Promise<boolean> {
        if (!this.isInitialized) throw new Error('Database not initialized')

        const index = this.articles.findIndex(a => a.id === id)
        if (index === -1) return false

        this.articles.splice(index, 1)
        await this.saveToFile()
        return true
    }

    async searchArticles(query: string): Promise<Article[]> {
        if (!this.isInitialized) throw new Error('Database not initialized')

        const searchTerm = query.toLowerCase()

        return this.articles.filter(article =>
            !article.isArchived && (
                article.title?.toLowerCase().includes(searchTerm) ||
                article.content?.toLowerCase().includes(searchTerm) ||
                article.url.toLowerCase().includes(searchTerm) ||
                article.author?.toLowerCase().includes(searchTerm) ||
                article.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
            )
        )
    }

    // Settings operations (simple key-value store)
    private settings: Record<string, string> = {}

    async getSetting(key: string): Promise<string | null> {
        return this.settings[key] || null
    }

    async setSetting(key: string, value: string): Promise<void> {
        this.settings[key] = value
        // Save settings to a separate file
        const settingsPath = path.join(path.dirname(this.dbPath), 'settings.json')
        await fs.writeFile(settingsPath, JSON.stringify(this.settings, null, 2))
    }

    async close(): Promise<void> {
        if (this.isInitialized) {
            await this.saveToFile()
            this.isInitialized = false
        }
    }

    // Backup and restore functionality
    async exportDatabase(): Promise<Buffer> {
        if (!this.isInitialized) throw new Error('Database not initialized')

        const data = JSON.stringify({
            articles: this.articles,
            settings: this.settings,
            exportDate: new Date().toISOString()
        }, null, 2)

        return Buffer.from(data, 'utf-8')
    }

    async importDatabase(data: Buffer): Promise<void> {
        try {
            const imported = JSON.parse(data.toString('utf-8'))
            this.articles = imported.articles || []
            this.settings = imported.settings || {}
            await this.saveToFile()
            this.isInitialized = true
        } catch (error) {
            console.error('Failed to import database:', error)
            throw error
        }
    }

    // Get statistics
    async getStats(): Promise<{ total: number; unread: number; archived: number }> {
        if (!this.isInitialized) throw new Error('Database not initialized')

        const total = this.articles.length
        const unread = this.articles.filter(a => !a.isRead && !a.isArchived).length
        const archived = this.articles.filter(a => a.isArchived).length

        return { total, unread, archived }
    }
}
