import { v4 as uuidv4 } from 'uuid'
import { JSDOM } from 'jsdom'
import type { Article } from '../../../shared/types'
import { DatabaseService } from '../database/database'

export class ArticleService {
    constructor(private db: DatabaseService) { }

    async saveArticle(url: string, tags: string[] = []): Promise<Article> {
        try {
            // Validate URL
            new URL(url)

            // Fetch article content
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Failed to fetch article: ${response.statusText}`)
            }

            const html = await response.text()
            const dom = new JSDOM(html, { url })
            const document = dom.window.document

            // Simple content extraction
            const title = this.extractTitle(document)
            const content = this.extractContent(document)
            const excerpt = this.generateExcerpt(content)

            // Create article object
            const articleData: Omit<Article, 'createdAt' | 'updatedAt'> = {
                id: uuidv4(),
                url,
                title: title || 'Untitled',
                content: content,
                excerpt: excerpt,
                author: this.extractAuthor(document),
                publishedDate: this.extractPublishedDate(document),
                tags,
                isRead: false,
                isArchived: false,
                syncedAt: undefined
            }

            // Save to database
            return this.db.insertArticle(articleData)
        } catch (error) {
            console.error('Error saving article:', error)
            throw new Error(`Failed to save article: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    async getArticles(options?: { limit?: number; offset?: number }): Promise<Article[]> {
        return await this.db.getArticles(options)
    }

    async getArticle(id: string): Promise<Article | null> {
        return await this.db.getArticle(id)
    }

    async updateArticle(id: string, updates: Partial<Article>): Promise<Article | null> {
        return await this.db.updateArticle(id, updates)
    }

    async deleteArticle(id: string): Promise<void> {
        const success = await this.db.deleteArticle(id)
        if (!success) {
            throw new Error('Article not found')
        }
    }

    async searchArticles(query: string): Promise<Article[]> {
        return await this.db.searchArticles(query)
    }

    private generateExcerpt(text: string, maxLength: number = 200): string {
        const cleaned = text.replace(/\s+/g, ' ').trim()
        if (cleaned.length <= maxLength) {
            return cleaned
        }

        const truncated = cleaned.substring(0, maxLength)
        const lastSpace = truncated.lastIndexOf(' ')

        if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...'
        }

        return truncated + '...'
    }

    private extractPublishedDate(document: Document): string | undefined {
        // Try various meta tags and structured data
        const selectors = [
            'meta[property="article:published_time"]',
            'meta[name="article:published_time"]',
            'meta[property="datePublished"]',
            'meta[name="datePublished"]',
            'meta[name="date"]',
            'time[datetime]',
            '.published',
            '.date'
        ]

        for (const selector of selectors) {
            const element = document.querySelector(selector)
            if (element) {
                const content = element.getAttribute('content') ||
                    element.getAttribute('datetime') ||
                    element.textContent

                if (content) {
                    const date = new Date(content)
                    if (!isNaN(date.getTime())) {
                        return date.toISOString()
                    }
                }
            }
        }

        return undefined
    }

    private extractTitle(document: Document): string | undefined {
        // Try various title selectors
        const selectors = [
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            'h1',
            'title'
        ]

        for (const selector of selectors) {
            const element = document.querySelector(selector)
            if (element) {
                const content = element.getAttribute('content') || element.textContent
                if (content && content.trim()) {
                    return content.trim()
                }
            }
        }

        return undefined
    }

    private extractContent(document: Document): string {
        // Try to find main content areas
        const contentSelectors = [
            'article',
            '[role="main"]',
            '.content',
            '.post-content',
            '.entry-content',
            '.article-content',
            'main'
        ]

        for (const selector of contentSelectors) {
            const element = document.querySelector(selector)
            if (element) {
                // Remove script and style elements
                const scripts = element.querySelectorAll('script, style')
                scripts.forEach(script => script.remove())

                return element.innerHTML || element.textContent || ''
            }
        }

        // Fallback to body content
        const body = document.querySelector('body')
        if (body) {
            // Remove script and style elements
            const scripts = body.querySelectorAll('script, style, nav, header, footer, aside')
            scripts.forEach(script => script.remove())

            return body.innerHTML || body.textContent || ''
        }

        return ''
    }

    private extractAuthor(document: Document): string | undefined {
        // Try various author selectors
        const selectors = [
            'meta[name="author"]',
            'meta[property="article:author"]',
            '.author',
            '.byline',
            '[rel="author"]'
        ]

        for (const selector of selectors) {
            const element = document.querySelector(selector)
            if (element) {
                const content = element.getAttribute('content') || element.textContent
                if (content && content.trim()) {
                    return content.trim()
                }
            }
        }

        return undefined
    }
}
