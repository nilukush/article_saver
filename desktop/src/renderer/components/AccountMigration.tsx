import React, { useState, useEffect } from 'react'
import { AlertCircle, ArrowRight, CheckCircle, Users, Database } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface LinkedAccount {
    id: string
    email: string
    provider: string
    articleCount: number
    isPrimary: boolean
}

interface MigrationOptions {
    accounts: LinkedAccount[]
    totalArticles: number
}

export const AccountMigration: React.FC = () => {
    const { token } = useAuth()
    const [loading, setLoading] = useState(true)
    const [migrationOptions, setMigrationOptions] = useState<MigrationOptions | null>(null)
    const [selectedTarget, setSelectedTarget] = useState<string>('')
    const [strategy, setStrategy] = useState<'merge' | 'move'>('merge')
    const [migrating, setMigrating] = useState(false)
    const [migrationResult, setMigrationResult] = useState<any>(null)
    const [error, setError] = useState<string>('')

    useEffect(() => {
        fetchMigrationOptions()
    }, [])

    const fetchMigrationOptions = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/account-migration/options', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            
            if (!response.ok) {
                throw new Error('Failed to fetch migration options')
            }
            
            const data = await response.json()
            setMigrationOptions(data)
            
            // Pre-select target if only 2 accounts
            if (data.accounts.length === 2) {
                const targetAccount = data.accounts.find((acc: LinkedAccount) => !acc.isPrimary)
                if (targetAccount) {
                    setSelectedTarget(targetAccount.id)
                }
            }
        } catch (err) {
            setError('Failed to load migration options')
            console.error('Migration options error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleMigration = async () => {
        if (!selectedTarget) return
        
        setMigrating(true)
        setError('')
        
        try {
            const response = await fetch('http://localhost:3001/api/account-migration/migrate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetUserId: selectedTarget,
                    strategy
                })
            })
            
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Migration failed')
            }
            
            const result = await response.json()
            setMigrationResult(result)
            
            // Refresh options after migration
            setTimeout(() => {
                fetchMigrationOptions()
            }, 2000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Migration failed')
            console.error('Migration error:', err)
        } finally {
            setMigrating(false)
        }
    }

    const handleSetPrimary = async (accountId: string) => {
        try {
            const response = await fetch('http://localhost:3001/api/account-migration/set-primary', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    primaryUserId: accountId
                })
            })
            
            if (!response.ok) {
                throw new Error('Failed to set primary account')
            }
            
            // Refresh options
            fetchMigrationOptions()
        } catch (err) {
            setError('Failed to set primary account')
            console.error('Set primary error:', err)
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
            </div>
        )
    }

    if (!migrationOptions || migrationOptions.accounts.length < 2) {
        return (
            <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No linked accounts available for migration</p>
                </div>
            </div>
        )
    }

    const currentAccount = migrationOptions.accounts.find(acc => acc.isPrimary)
    const targetAccount = migrationOptions.accounts.find(acc => acc.id === selectedTarget)

    return (
        <div className="p-6 space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">Article Migration</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Move or copy articles between your linked accounts
                </p>
            </div>

            {/* Account Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {migrationOptions.accounts.map(account => (
                    <div
                        key={account.id}
                        className={`p-4 rounded-lg border-2 ${
                            account.isPrimary
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-medium">{account.email}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {account.provider} • {account.articleCount} articles
                                </p>
                            </div>
                            {account.isPrimary && (
                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                                    Current
                                </span>
                            )}
                        </div>
                        {!account.isPrimary && (
                            <button
                                onClick={() => handleSetPrimary(account.id)}
                                className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                Set as primary
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Migration Options */}
            {currentAccount && currentAccount.articleCount > 0 && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Migration Direction
                        </label>
                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex-1 text-center">
                                <p className="font-medium">{currentAccount.email}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {currentAccount.articleCount} articles
                                </p>
                            </div>
                            <ArrowRight className="w-6 h-6 text-gray-400" />
                            <div className="flex-1">
                                <select
                                    value={selectedTarget}
                                    onChange={(e) => setSelectedTarget(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                                >
                                    <option value="">Select target account</option>
                                    {migrationOptions.accounts
                                        .filter(acc => !acc.isPrimary)
                                        .map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.email} ({acc.articleCount} articles)
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>
                    </div>

                    {selectedTarget && (
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Migration Strategy
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <input
                                        type="radio"
                                        value="merge"
                                        checked={strategy === 'merge'}
                                        onChange={(e) => setStrategy(e.target.value as 'merge')}
                                        className="mr-3"
                                    />
                                    <div>
                                        <p className="font-medium">Merge (Copy)</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Copy articles to target account, skip duplicates
                                        </p>
                                    </div>
                                </label>
                                <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <input
                                        type="radio"
                                        value="move"
                                        checked={strategy === 'move'}
                                        onChange={(e) => setStrategy(e.target.value as 'move')}
                                        className="mr-3"
                                    />
                                    <div>
                                        <p className="font-medium">Move</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Transfer all articles to target account
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {migrationResult && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                            <CheckCircle className="w-4 h-4" />
                            <p className="text-sm">
                                {strategy === 'merge' 
                                    ? `Copied ${migrationResult.migrated} articles (${migrationResult.skipped} duplicates skipped)`
                                    : `Moved ${migrationResult.moved} articles`
                                }
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleMigration}
                        disabled={!selectedTarget || migrating}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {migrating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Migrating...
                            </>
                        ) : (
                            <>
                                <Database className="w-4 h-4" />
                                Start Migration
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}