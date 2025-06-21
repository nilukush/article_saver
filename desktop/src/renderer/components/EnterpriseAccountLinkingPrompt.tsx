import { useState } from 'react'
import { useAccountLinkingStore } from '../stores/accountLinkingStore'
import { useArticleStore } from '../stores/articleStore'

interface EnterpriseAccountLinkingPromptProps {
    existingProvider: string
    linkingProvider: string
    linkingToken: string
    email: string
    trustLevel?: 'high' | 'medium' | 'low'
    requiresVerification?: boolean
    onClose: () => void
}

export function EnterpriseAccountLinkingPrompt({
    existingProvider,
    linkingProvider,
    linkingToken,
    email,
    trustLevel = 'medium',
    requiresVerification = false,
    onClose
}: EnterpriseAccountLinkingPromptProps) {
    console.log('🔗 ENTERPRISE ACCOUNT LINKING PROMPT: Component rendered', {
        existingProvider,
        linkingProvider,
        email,
        trustLevel,
        requiresVerification,
        hasLinkingToken: !!linkingToken
    })
    
    const [linking, setLinking] = useState(false)
    const [verificationCode, setVerificationCode] = useState('')
    const [showVerification, setShowVerification] = useState(requiresVerification)
    const { linkAccount } = useAccountLinkingStore()
    const { loadArticles } = useArticleStore()

    const getProviderName = (provider: string) => {
        const providers: Record<string, string> = {
            'google': 'Google',
            'github': 'GitHub',
            'microsoft': 'Microsoft',
            'local': 'Email/Password'
        }
        return providers[provider] || provider
    }

    const getProviderIcon = (provider: string) => {
        const icons: Record<string, string> = {
            'google': '🔍',
            'github': '⚡',
            'microsoft': '🪟',
            'local': '📧'
        }
        return icons[provider] || '🔐'
    }

    const getTrustBadge = () => {
        if (trustLevel === 'high') {
            return (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verified & Trusted
                </div>
            )
        }
        return null
    }

    const handleLink = async () => {
        setLinking(true)
        try {
            console.log('[ENTERPRISE DEBUG] Starting account linking process...')
            
            // For OAuth-based linking, we might not need a verification code
            // The backend should handle this based on trust level
            await linkAccount(linkingToken, linkingProvider, verificationCode || undefined)
            
            console.log('[ENTERPRISE DEBUG] Account linking API call completed')
            
            // Update the user email in localStorage if not already set
            if (!localStorage.getItem('userEmail') && email) {
                localStorage.setItem('userEmail', email)
            }
            
            // Log for audit trail
            console.log('[ENTERPRISE AUDIT] Account linking completed:', {
                email,
                existingProvider,
                linkingProvider,
                trustLevel,
                timestamp: new Date().toISOString()
            })
            
            console.log('[ENTERPRISE DEBUG] Closing prompt and refreshing articles...')
            
            // Close the prompt FIRST to avoid component lifecycle issues
            onClose()
            
            // ENTERPRISE SOLUTION: Delayed article refresh to ensure proper token propagation
            setTimeout(async () => {
                try {
                    console.log('[ENTERPRISE DEBUG] Refreshing articles with new linked token...')
                    // Force article refresh with the updated token
                    await loadArticles()
                    console.log('[ENTERPRISE DEBUG] Article refresh completed successfully')
                } catch (error) {
                    console.error('[ENTERPRISE ERROR] Failed to refresh articles:', error)
                    // Fallback: reload page if article refresh fails
                    window.location.reload()
                }
            }, 1000) // 1 second delay to ensure token propagation
            
        } catch (err) {
            console.error('Failed to link accounts:', err)
            setLinking(false)
        }
    }

    const handleSkip = () => {
        // User chose not to link - they're already authenticated with new account
        console.log('[ENTERPRISE AUDIT] Account linking skipped:', {
            email,
            existingProvider,
            linkingProvider,
            trustLevel,
            timestamp: new Date().toISOString()
        })
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Already Exists</h2>
                    {getTrustBadge()}
                </div>
                
                <div className="mb-6">
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                        An account with the email <strong className="text-gray-900 dark:text-white">{email}</strong> already exists.
                    </p>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl">{getProviderIcon(existingProvider)}</span>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Existing account</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{getProviderName(existingProvider)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl">{getProviderIcon(linkingProvider)}</span>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">New login method</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{getProviderName(linkingProvider)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                        Benefits of Linking Accounts
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                        <li className="flex items-start">
                            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Single sign-on with multiple providers
                        </li>
                        <li className="flex items-start">
                            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Access all your articles from any login
                        </li>
                        <li className="flex items-start">
                            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Enhanced security with provider redundancy
                        </li>
                        <li className="flex items-start">
                            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Enterprise-grade audit trail
                        </li>
                    </ul>
                </div>

                {showVerification && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Verification Code
                        </label>
                        <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="Enter code sent to your email"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Email verification is required for security but not yet implemented.
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                            Click "Keep Separate" to continue with separate accounts.
                        </p>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={handleLink}
                        disabled={linking || (showVerification && !verificationCode)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {linking ? 'Linking...' : 'Link Accounts'}
                    </button>
                    <button
                        onClick={handleSkip}
                        disabled={linking}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        Keep Separate
                    </button>
                </div>

                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    You can manage linked accounts anytime in Settings
                </p>
            </div>
        </div>
    )
}