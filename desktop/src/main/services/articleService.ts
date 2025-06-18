import { v4 as uuidv4 } from 'uuid'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import type { Article } from '../../../../shared/types'
import { DatabaseService } from '../database/database'

export class ArticleService {
    constructor(private db: DatabaseService) { }

    async saveArticle(url: string, tags: string[] = []): Promise<Article> {
        console.log('🚀 SAVE ARTICLE: Starting article save process for URL:', url)

        try {
            // Validate URL
            new URL(url)
            console.log('🚀 SAVE ARTICLE: URL validation passed')

            // Fetch article content
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Failed to fetch article: ${response.statusText}`)
            }
            console.log('🚀 SAVE ARTICLE: Article fetched successfully, status:', response.status)

            const html = await response.text()
            console.log('🚀 SAVE ARTICLE: HTML content length:', html.length)

            const dom = new JSDOM(html, { url })
            const document = dom.window.document
            console.log('🚀 SAVE ARTICLE: JSDOM document created')

            // Simple content extraction
            console.log('🚀 SAVE ARTICLE: Starting title extraction')
            const title = this.extractTitle(document)
            console.log('🚀 SAVE ARTICLE: Title extracted:', title)

            console.log('🚀 SAVE ARTICLE: Starting content extraction')
            const content = this.extractContent(document)
            console.log('🚀 SAVE ARTICLE: Content extracted, length:', content.length)

            console.log('🚀 SAVE ARTICLE: Generating excerpt')
            const excerpt = this.generateExcerpt(content)
            console.log('🚀 SAVE ARTICLE: Excerpt generated, length:', excerpt.length)

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

    private generateExcerpt(htmlContent: string, maxLength: number = 200): string {
        // Strip HTML tags and get clean text for excerpt
        const textContent = htmlContent.replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        if (textContent.length <= maxLength) {
            return textContent
        }

        const truncated = textContent.substring(0, maxLength)
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
        try {
            // First try Mozilla Readability for title extraction
            const documentClone = document.cloneNode(true) as Document
            const reader = new Readability(documentClone, { charThreshold: 0 })
            const article = reader.parse()

            if (article && article.title && article.title.trim()) {
                return article.title.trim()
            }
        } catch (error) {
            console.warn('Mozilla Readability title extraction failed:', error)
        }

        // Fallback to manual title extraction
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
        console.log('🔍 CONTENT EXTRACTION: Starting enterprise-grade multi-layer extraction')

        // Multi-layer extraction approach based on enterprise solutions
        const extractionMethods = [
            () => this.extractWithEnhancedReadability(document),
            () => this.extractWithBoilerplateMethod(document),
            () => this.extractWithSemanticAnalysis(document),
            () => this.extractContentBasic(document)
        ]

        for (let i = 0; i < extractionMethods.length; i++) {
            try {
                const methodName = ['Enhanced Readability', 'Boilerplate Method', 'Semantic Analysis', 'Basic Extraction'][i]
                console.log(`🔍 CONTENT EXTRACTION: Attempting ${methodName}`)
                
                const content = extractionMethods[i]()
                const textContent = content.replace(/<[^>]*>/g, '').trim()
                
                // Quality validation - ensure we have substantial content
                if (textContent.length > 500 && this.validateContentQuality(textContent)) {
                    console.log(`✅ CONTENT EXTRACTION: ${methodName} SUCCESS - Content length:`, content.length)
                    return content
                }
                
                console.warn(`⚠️ CONTENT EXTRACTION: ${methodName} produced insufficient content (${textContent.length} chars)`)
            } catch (error) {
                console.error(`❌ CONTENT EXTRACTION: Method ${i + 1} failed:`, error)
            }
        }

        console.error('❌ CONTENT EXTRACTION: All extraction methods failed')
        return '<div class="extraction-failed">Content extraction failed. Please try viewing the original article.</div>'
    }

    private extractWithEnhancedReadability(document: Document): string {
        const documentClone = document.cloneNode(true) as Document
        
        // Pre-process document for better extraction (Pocket/Instapaper technique)
        this.preprocessDocument(documentClone)
        
        const reader = new Readability(documentClone, {
            charThreshold: 250,           // Even more sensitive
            classesToPreserve: ['highlight', 'code', 'pre', 'syntax', 'language-', 'hljs', 'article', 'content'],
            keepClasses: true,
            nbTopCandidates: 15,          // More candidates for better accuracy
            maxElemsToParse: 0,
            debug: false,
            
            serializer: (node: Node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element
                    const tagName = element.tagName.toLowerCase()
                    
                    // Preserve all semantic content
                    if (['article', 'section', 'main', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                         'blockquote', 'ul', 'ol', 'li', 'pre', 'code', 'figure', 'figcaption', 'table', 
                         'tr', 'td', 'th', 'strong', 'em', 'a', 'img'].includes(tagName)) {
                        return element.outerHTML
                    }
                    
                    return element.innerHTML
                }
                return node.textContent || ''
            }
        })

        const article = reader.parse()
        if (article && article.content) {
            return article.content
        }
        throw new Error('Enhanced Readability extraction failed')
    }

    private extractWithBoilerplateMethod(document: Document): string {
        // Implement Boilerplate-style extraction based on research
        console.log('🔍 BOILERPLATE: Starting boilerplate-style extraction')
        
        // Look for main content containers using Pocket/Instapaper heuristics
        const contentSelectors = [
            'article',
            '[role="main"]',
            '.post-content, .entry-content, .article-content, .content',
            '.post-body, .entry-body, .article-body',
            'main article, main .content',
            '#content, #main-content, #post-content',
            '.container .content, .wrapper .content',
            // Technical documentation patterns
            '.documentation, .docs-content, .readme',
            '.markdown-body, .md-content',
            // Blog post patterns
            '.blog-post, .post, .entry'
        ]

        for (const selector of contentSelectors) {
            const elements = document.querySelectorAll(selector)
            for (const element of elements) {
                const content = this.scoreAndExtractContent(element as Element)
                if (content && content.length > 500) {
                    console.log(`✅ BOILERPLATE: Found content with selector: ${selector}`)
                    return content
                }
            }
        }

        // If no specific selectors work, use scoring algorithm
        return this.extractUsingContentScoring(document)
    }

    private extractWithSemanticAnalysis(document: Document): string {
        // Advanced semantic analysis similar to Diffbot
        console.log('🔍 SEMANTIC: Starting semantic content analysis')
        
        const body = document.body
        if (!body) throw new Error('No body element found')

        // Find the best content container using multiple signals
        const candidates = this.findContentCandidates(body)
        
        if (candidates.length === 0) {
            throw new Error('No content candidates found')
        }

        // Score candidates and select the best one
        const bestCandidate = this.selectBestCandidate(candidates)
        
        if (bestCandidate) {
            return this.cleanAndFormatContent(bestCandidate)
        }

        throw new Error('Semantic analysis failed to find suitable content')
    }

    private preprocessDocument(document: Document): void {
        // Remove common noise elements (Pocket/Instapaper approach)
        const noiseSelectors = [
            'script', 'style', 'link', 'meta', 'noscript',
            '.sidebar, .menu, .navigation, .nav',
            '.header, .footer, .comments, .related',
            '.advertisement, .ads, .social, .share',
            '.popup, .modal, .overlay',
            '[class*="cookie"], [class*="gdpr"]',
            '.print-only, .screen-reader-only'
        ]

        noiseSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector)
                elements.forEach(el => el.remove())
            } catch (error) {
                console.warn(`Failed to remove elements with selector ${selector}:`, error)
            }
        })
    }

    private scoreAndExtractContent(element: Element): string {
        // Implement content scoring similar to Instapaper
        const text = element.textContent || ''
        const html = element.innerHTML
        
        // Calculate content density score
        const textLength = text.length
        const htmlLength = html.length
        const density = textLength / Math.max(htmlLength, 1)
        
        // Count paragraphs and useful elements
        const paragraphs = element.querySelectorAll('p').length
        const headings = element.querySelectorAll('h1,h2,h3,h4,h5,h6').length
        const lists = element.querySelectorAll('ul,ol').length
        
        // Score based on content richness
        const score = (textLength * 0.3) + (paragraphs * 50) + (headings * 30) + (lists * 20) + (density * 100)
        
        console.log(`🔍 SCORING: Element score: ${score}, text length: ${textLength}`)
        
        if (score > 200 && textLength > 300) {
            return html
        }
        
        return ''
    }

    private extractUsingContentScoring(document: Document): string {
        // Fallback scoring method for difficult pages
        const allElements = document.querySelectorAll('div, article, section, main')
        let bestElement: Element | null = null
        let bestScore = 0

        for (const element of allElements) {
            const score = this.calculateElementScore(element)
            if (score > bestScore) {
                bestScore = score
                bestElement = element
            }
        }

        if (bestElement && bestScore > 100) {
            return bestElement.innerHTML
        }

        throw new Error('Content scoring extraction failed')
    }

    private findContentCandidates(body: Element): Element[] {
        // Find potential content containers
        const candidates: Element[] = []
        
        // Look for semantic containers
        const semanticElements = body.querySelectorAll('article, main, section, div')
        
        for (const element of semanticElements) {
            const textContent = element.textContent || ''
            if (textContent.length > 200 && this.hasGoodContentSignals(element)) {
                candidates.push(element)
            }
        }

        return candidates
    }

    private hasGoodContentSignals(element: Element): boolean {
        // Check for positive content signals
        const className = element.className.toLowerCase()
        const id = element.id.toLowerCase()
        
        const positiveSignals = ['content', 'article', 'post', 'entry', 'main', 'body', 'text', 'story']
        const negativeSignals = ['sidebar', 'menu', 'nav', 'footer', 'header', 'ad', 'comment', 'social']
        
        const hasPositive = positiveSignals.some(signal => className.includes(signal) || id.includes(signal))
        const hasNegative = negativeSignals.some(signal => className.includes(signal) || id.includes(signal))
        
        return hasPositive || !hasNegative
    }

    private selectBestCandidate(candidates: Element[]): Element | null {
        if (candidates.length === 0) return null
        if (candidates.length === 1) return candidates[0]

        // Score each candidate
        let bestCandidate = candidates[0]
        let bestScore = this.calculateElementScore(bestCandidate)

        for (let i = 1; i < candidates.length; i++) {
            const score = this.calculateElementScore(candidates[i])
            if (score > bestScore) {
                bestScore = score
                bestCandidate = candidates[i]
            }
        }

        return bestCandidate
    }

    private calculateElementScore(element: Element): number {
        const text = element.textContent || ''
        const textLength = text.length
        
        // Count structural elements
        const paragraphs = element.querySelectorAll('p').length
        const headings = element.querySelectorAll('h1,h2,h3,h4,h5,h6').length
        const links = element.querySelectorAll('a').length
        const images = element.querySelectorAll('img').length
        
        // Calculate link density (lower is better for content)
        const linkDensity = links / Math.max(paragraphs, 1)
        
        // Base score on text length and structure
        let score = textLength * 0.5
        score += paragraphs * 30
        score += headings * 25
        score += images * 10
        score -= linkDensity * 50 // Penalize high link density
        
        // Bonus for good content indicators
        const className = element.className.toLowerCase()
        const id = element.id.toLowerCase()
        
        if (className.includes('content') || className.includes('article') || 
            id.includes('content') || id.includes('article')) {
            score += 100
        }

        return score
    }

    private cleanAndFormatContent(element: Element): string {
        // Clean and format the extracted content using JSDOM
        const html = element.innerHTML
        
        // Remove noise elements using string replacement (no DOM needed)
        let cleanHtml = html
        
        // Remove unwanted elements using regex (safer for main process)
        const noisePatterns = [
            /<[^>]*class[^>]*(?:share|social|comment|related|advertisement|ads|sidebar)[^>]*>[\s\S]*?<\/[^>]+>/gi,
            /<script[^>]*>[\s\S]*?<\/script>/gi,
            /<style[^>]*>[\s\S]*?<\/style>/gi,
            /<noscript[^>]*>[\s\S]*?<\/noscript>/gi
        ]
        
        noisePatterns.forEach(pattern => {
            cleanHtml = cleanHtml.replace(pattern, '')
        })
        
        return cleanHtml
    }

    private validateContentQuality(textContent: string): boolean {
        // Validate that the extracted content is actually useful
        const words = textContent.split(/\s+/).filter(word => word.length > 0)
        const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 10)
        
        // Must have reasonable word count and sentence structure
        return words.length > 50 && sentences.length > 3
    }

    private extractContentBasic(document: Document): string {
        console.log('🔧 BASIC EXTRACTION: Starting basic fallback extraction')

        // Basic fallback extraction
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
                console.log(`🔧 BASIC EXTRACTION: Found content with selector: ${selector}`)
                // Remove script and style elements
                const scripts = element.querySelectorAll('script, style')
                scripts.forEach(script => script.remove())

                const content = element.innerHTML || element.textContent || ''
                console.log(`🔧 BASIC EXTRACTION: Content length from ${selector}:`, content.length)
                return content
            }
        }

        console.log('🔧 BASIC EXTRACTION: No content selectors found, falling back to body')
        // Fallback to body content
        const body = document.querySelector('body')
        if (body) {
            // Remove script and style elements
            const scripts = body.querySelectorAll('script, style, nav, header, footer, aside')
            scripts.forEach(script => script.remove())

            const content = body.innerHTML || body.textContent || ''
            console.log('🔧 BASIC EXTRACTION: Body content length:', content.length)
            return content
        }

        console.log('🔧 BASIC EXTRACTION: No content found at all')
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
