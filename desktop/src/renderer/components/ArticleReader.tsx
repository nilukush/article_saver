import React from 'react'
import { useArticleStore } from '../stores/articleStore'
import type { Article } from '../../../shared/types'

interface ArticleReaderProps {
    article: Article
    onBack: () => void
}

export function ArticleReader({ article, onBack }: ArticleReaderProps) {
    const { updateArticle } = useArticleStore()

    const handleMarkAsRead = async () => {
        if (!article.isRead) {
            await updateArticle(article.id, { isRead: true })
        }
    }

    const handleToggleArchive = async () => {
        try {
            console.log('🗂️ ARCHIVE: Toggling archive status for article:', article.id, 'current:', article.isArchived)
            await updateArticle(article.id, { isArchived: !article.isArchived })
            console.log('🗂️ ARCHIVE: Archive status updated successfully')
            
            // Redirect to home page after archiving for better UX
            console.log('🗂️ ARCHIVE: Redirecting to home page')
            onBack()
        } catch (error) {
            console.error('🗂️ ARCHIVE ERROR: Failed to update archive status:', error)
        }
    }

    const handleViewOriginal = async () => {
        try {
            console.log('🔗 VIEW ORIGINAL: Opening URL:', article.url)
            
            // Try electron API first if available
            if (window.electronAPI?.openOAuthUrl) {
                try {
                    await window.electronAPI.openOAuthUrl(article.url)
                    console.log('🔗 VIEW ORIGINAL: URL opened successfully via electronAPI')
                    return
                } catch (error) {
                    console.warn('🔗 VIEW ORIGINAL: electronAPI failed, falling back to window.open:', error)
                }
            }
            
            // Fallback to standard browser behavior
            window.open(article.url, '_blank', 'noopener,noreferrer')
            console.log('🔗 VIEW ORIGINAL: URL opened via window.open')
        } catch (error) {
            console.error('🔗 VIEW ORIGINAL ERROR: All methods failed:', error)
            // Final fallback - copy to clipboard as last resort
            if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(article.url)
                    alert(`Failed to open link. URL copied to clipboard: ${article.url}`)
                } catch (clipboardError) {
                    alert(`Failed to open link: ${article.url}`)
                }
            } else {
                alert(`Failed to open link: ${article.url}`)
            }
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname
        } catch {
            return url
        }
    }

    const processArticleContent = (content: string): string => {
        if (!content) {
            return `
                <div class="flex flex-col items-center justify-center py-16 text-center">
                    <div class="text-6xl mb-4">📄</div>
                    <h3 class="text-xl font-medium mb-2">No Content Available</h3>
                    <p class="text-gray-600 dark:text-gray-400 max-w-md">
                        This article may not have been fully extracted or the original page requires JavaScript to display content.
                    </p>
                    <button 
                        onclick="window.location.reload()" 
                        class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Retry Extraction
                    </button>
                </div>
            `
        }

        // Enterprise-grade content processing based on Firefox Reader View algorithm
        let processedContent = content

        // Security: Remove potentially harmful elements
        processedContent = processedContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        processedContent = processedContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        processedContent = processedContent.replace(/<link[^>]*>/gi, '')
        processedContent = processedContent.replace(/<meta[^>]*>/gi, '')
        processedContent = processedContent.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
        
        // Remove dark mode conflicting styles completely
        processedContent = processedContent.replace(/style\s*=\s*["'][^"']*["']/gi, '')
        processedContent = processedContent.replace(/class\s*=\s*["'][^"']*["']/gi, '')
        
        // Aggressive cleanup of empty and low-value elements (Pocket/Instapaper approach)
        processedContent = processedContent.replace(/<(div|span|p|section|article)[^>]*>\s*<\/\1>/gi, '')
        processedContent = processedContent.replace(/<(div|span)[^>]*>\s*(&nbsp;|\s)*\s*<\/\1>/gi, '')
        processedContent = processedContent.replace(/(<br[^>]*>\s*){3,}/gi, '<br><br>')
        processedContent = processedContent.replace(/&nbsp;/gi, ' ')
        processedContent = processedContent.replace(/\s{3,}/g, ' ')
        processedContent = processedContent.replace(/\n{3,}/g, '\n\n')
        
        // Remove divs that only contain other divs with minimal content
        processedContent = processedContent.replace(/<div[^>]*>(\s*<div[^>]*>[^<]{0,50}<\/div>\s*)+<\/div>/gi, '')
        
        // Clean up nested empty elements
        let previousLength = 0
        while (processedContent.length !== previousLength) {
            previousLength = processedContent.length
            processedContent = processedContent.replace(/<(div|span|p)[^>]*>\s*<\/\1>/gi, '')
        }

        // Enterprise content structure enhancement (Pocket/Instapaper approach)
        
        // Step 1: Identify and convert paragraph-like divs
        processedContent = processedContent.replace(
            /<div[^>]*>([^<]+(?:<(?!\/div|div|p|h[1-6]|ul|ol|table)[^>]*>[^<]*<\/[^>]+>[^<]*)*)<\/div>/gi,
            (match, content) => {
                // More sophisticated paragraph detection
                const textContent = content.replace(/<[^>]*>/g, '').trim()
                const wordCount = textContent.split(/\s+/).length
                const hasSentences = /[.!?]/.test(textContent)
                const hasGoodLength = textContent.length > 30 && textContent.length < 1000
                
                if (wordCount > 8 && hasSentences && hasGoodLength) {
                    return `<p>${content}</p>`
                }
                return match
            }
        )
        
        // Step 2: Group consecutive text nodes into paragraphs
        processedContent = processedContent.replace(
            /(?:^|>)([^<]+(?:<(?:em|strong|a|span|code|i|b)[^>]*>[^<]*<\/(?:em|strong|a|span|code|i|b)>[^<]*)*[.!?][^<]*?)(?=<|$)/gi,
            (match, content) => {
                const trimmed = content.trim()
                if (trimmed.length > 50) {
                    return `<p>${trimmed}</p>`
                }
                return match
            }
        )
        
        // Step 3: Remove wrapper divs that serve no semantic purpose
        processedContent = processedContent.replace(
            /<div[^>]*>(\s*(?:<(?:p|h[1-6]|ul|ol|blockquote|pre)[^>]*>[\s\S]*?<\/(?:p|h[1-6]|ul|ol|blockquote|pre)>\s*)+)<\/div>/gi,
            '$1'
        )
        
        // Step 4: Consolidate adjacent paragraphs with minimal content
        processedContent = processedContent.replace(
            /<p[^>]*>([^<]{1,50})<\/p>\s*<p[^>]*>([^<]{1,50})<\/p>/gi,
            (match, p1, p2) => {
                if (!p1.includes('.') && !p2.includes('.')) {
                    return `<p>${p1} ${p2}</p>`
                }
                return match
            }
        )

        // Enhance images with enterprise-grade handling
        processedContent = processedContent.replace(
            /<img([^>]*?)(?:src\s*=\s*["']([^"']*)["'])?([^>]*?)>/gi,
            (match, _before, src, _after) => {
                if (!src) return '' // Remove images without src
                
                // Handle relative URLs if needed
                const imgSrc = src.startsWith('//') ? `https:${src}` : src
                
                return `
                    <figure class="my-8">
                        <img 
                            src="${imgSrc}" 
                            loading="lazy" 
                            class="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                            style="max-width: 100%; height: auto; display: block; margin: 2em auto; border-radius: 8px;"
                            onerror="this.style.display='none'"
                        />
                    </figure>
                `
            }
        )

        // Enhance code blocks with syntax highlighting support
        processedContent = processedContent.replace(
            /<pre([^>]*)>([\s\S]*?)<\/pre>/gi,
            '<pre class="code-block" style="background: #1e293b; color: #e2e8f0; padding: 1.5rem; border-radius: 8px; overflow-x: auto; margin: 2em 0; font-family: \'JetBrains Mono\', \'Fira Code\', monospace; line-height: 1.5;">$2</pre>'
        )

        // Enhance inline code (dark mode adaptive)
        processedContent = processedContent.replace(
            /<code([^>]*)>([^<]+)<\/code>/g,
            `<code class="inline-code" style="background: ${isDarkMode ? '#1e293b' : '#f1f5f9'}; color: ${isDarkMode ? '#f1f5f9' : '#334155'}; padding: 0.25em 0.5em; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; border: 1px solid ${isDarkMode ? '#475569' : '#e2e8f0'};">$2</code>`
        )

        // Enhance blockquotes with better styling (dark mode adaptive)
        processedContent = processedContent.replace(
            /<blockquote([^>]*)>([\s\S]*?)<\/blockquote>/gi,
            `<blockquote class="enhanced-quote" style="border-left: 4px solid #3b82f6; padding: 1.5rem 2rem; margin: 2rem 0; background: ${isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'}; border-radius: 0 8px 8px 0; font-style: italic; position: relative; color: inherit;">$2</blockquote>`
        )

        // Improve list formatting
        processedContent = processedContent.replace(
            /<ul([^>]*)>/gi,
            '<ul style="margin: 1.5em 0; padding-left: 2em; line-height: 1.7;">'
        )
        
        processedContent = processedContent.replace(
            /<ol([^>]*)>/gi,
            '<ol style="margin: 1.5em 0; padding-left: 2em; line-height: 1.7;">'
        )

        processedContent = processedContent.replace(
            /<li([^>]*)>/gi,
            '<li style="margin-bottom: 0.5em; line-height: 1.6;">'
        )

        // Enhance headings with better hierarchy
        for (let i = 1; i <= 6; i++) {
            const size = Math.max(3 - i * 0.3, 1.1) // Progressive sizing
            processedContent = processedContent.replace(
                new RegExp(`<h${i}([^>]*)>`, 'gi'),
                `<h${i} style="font-size: ${size}em; font-weight: 700; margin: ${2 + (6-i)*0.3}em 0 1em 0; line-height: 1.3; color: inherit;">`
            )
        }

        // Improve table formatting
        processedContent = processedContent.replace(
            /<table([^>]*)>/gi,
            '<table style="width: 100%; border-collapse: collapse; margin: 2em 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">'
        )

        processedContent = processedContent.replace(
            /<th([^>]*)>/gi,
            `<th style="padding: 1em; font-weight: 600; text-align: left; border-bottom: 2px solid ${isDarkMode ? '#374151' : '#e5e7eb'}; background: ${isDarkMode ? 'rgba(55,65,81,0.5)' : 'rgba(249,250,251,0.8)'}; color: inherit;">`
        )

        processedContent = processedContent.replace(
            /<td([^>]*)>/gi,
            `<td style="padding: 1em; border-bottom: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}; vertical-align: top; color: inherit;">`
        )

        // Add reading enhancements
        processedContent = processedContent.replace(
            /<p([^>]*)>/gi,
            '<p style="margin-bottom: 1.5em; line-height: 1.8; text-align: left; word-spacing: 0.1em; hyphens: auto;">'
        )

        // Enterprise content validation and enhancement
        const textContent = processedContent.replace(/<[^>]*>/g, '').trim()
        const wordCount = textContent.split(/\s+/).length
        const readingTime = Math.ceil(wordCount / 200) // Average reading speed

        // Determine content quality level for user feedback
        const qualityLevel = determineContentQuality(textContent, wordCount)
        
        // Add content quality indicators
        if (textContent.length < 200) {
            return `
                <div class="border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-6 mb-8 rounded-r-lg">
                    <div class="flex items-center">
                        <div class="text-yellow-400 text-2xl mr-3">⚠️</div>
                        <div>
                            <h4 class="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">Limited Content Detected</h4>
                            <p class="text-yellow-700 dark:text-yellow-300 text-sm leading-relaxed">
                                This article appears to have minimal extractable content. This could indicate:
                            </p>
                            <ul class="text-yellow-700 dark:text-yellow-300 text-sm mt-2 list-disc list-inside space-y-1">
                                <li>Content is primarily loaded via JavaScript</li>
                                <li>Article is behind a paywall or login</li>
                                <li>Page structure is not optimized for content extraction</li>
                                <li>Content may be primarily multimedia (videos, images)</li>
                            </ul>
                            <div class="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
                                💡 Try the "View Original" button for the complete experience
                            </div>
                        </div>
                    </div>
                </div>
                <div class="prose prose-lg max-w-none" style="color: inherit;">
                    ${processedContent}
                </div>
            `
        }

        // Wrap in professional reading container with enhanced metadata
        return `
            <div class="article-metadata mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between">
                    <div class="flex items-center text-sm text-gray-600 dark:text-gray-400 space-x-4">
                        <span>📖 ${wordCount.toLocaleString()} words</span>
                        <span>⏱️ ${readingTime} min read</span>
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${qualityLevel.bgColor} ${qualityLevel.textColor}">
                            ${qualityLevel.icon} ${qualityLevel.label}
                        </span>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                        Enterprise extraction • Article optimized
                    </div>
                </div>
            </div>
            <div class="prose prose-lg max-w-none" style="color: inherit; font-family: 'Inter', Georgia, 'Times New Roman', serif;">
                ${processedContent}
            </div>
        `
    }

    const determineContentQuality = (_textContent: string, wordCount: number) => {
        // Enterprise-grade content quality assessment
        if (wordCount > 1500) {
            return {
                label: 'Excellent',
                icon: '🟢',
                bgColor: 'bg-green-100 dark:bg-green-900/20',
                textColor: 'text-green-800 dark:text-green-200'
            }
        } else if (wordCount > 800) {
            return {
                label: 'Good',
                icon: '🔵',
                bgColor: 'bg-blue-100 dark:bg-blue-900/20',
                textColor: 'text-blue-800 dark:text-blue-200'
            }
        } else if (wordCount > 300) {
            return {
                label: 'Fair',
                icon: '🟡',
                bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
                textColor: 'text-yellow-800 dark:text-yellow-200'
            }
        } else {
            return {
                label: 'Limited',
                icon: '🟠',
                bgColor: 'bg-orange-100 dark:bg-orange-900/20',
                textColor: 'text-orange-800 dark:text-orange-200'
            }
        }
    }

    // Dark mode detection
    const [isDarkMode, setIsDarkMode] = React.useState(false)

    React.useEffect(() => {
        // Check for dark mode
        const checkDarkMode = () => {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches ||
                          document.documentElement.classList.contains('dark') ||
                          document.body.classList.contains('dark')
            setIsDarkMode(isDark)
        }
        
        checkDarkMode()
        
        // Listen for changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQuery.addEventListener('change', checkDarkMode)
        
        return () => mediaQuery.removeEventListener('change', checkDarkMode)
    }, [])

    // Mark as read when component mounts
    React.useEffect(() => {
        handleMarkAsRead()
    }, [])

    return (
        <div className="h-screen bg-white dark:bg-gray-900 flex flex-col">{/* Removed forced dark class */}
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <span className="mr-2">←</span>
                        Back to Articles
                    </button>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleToggleArchive}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            {article.isArchived ? 'Unarchive' : 'Archive'}
                        </button>

                        <button
                            onClick={handleViewOriginal}
                            className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
                        >
                            View Original
                        </button>
                    </div>
                </div>
            </header>

            {/* Article Content */}
            <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
                <div className="max-w-none">
                    {/* Article Header - Full Width */}
                    <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 px-6 py-8 border-b border-gray-200 dark:border-gray-700">
                        <div className="max-w-4xl mx-auto">
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                                {article.title || 'Untitled'}
                            </h1>

                            <div className="flex flex-wrap items-center text-sm text-gray-600 dark:text-gray-400 gap-4 mb-6">
                                <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                    </svg>
                                    {getDomain(article.url)}
                                </span>
                                {article.author && (
                                    <span className="flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        {article.author}
                                    </span>
                                )}
                                <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    {formatDate(article.createdAt)}
                                </span>
                                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                                    ~{Math.ceil((article.content?.replace(/<[^>]*>/g, '').length || 0) / 200)} min read
                                </span>
                            </div>

                            {article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {article.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-block bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-sm px-3 py-1 rounded-full font-medium"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {article.excerpt && (
                                <div className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed border-l-4 border-primary-500 pl-6 bg-primary-50 dark:bg-primary-900/20 py-4 rounded-r-lg">
                                    {article.excerpt}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Article Body - Optimized for Reading */}
                    <article className="max-w-4xl mx-auto px-6 py-12">
                        <div className="article-reader-container">
                            <div
                                className={`article-content prose prose-lg max-w-none ${isDarkMode ? 'dark' : ''}`}
                                style={{ 
                                    color: isDarkMode ? '#f8fafc' : '#1a1a1a',
                                    backgroundColor: isDarkMode ? '#0f172a' : 'transparent'
                                }}
                                dangerouslySetInnerHTML={{ __html: processArticleContent(article.content || '') }}
                            />
                        </div>
                    </article>
                </div>
            </main>
        </div>
    )
}
