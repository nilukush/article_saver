import { prisma } from '../database';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createError } from '../middleware/errorHandler';

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
    
    if (existingProviderAccount) {
        // Same email+provider exists - just log them in
        const token = jwt.sign(
            { userId: existingProviderAccount.id, email: existingProviderAccount.email },
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
        
        return {
            type: 'success',
            user: existingProviderAccount,
            token,
            redirectUrl: buildRedirectUrl(electronPort, provider, { token, email })
        };
    }
    
    // Check for ANY accounts with this email (different providers)
    const existingAccounts = await prisma.user.findMany({
        where: { email }
    });
    
    if (existingAccounts.length === 0) {
        // No existing account with this email - create new user
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
            { userId: user.id, email: user.email },
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
    // This triggers the account linking flow
    const primaryAccount = existingAccounts[0]; // For now, use first account as primary
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
    const authToken = jwt.sign(
        { userId: newProviderAccount.id, email: email },
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
    verificationCode: string
): Promise<void> {
    // In production, integrate with email service
    // For now, log the verification code
    console.log('[EMAIL] Verification code for', email, ':', verificationCode);
    
    // Create audit log
    await prisma.accountLinkingAudit.create({
        data: {
            userId,
            action: 'verification_email_sent',
            performedBy: userId,
            metadata: {
                email,
                timestamp: new Date()
            }
        }
    });
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
        
        // Generate new token with linked accounts
        const token = jwt.sign(
            {
                userId: decoded.primaryUserId,
                email: decoded.email,
                linkedUserIds: [decoded.newUserId]
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
        console.error('Account linking error:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to complete linking'
        };
    }
}