import { useEffect, useState } from 'react'
import { useAccountLinkingStore } from '../stores/accountLinkingStore'
import { AccountMigration } from './AccountMigration'

interface AccountLinkingProps {
    onClose: () => void
}

export function AccountLinking({ onClose }: AccountLinkingProps) {
    const {
        currentUser,
        linkedAccounts,
        loading,
        error,
        loadLinkedAccounts,
        unlinkAccount,
        setError
    } = useAccountLinkingStore()
    
    const [showMigration, setShowMigration] = useState(false)

    useEffect(() => {
        loadLinkedAccounts()
    }, [loadLinkedAccounts])

    const handleUnlink = async (linkId: string) => {
        if (confirm('Are you sure you want to unlink this account? You will still be able to log in with either account separately.')) {
            await unlinkAccount(linkId)
        }
    }

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'google':
                return '🔍'
            case 'github':
                return '🐙'
            case 'local':
                return '📧'
            default:
                return '👤'
        }
    }

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

    if (showMigration) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center gap-4 p-6 border-b dark:border-gray-700">
                        <button
                            onClick={() => setShowMigration(false)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            ← Back
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Article Migration</h2>
                    </div>
                    <AccountMigration />
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Linked Accounts</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="ml-2 text-sm underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading linked accounts...</p>
                    </div>
                ) : !currentUser && !error ? (
                    <div className="text-center py-8">
                        <p className="text-gray-600 dark:text-gray-400">No account data available. Please try refreshing.</p>
                        <button 
                            onClick={() => loadLinkedAccounts()}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Refresh
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Current Account */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Current Account</h3>
                            {currentUser && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{getProviderIcon(currentUser.provider)}</span>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{currentUser.email}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {getProviderName(currentUser.provider)} account
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Linked Accounts */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Linked Accounts</h3>
                            {linkedAccounts.length === 0 ? (
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center text-gray-600 dark:text-gray-400">
                                    <p>No linked accounts yet.</p>
                                    <p className="text-sm mt-2">
                                        Log in with a different provider using the same email address to link accounts.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {linkedAccounts.map((account) => (
                                        <div key={account.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">
                                                        {getProviderIcon(account.user.provider)}
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{account.user.email}</p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {getProviderName(account.user.provider)} account
                                                            {account.isPrimary && ' (Primary)'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-500">
                                                            Linked on {new Date(account.linkedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleUnlink(account.id)}
                                                    disabled={loading}
                                                    className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/30 disabled:opacity-50"
                                                >
                                                    Unlink
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Migration Button */}
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                        <button
                                            onClick={() => setShowMigration(true)}
                                            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Manage Article Migration
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Help Text */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">How Account Linking Works</h4>
                            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                                <li>• Link multiple login methods that use the same email address</li>
                                <li>• Access all your articles regardless of which account you log in with</li>
                                <li>• Your articles remain associated with their original accounts</li>
                                <li>• You can unlink accounts at any time</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}