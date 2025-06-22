import { useState } from 'react'
import { useAccountLinkingStore } from '../stores/accountLinkingStore'
import { useArticleStore } from '../stores/articleStore'
import { logger } from '../utils/logger'

interface AccountLinkingPromptProps {
    existingProvider: string
    linkingProvider: string
    linkingToken: string
    email: string
    onClose: () => void
}

export function AccountLinkingPrompt({
    existingProvider,
    linkingProvider,
    linkingToken,
    email,
    onClose
}: AccountLinkingPromptProps) {
    const [linking, setLinking] = useState(false)
    const { linkAccount } = useAccountLinkingStore()
    const { loadArticles } = useArticleStore()

    const getProviderName = (provider: string) => {
        switch (provider) {
            case 'google':
                return 'Google'
            case 'github':
                return 'GitHub'
            case 'local':
                return 'Email/Password'
            default:
                return provider
        }
    }

    const handleLink = async () => {
        setLinking(true)
        try {
            await linkAccount(linkingToken, linkingProvider)
            
            // Update the user email in localStorage if not already set
            if (!localStorage.getItem('userEmail') && email) {
                localStorage.setItem('userEmail', email)
            }
            
            // Reload articles to include linked account articles
            await loadArticles()
            // Close the prompt
            onClose()
        } catch (err) {
            logger.error('Failed to link accounts', err, 'Auth', 'AccountLinkingPrompt')
            setLinking(false)
        }
    }

    const handleCreateSeparate = () => {
        // User chose not to link, just close the prompt
        // They can log in with the original account
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">Account Already Exists</h2>
                
                <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                        An account with the email <strong>{email}</strong> already exists 
                        using <strong>{getProviderName(existingProvider)}</strong> login.
                    </p>
                    
                    <p className="text-gray-700">
                        Would you like to link your <strong>{getProviderName(linkingProvider)}</strong> login 
                        to this existing account? This will allow you to access all your articles 
                        with either login method.
                    </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2">Benefits of Linking:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Access all your articles with any linked login method</li>
                        <li>• Keep all your data in one place</li>
                        <li>• Switch between login methods seamlessly</li>
                        <li>• You can unlink accounts later if needed</li>
                    </ul>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleLink}
                        disabled={linking}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {linking ? 'Linking...' : 'Link Accounts'}
                    </button>
                    <button
                        onClick={handleCreateSeparate}
                        disabled={linking}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                        Keep Separate
                    </button>
                </div>
            </div>
        </div>
    )
}