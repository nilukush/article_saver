import { prisma } from '../database';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createError } from '../middleware/errorHandler';
import logger from './logger';
import { emailService } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

interface EnterpriseOAuthResult {
    type: 'success' | 'requires_linking' | 'requires_verification';
    user?: any;
    token?: string;
    linkingData?: {
        existingProvider: string;
        newProvider: string;
        linkingToken: string;
        verificationRequired: boolean;
        trustLevel: 'high' | 'medium' | 'low';
    };
    redirectUrl: string;
}

interface ProviderTrustLevel {
    provider: string;
    emailVerified: boolean;
    domainVerified: boolean;
    enterpriseSSO: boolean;
    trustScore: number;
}

// Enterprise-grade provider trust evaluation
export function evaluateProviderTrust(provider: string, email: string, metadata?: any): ProviderTrustLevel {
    const domain = email.split('@')[1];
    const isEnterpriseEmail = !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain);
    
    // Provider-specific trust scoring
    const providerScores: Record<string, number> = {
        'google': isEnterpriseEmail ? 90 : 80, // Google Workspace vs Gmail
        'microsoft': isEnterpriseEmail ? 90 : 80, // Microsoft 365 vs Outlook
        'github': 60, // GitHub doesn't always verify external emails
        'local': 70, // Password-based with email verification
    };
    
    const baseScore = providerScores[provider] || 50;
    const domainBonus = isEnterpriseEmail ? 10 : 0;
    
    return {
        provider,
        emailVerified: provider !== 'github' || metadata?.emailVerified,
        domainVerified: isEnterpriseEmail,
        enterpriseSSO: isEnterpriseEmail && ['google', 'microsoft'].includes(provider),
        trustScore: Math.min(100, baseScore + domainBonus)
    };
}

// Enterprise account linking with security best practices
export async function handleEnterpriseOAuthLogin(
    userData: { email: string; provider: string; metadata?: any },
    electronPort?: string | null
): Promise<EnterpriseOAuthResult> {
    const { email, provider, metadata } = userData;
    
    logger.info('ENTERPRISE AUTH: OAuth login attempt', { email, provider, electronPort });
    
    // Evaluate provider trust level
    const trustLevel = evaluateProviderTrust(provider, email, metadata);
    
    // First, check for accounts with the exact email+provider combination
    // This prevents creating duplicate accounts for the same provider
    const existingProviderAccount = await prisma.user.findFirst({
        where: { 
            email,
            provider 
        }
    });
    
    // Also check for accounts that might have been created with unique emails
    // (e.g., email.provider.timestamp format)
    if (!existingProviderAccount) {
        const possibleLinkedAccount = await prisma.user.findFirst({
            where: {
                email: {
                    startsWith: `${email}.${provider}.`
                },
                provider
            }
        });
        
        if (possibleLinkedAccount) {
            logger.info('ENTERPRISE AUTH: Found linked account with unique email', {
                userId: possibleLinkedAccount.id,
                uniqueEmail: possibleLinkedAccount.email,
                actualEmail: (possibleLinkedAccount.metadata as any)?.actualEmail || email,
                provider
            });
            
            // Check if this account is properly linked
            const linkedAccount = await prisma.linkedAccount.findFirst({
                where: {
                    OR: [
                        { linkedUserId: possibleLinkedAccount.id, verified: true },
                        { primaryUserId: possibleLinkedAccount.id, verified: true }
                    ]
                }
            });
            
            if (linkedAccount) {
                // Get all linked user IDs
                const allLinkedAccounts = await prisma.linkedAccount.findMany({
                    where: {
                        AND: [
                            {
                                OR: [
                                    { primaryUserId: possibleLinkedAccount.id },
                                    { linkedUserId: possibleLinkedAccount.id }
                                ]
                            },
                            { verified: true }
                        ]
                    }
                });
                
                const allUserIds = new Set<string>([possibleLinkedAccount.id]);
                allLinkedAccounts.forEach(link => {
                    allUserIds.add(link.primaryUserId);
                    allUserIds.add(link.linkedUserId);
                });
                
                // Use the linked account for authentication
                const token = jwt.sign(
                    { 
                        userId: possibleLinkedAccount.id, 
                        email,
                        linkedUserIds: Array.from(allUserIds)
                    },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );
                
                // Update last login
                await prisma.user.update({
                    where: { id: possibleLinkedAccount.id },
                    data: {
                        metadata: {
                            ...possibleLinkedAccount.metadata as any,
                            lastLoginAt: new Date()
                        }
                    }
                });
                
                return {
                    type: 'success',
                    user: possibleLinkedAccount,
                    token,
                    redirectUrl: buildRedirectUrl(electronPort, provider, { token, email })
                };
            }
        }
    }
    
    // Check for ANY accounts with this email (different providers)
    // Include accounts that might have unique emails with actualEmail in metadata
    const existingAccounts = await prisma.user.findMany({
        where: {
            OR: [
                { email },
                { 
                    metadata: {
                        path: ['actualEmail'],
                        equals: email
                    }
                }
            ]
        }
    });
    
    if (existingProviderAccount) {
        // ENTERPRISE CRITICAL: Check if there are OTHER providers with same email
        // If so, we need to potentially trigger account linking flow
        const otherProviderAccounts = existingAccounts.filter(acc => 
            acc.id !== existingProviderAccount.id && 
            (acc.provider !== provider || acc.provider === 'local')
        );
        
        logger.info('ENTERPRISE AUTH: Found exact email+provider match', { 
            userId: existingProviderAccount.id, 
            email, 
            provider,
            hasOtherProviders: otherProviderAccounts.length > 0,
            otherProviders: otherProviderAccounts.map(acc => acc.provider)
        });
        
        // If there are other providers, check for account linking opportunities
        if (otherProviderAccounts.length > 0) {
            logger.info('ENTERPRISE AUTH: Multiple providers detected, checking for linking opportunities');
            
            // Check if accounts are already linked
            const existingLinks = await prisma.linkedAccount.findMany({
                where: {
                    OR: [
                        { 
                            primaryUserId: existingProviderAccount.id,
                            linkedUserId: { in: otherProviderAccounts.map(acc => acc.id) }
                        },
                        { 
                            linkedUserId: existingProviderAccount.id,
                            primaryUserId: { in: otherProviderAccounts.map(acc => acc.id) }
                        }
                    ]
                }
            });
            
            // If no verified links exist with other providers, continue with regular linking flow
            const hasVerifiedLinks = existingLinks.some(link => link.verified);
            if (!hasVerifiedLinks) {
                logger.info('ENTERPRISE AUTH: No verified links found, proceeding with account linking flow for existing provider account');
                // Don't return success here - let it continue to the linking logic below
            } else {
                logger.info('ENTERPRISE AUTH: Verified links exist, logging in with existing account');
            }
        }
        
        // If we reach here, either no other providers or verified links exist
        // Get all linked user IDs for this account
        const linkedAccounts = await prisma.linkedAccount.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { primaryUserId: existingProviderAccount.id },
                            { linkedUserId: existingProviderAccount.id }
                        ]
                    },
                    { verified: true }
                ]
            }
        });
        
        const allUserIds = new Set<string>([existingProviderAccount.id]);
        linkedAccounts.forEach(link => {
            allUserIds.add(link.primaryUserId);
            allUserIds.add(link.linkedUserId);
        });
        
        const token = jwt.sign(
            { 
                userId: existingProviderAccount.id, 
                email: existingProviderAccount.email,
                linkedUserIds: Array.from(allUserIds)
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Update last login
        await prisma.user.update({
            where: { id: existingProviderAccount.id },
            data: {
                metadata: {
                    ...existingProviderAccount.metadata as any,
                    lastLoginAt: new Date()
                }
            }
        });
        
        // Only return success if we have verified links or no other providers
        const otherProvidersExist = otherProviderAccounts.length > 0;
        const hasVerifiedLinksWithOthers = linkedAccounts.some(link => 
            otherProviderAccounts.some(acc => acc.id === link.primaryUserId || acc.id === link.linkedUserId)
        );
        
        if (!otherProvidersExist || hasVerifiedLinksWithOthers) {
            return {
                type: 'success',
                user: existingProviderAccount,
                token,
                redirectUrl: buildRedirectUrl(electronPort, provider, { token, email })
            };
        }
        
        // If we have other providers but no verified links, continue to linking flow below
        logger.info('ENTERPRISE AUTH: Existing provider account found but needs linking with other providers');
    }
    
    logger.info('ENTERPRISE AUTH: Found existing accounts with email', { 
        email, 
        count: existingAccounts.length,
        providers: existingAccounts.map(a => a.provider)
    });
    
    if (existingAccounts.length === 0) {
        // No existing account with this email - create new user
        logger.info('ENTERPRISE AUTH: Creating new user account', { email, provider });
        
        const user = await prisma.user.create({
            data: {
                email,
                password: '', // OAuth users don't have passwords
                provider,
                emailVerified: trustLevel.emailVerified,
                metadata: {
                    trustScore: trustLevel.trustScore,
                    domainVerified: trustLevel.domainVerified,
                    firstLoginAt: new Date(),
                    lastLoginAt: new Date()
                }
            }
        });
        
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                linkedUserIds: [user.id] // New account starts with just itself
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Audit log for new account creation
        await prisma.accountLinkingAudit.create({
            data: {
                userId: user.id,
                action: 'account_created',
                performedBy: user.id,
                metadata: {
                    provider,
                    trustScore: trustLevel.trustScore,
                    method: 'oauth'
                }
            }
        });
        
        return {
            type: 'success',
            user,
            token,
            redirectUrl: buildRedirectUrl(electronPort, provider, { token, email })
        };
    }
    
    // At this point: Email exists but with a different provider
    // ENTERPRISE LOGIC: Prioritize local accounts as primary for account linking
    const primaryAccount = existingAccounts.find(acc => acc.provider === 'local' || acc.provider === null) 
        || existingAccounts[0]; // Fallback to first if no local account found
    
    // Check if there's already a linked account for this provider
    logger.info('ENTERPRISE AUTH: Checking for existing linked accounts', {
        primaryAccountId: primaryAccount.id,
        primaryProvider: primaryAccount.provider,
        searchingForProvider: provider,
        email
    });
    
    // First, let's check all linked accounts for debugging
    const allLinkedAccounts = await prisma.linkedAccount.findMany({
        where: {
            OR: [
                { primaryUserId: primaryAccount.id },
                { linkedUserId: primaryAccount.id }
            ]
        },
        include: {
            primaryUser: true,
            linkedUser: true
        }
    });
    
    logger.debug('ENTERPRISE AUTH: All linked accounts for primary user', {
        count: allLinkedAccounts.length,
        accounts: allLinkedAccounts.map(la => ({
            id: la.id,
            verified: la.verified,
            primaryUser: { id: la.primaryUser.id, email: la.primaryUser.email, provider: la.primaryUser.provider },
            linkedUser: { id: la.linkedUser.id, email: la.linkedUser.email, provider: la.linkedUser.provider, metadata: la.linkedUser.metadata }
        }))
    });
    
    // Now check for a linked account with the specific provider
    // We need to check if any of the linked accounts are for the requested provider
    let existingLinkedAccount = null;
    let existingUnverifiedLinkedAccount = null;
    
    for (const linkedAccount of allLinkedAccounts) {
        // Check if the linked user is the provider we're looking for
        if (linkedAccount.primaryUserId === primaryAccount.id && 
            linkedAccount.linkedUser.provider === provider) {
            // Check if it's the same email (either direct match, in metadata, or starts with email.provider)
            const linkedUserEmail = linkedAccount.linkedUser.email;
            const linkedUserActualEmail = (linkedAccount.linkedUser.metadata as any)?.actualEmail;
            
            if (linkedUserEmail === email || 
                linkedUserActualEmail === email ||
                linkedUserEmail.startsWith(`${email}.${provider}.`)) {
                if (linkedAccount.verified) {
                    existingLinkedAccount = linkedAccount;
                    break;
                } else {
                    existingUnverifiedLinkedAccount = linkedAccount;
                }
            }
        }
        
        // Check if the primary user is the provider we're looking for (reverse link)
        if (linkedAccount.linkedUserId === primaryAccount.id && 
            linkedAccount.primaryUser.provider === provider) {
            // Check if it's the same email (either direct match, in metadata, or starts with email.provider)
            const primaryUserEmail = linkedAccount.primaryUser.email;
            const primaryUserActualEmail = (linkedAccount.primaryUser.metadata as any)?.actualEmail;
            
            if (primaryUserEmail === email || 
                primaryUserActualEmail === email ||
                primaryUserEmail.startsWith(`${email}.${provider}.`)) {
                if (linkedAccount.verified) {
                    existingLinkedAccount = linkedAccount;
                    break;
                } else {
                    existingUnverifiedLinkedAccount = linkedAccount;
                }
            }
        }
    }
    
    logger.info('ENTERPRISE AUTH: Existing linked account search result', {
        found: !!existingLinkedAccount,
        unverifiedFound: !!existingUnverifiedLinkedAccount,
        account: existingLinkedAccount ? {
            id: existingLinkedAccount.id,
            verified: existingLinkedAccount.verified,
            primaryUser: { id: existingLinkedAccount.primaryUser.id, email: existingLinkedAccount.primaryUser.email, provider: existingLinkedAccount.primaryUser.provider },
            linkedUser: { id: existingLinkedAccount.linkedUser.id, email: existingLinkedAccount.linkedUser.email, provider: existingLinkedAccount.linkedUser.provider }
        } : null,
        unverifiedAccount: existingUnverifiedLinkedAccount ? {
            id: existingUnverifiedLinkedAccount.id,
            verified: existingUnverifiedLinkedAccount.verified,
            primaryUser: { id: existingUnverifiedLinkedAccount.primaryUser.id, email: existingUnverifiedLinkedAccount.primaryUser.email, provider: existingUnverifiedLinkedAccount.primaryUser.provider },
            linkedUser: { id: existingUnverifiedLinkedAccount.linkedUser.id, email: existingUnverifiedLinkedAccount.linkedUser.email, provider: existingUnverifiedLinkedAccount.linkedUser.provider }
        } : null
    });
    
    if (existingLinkedAccount) {
        // Accounts are already linked - just log them in
        const linkedProviderAccount = existingLinkedAccount.primaryUserId === primaryAccount.id 
            ? existingLinkedAccount.linkedUser 
            : existingLinkedAccount.primaryUser;
            
        // Update last login for the linked account
        await prisma.user.update({
            where: { id: linkedProviderAccount.id },
            data: {
                metadata: {
                    ...linkedProviderAccount.metadata as any,
                    lastLoginAt: new Date()
                }
            }
        });
        
        // Get all linked user IDs for the primary account
        const linkedAccounts = await prisma.linkedAccount.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { primaryUserId: primaryAccount.id },
                            { linkedUserId: primaryAccount.id }
                        ]
                    },
                    { verified: true }
                ]
            }
        });
        
        const allUserIds = new Set<string>([primaryAccount.id]);
        linkedAccounts.forEach(link => {
            allUserIds.add(link.primaryUserId);
            allUserIds.add(link.linkedUserId);
        });
        
        // Generate token using the primary account (for consistency)
        const token = jwt.sign(
            { 
                userId: primaryAccount.id, 
                email: primaryAccount.email,
                linkedUserIds: Array.from(allUserIds)
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        logger.info('ENTERPRISE AUTH: Using existing linked account', { email, provider });
        
        return {
            type: 'success',
            user: primaryAccount,
            token,
            redirectUrl: buildRedirectUrl(electronPort, provider, { token, email })
        };
    }
    
    // Handle existing unverified linked account
    if (existingUnverifiedLinkedAccount) {
        logger.info('ENTERPRISE AUTH: Found existing unverified linked account, proceeding with enterprise verification logic');
        
        const linkedProviderAccount = existingUnverifiedLinkedAccount.primaryUserId === primaryAccount.id 
            ? existingUnverifiedLinkedAccount.linkedUser 
            : existingUnverifiedLinkedAccount.primaryUser;
            
        // Evaluate trust levels for auto-verification
        const primaryTrust = evaluateProviderTrust(
            primaryAccount.provider || 'unknown',
            primaryAccount.email,
            primaryAccount.metadata
        );
        
        const linkedProviderTrust = evaluateProviderTrust(
            provider,
            email,
            linkedProviderAccount.metadata
        );
        
        // For high-trust scenarios, automatically verify the existing link
        const shouldAutoVerify = !determineVerificationRequirement(
            primaryTrust,
            linkedProviderTrust,
            primaryAccount
        );
        
        if (shouldAutoVerify) {
            logger.info('ENTERPRISE AUTH: Auto-verifying existing link due to high trust levels', {
                primaryTrust: primaryTrust.trustScore,
                linkedTrust: linkedProviderTrust.trustScore
            });
            
            // Auto-verify the existing link
            await prisma.linkedAccount.update({
                where: { id: existingUnverifiedLinkedAccount.id },
                data: {
                    verified: true,
                    metadata: {
                        ...existingUnverifiedLinkedAccount.metadata as any,
                        verifiedAt: new Date(),
                        autoVerifiedReason: 'high_trust_providers'
                    }
                }
            });
            
            // Update last login for the linked account
            await prisma.user.update({
                where: { id: linkedProviderAccount.id },
                data: {
                    metadata: {
                        ...linkedProviderAccount.metadata as any,
                        lastLoginAt: new Date()
                    }
                }
            });
            
            // Get all linked user IDs for the primary account
            const linkedAccounts = await prisma.linkedAccount.findMany({
                where: {
                    AND: [
                        {
                            OR: [
                                { primaryUserId: primaryAccount.id },
                                { linkedUserId: primaryAccount.id }
                            ]
                        },
                        { verified: true }
                    ]
                }
            });
            
            const allUserIds = new Set<string>([primaryAccount.id]);
            linkedAccounts.forEach(link => {
                allUserIds.add(link.primaryUserId);
                allUserIds.add(link.linkedUserId);
            });
            
            // Generate token using the primary account (for consistency)
            const token = jwt.sign(
                { 
                    userId: primaryAccount.id, 
                    email: primaryAccount.email,
                    linkedUserIds: Array.from(allUserIds)
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            // Audit log
            await prisma.accountLinkingAudit.create({
                data: {
                    userId: primaryAccount.id,
                    linkedId: linkedProviderAccount.id,
                    action: 'link_auto_verified',
                    performedBy: linkedProviderAccount.id,
                    metadata: {
                        reason: 'high_trust_providers',
                        trustScores: {
                            primary: primaryTrust.trustScore,
                            linked: linkedProviderTrust.trustScore
                        }
                    }
                }
            });
            
            logger.info('ENTERPRISE AUTH: Successfully auto-verified and logged in with linked account', { email, provider });
            
            return {
                type: 'success',
                user: primaryAccount,
                token,
                redirectUrl: buildRedirectUrl(electronPort, provider, { token, email })
            };
        } else {
            // Low trust - require manual verification
            logger.info('ENTERPRISE AUTH: Existing unverified link requires manual verification', {
                primaryTrust: primaryTrust.trustScore,
                linkedTrust: linkedProviderTrust.trustScore
            });
            
            // Generate auth token for the linked provider account
            const authToken = jwt.sign(
                { 
                    userId: linkedProviderAccount.id, 
                    email: email,
                    linkedUserIds: [linkedProviderAccount.id]
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            // Generate verification token
            const linkingToken = jwt.sign(
                {
                    primaryUserId: primaryAccount.id,
                    newUserId: linkedProviderAccount.id,
                    email,
                    primaryProvider: primaryAccount.provider || 'local',
                    newProvider: provider,
                    action: 'verify_existing_link',
                    existingLinkId: existingUnverifiedLinkedAccount.id,
                    trustLevel: calculateCombinedTrustLevel(primaryTrust, linkedProviderTrust),
                    exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minute expiry
                },
                JWT_SECRET
            );
            
            const redirectUrl = buildRedirectUrl(electronPort, provider, {
                token: authToken,
                email,
                action: 'verify_existing_link',
                existingProvider: primaryAccount.provider || 'local',
                linkingToken,
                requiresVerification: 'true'
            });
            
            logger.info('ENTERPRISE AUTH: Building redirect URL for verification', {
                electronPort,
                provider,
                action: 'verify_existing_link',
                existingProvider: primaryAccount.provider || 'local',
                hasToken: !!authToken,
                hasLinkingToken: !!linkingToken,
                redirectUrl,
                fullRedirectUrl: redirectUrl
            });
            
            return {
                type: 'requires_verification',
                user: linkedProviderAccount,
                token: authToken,
                linkingData: {
                    existingProvider: primaryAccount.provider || 'unknown',
                    newProvider: provider,
                    linkingToken,
                    verificationRequired: true,
                    trustLevel: calculateCombinedTrustLevel(primaryTrust, linkedProviderTrust)
                },
                redirectUrl
            };
        }
    }
    
    // No existing linked account found - proceed with creating new account
    const primaryTrust = evaluateProviderTrust(
        primaryAccount.provider || 'unknown',
        primaryAccount.email,
        primaryAccount.metadata
    );
    
    // Determine if we need additional verification
    const requiresVerification = determineVerificationRequirement(
        primaryTrust,
        trustLevel,
        primaryAccount
    );
    
    // For OAuth with same email but different provider, we'll use a temporary approach
    // In a real enterprise system, you'd handle this with a separate identity table
    // For now, we'll generate a unique email suffix for the provider
    const uniqueEmail = `${email}.${provider}.${Date.now()}`;
    
    // Create new account for this provider (to maintain separation)
    const newProviderAccount = await prisma.user.create({
        data: {
            email: uniqueEmail, // Temporary unique email to bypass constraint
            password: '',
            provider,
            emailVerified: trustLevel.emailVerified,
            metadata: {
                actualEmail: email, // Store the real email in metadata
                trustScore: trustLevel.trustScore,
                domainVerified: trustLevel.domainVerified,
                firstLoginAt: new Date(),
                lastLoginAt: new Date(),
                pendingLinkWith: primaryAccount.id
            }
        }
    });
    
    // Generate auth token for new account (use actual email, not unique one)
    // CRITICAL: Include linkedUserIds even for new accounts that will be linked
    const authToken = jwt.sign(
        { 
            userId: newProviderAccount.id, 
            email: email,
            linkedUserIds: [newProviderAccount.id] // Start with just this account
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    
    // Generate secure linking token with metadata
    const linkingToken = jwt.sign(
        {
            primaryUserId: primaryAccount.id,
            newUserId: newProviderAccount.id,
            email,
            primaryProvider: primaryAccount.provider || 'local',
            newProvider: provider,
            action: 'link_account',
            requiresVerification,
            trustLevel: calculateCombinedTrustLevel(primaryTrust, trustLevel),
            exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minute expiry
        },
        JWT_SECRET
    );
    
    // Create pending link record
    await prisma.linkedAccount.create({
        data: {
            primaryUserId: primaryAccount.id,
            linkedUserId: newProviderAccount.id,
            verified: !requiresVerification, // Auto-verify for high trust scenarios
            verificationCode: requiresVerification ? crypto.randomBytes(32).toString('hex') : null,
            metadata: {
                primaryTrust: primaryTrust.trustScore,
                newProviderTrust: trustLevel.trustScore,
                requiresVerification,
                initiatedAt: new Date()
            }
        }
    });
    
    // Audit log
    await prisma.accountLinkingAudit.create({
        data: {
            userId: primaryAccount.id,
            linkedId: newProviderAccount.id,
            action: 'link_proposed',
            performedBy: newProviderAccount.id,
            metadata: {
                primaryProvider: primaryAccount.provider || 'local',
                newProvider: provider,
                requiresVerification,
                trustScores: {
                    primary: primaryTrust.trustScore,
                    new: trustLevel.trustScore
                }
            }
        }
    });
    
    return {
        type: requiresVerification ? 'requires_verification' : 'requires_linking',
        user: newProviderAccount,
        token: authToken,
        linkingData: {
            existingProvider: primaryAccount.provider || 'unknown',
            newProvider: provider,
            linkingToken,
            verificationRequired: requiresVerification,
            trustLevel: calculateCombinedTrustLevel(primaryTrust, trustLevel)
        },
        redirectUrl: buildRedirectUrl(electronPort, provider, {
            token: authToken,
            email,
            action: 'link_account',
            existingProvider: primaryAccount.provider || 'local',
            linkingToken,
            requiresVerification: requiresVerification.toString()
        })
    };
}

// Determine if additional verification is needed based on trust levels
function determineVerificationRequirement(
    primaryTrust: ProviderTrustLevel,
    newTrust: ProviderTrustLevel,
    primaryAccount: any
): boolean {
    // High trust scenarios - no additional verification needed
    if (primaryTrust.enterpriseSSO && newTrust.enterpriseSSO) {
        return false; // Both are enterprise SSO
    }
    
    if (primaryTrust.trustScore >= 90 && newTrust.trustScore >= 90) {
        return false; // Both highly trusted
    }
    
    // Low trust scenarios - require verification
    if (!primaryTrust.emailVerified || !newTrust.emailVerified) {
        return true; // Unverified email
    }
    
    if (newTrust.trustScore < 70) {
        return true; // Low trust new provider
    }
    
    // Check for suspicious patterns
    const accountAge = Date.now() - new Date(primaryAccount.createdAt).getTime();
    const isNewAccount = accountAge < 24 * 60 * 60 * 1000; // Less than 24 hours old
    
    if (isNewAccount && primaryTrust.trustScore < 80) {
        return true; // New account with medium trust
    }
    
    return false;
}

// Calculate combined trust level for linked accounts
function calculateCombinedTrustLevel(
    trust1: ProviderTrustLevel,
    trust2: ProviderTrustLevel
): 'high' | 'medium' | 'low' {
    const avgScore = (trust1.trustScore + trust2.trustScore) / 2;
    
    if (avgScore >= 85) return 'high';
    if (avgScore >= 70) return 'medium';
    return 'low';
}

// Build redirect URL with proper encoding
function buildRedirectUrl(
    electronPort: string | null | undefined,
    provider: string,
    params: Record<string, string>
): string {
    const baseUrl = electronPort 
        ? `http://localhost:${electronPort}/auth/callback/${provider}`
        : `http://localhost:19858`;
    
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
    });
    
    return `${baseUrl}?${queryParams.toString()}`;
}

// Verify account ownership through email
export async function sendVerificationEmail(
    userId: string,
    email: string,
    verificationCode: string,
    context?: {
        existingProvider: string;
        newProvider: string;
    }
): Promise<void> {
    // Use the email service to send verification code
    const emailSent = await emailService.sendVerificationCode(email, verificationCode, {
        userId,
        existingProvider: context?.existingProvider || 'local',
        newProvider: context?.newProvider || 'unknown',
        expiresIn: 15 // 15 minutes
    });
    
    if (!emailSent) {
        logger.error('Failed to send verification email', { email, userId });
        throw createError('Failed to send verification email. Please try again later.', 500);
    }
    
    logger.info('EMAIL: Verification code sent successfully', { email, userId });
}

// Complete account linking with verification
export async function completeAccountLinking(
    linkingToken: string,
    verificationCode?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
        const decoded = jwt.verify(linkingToken, JWT_SECRET) as any;
        
        const linkedAccount = await prisma.linkedAccount.findFirst({
            where: {
                primaryUserId: decoded.primaryUserId,
                linkedUserId: decoded.newUserId
            }
        });
        
        if (!linkedAccount) {
            throw createError('Linking record not found', 404);
        }
        
        if (decoded.requiresVerification && linkedAccount.verificationCode !== verificationCode) {
            throw createError('Invalid verification code', 400);
        }
        
        // Update link as verified
        await prisma.linkedAccount.update({
            where: { id: linkedAccount.id },
            data: {
                verified: true,
                verificationCode: null,
                metadata: {
                    ...linkedAccount.metadata as any,
                    verifiedAt: new Date()
                }
            }
        });
        
        // Get all linked user IDs for the primary account
        const allLinkedAccounts = await prisma.linkedAccount.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { primaryUserId: decoded.primaryUserId },
                            { linkedUserId: decoded.primaryUserId }
                        ]
                    },
                    { verified: true }
                ]
            }
        });
        
        const allUserIds = new Set<string>([decoded.primaryUserId]);
        allLinkedAccounts.forEach(link => {
            allUserIds.add(link.primaryUserId);
            allUserIds.add(link.linkedUserId);
        });
        
        // Generate new token with all linked accounts
        const token = jwt.sign(
            {
                userId: decoded.primaryUserId,
                email: decoded.email,
                linkedUserIds: Array.from(allUserIds)
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Audit log
        await prisma.accountLinkingAudit.create({
            data: {
                userId: decoded.primaryUserId,
                linkedId: decoded.newUserId,
                action: 'link_completed',
                performedBy: decoded.newUserId,
                metadata: {
                    method: decoded.requiresVerification ? 'email_verification' : 'auto_trusted',
                    trustLevel: decoded.trustLevel
                }
            }
        });
        
        return { success: true, token };
    } catch (error) {
        logger.error('Account linking error', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to complete linking'
        };
    }
}