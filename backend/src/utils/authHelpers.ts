import { prisma } from '../database';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

export const signJWT = (payload: object): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export interface OAuthUserData {
    email: string;
    provider: 'google' | 'github';
}

export async function handleOAuthLogin(userData: OAuthUserData, electronPort?: string | null): Promise<{
    type: 'success' | 'link_account';
    user?: any;
    token?: string;
    existingProvider?: string;
    linkingProvider?: string;
    linkingToken?: string;
    redirectUrl: string;
}> {
    const { email, provider } = userData;

    // Check if user exists with this email
    let user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        // Create new user with OAuth provider
        user = await prisma.user.create({
            data: {
                email,
                password: '', // OAuth users don't have passwords
                provider
            }
        });

        // Generate JWT token
        const token = signJWT({ userId: user.id, email: user.email });
        
        return {
            type: 'success',
            user,
            token,
            redirectUrl: electronPort 
                ? `http://localhost:${electronPort}/auth/callback/${provider}?token=${token}&email=${encodeURIComponent(email)}`
                : `http://localhost:19858?token=${token}&email=${encodeURIComponent(email)}`
        };
    }

    // User exists, check provider
    if (user.provider === provider) {
        // Same provider, normal login
        const token = signJWT({ userId: user.id, email: user.email });
        
        return {
            type: 'success',
            user,
            token,
            redirectUrl: electronPort 
                ? `http://localhost:${electronPort}/auth/callback/${provider}?token=${token}&email=${encodeURIComponent(email)}`
                : `http://localhost:19858?token=${token}&email=${encodeURIComponent(email)}`
        };
    }

    // Different provider - create a new user with this provider
    // This allows multiple accounts with same email but different providers
    const newProviderUser = await prisma.user.create({
        data: {
            email,
            password: '', // OAuth users don't have passwords
            provider
        }
    });
    
    // Generate token for the new account
    const token = signJWT({ userId: newProviderUser.id, email: newProviderUser.email });
    
    // Also generate a linking token in case they want to link later
    const linkingToken = signJWT({ 
        userId: user.id, 
        email: user.email,
        newUserId: newProviderUser.id,
        existingProvider: user.provider,
        linkingProvider: provider,
        action: 'link_account'
    });
    
    return {
        type: 'link_account',
        user: newProviderUser,
        token,
        existingProvider: user.provider || 'unknown',
        linkingProvider: provider,
        linkingToken,
        redirectUrl: electronPort 
            ? `http://localhost:${electronPort}/auth/callback/${provider}?action=link_account&token=${token}&existingProvider=${user.provider || 'unknown'}&linkingToken=${linkingToken}&email=${encodeURIComponent(email)}`
            : `http://localhost:19858?action=link_account&token=${token}&existingProvider=${user.provider || 'unknown'}&linkingToken=${linkingToken}&email=${encodeURIComponent(email)}`
    };
}

export async function getAllLinkedUserIds(userId: string, tokenLinkedIds?: string[]): Promise<string[]> {
    // If linked IDs are already in the token, use those for performance
    // BUT only if we're confident they're complete (this is an optimization for verified tokens)
    if (tokenLinkedIds && tokenLinkedIds.length > 1) {
        // Verify the token contains the current user and do a quick validation
        if (tokenLinkedIds.includes(userId)) {
            return tokenLinkedIds;
        }
    }
    
    // Otherwise, query the database with RECURSIVE/TRANSITIVE linking
    // This finds all accounts connected through any chain of verified links
    const allFound = new Set<string>();
    const toProcess = [userId];
    
    while (toProcess.length > 0) {
        const currentUserId = toProcess.pop()!;
        if (allFound.has(currentUserId)) continue;
        
        allFound.add(currentUserId);
        
        // Find all verified linked accounts for the current user
        const linkedAccounts = await prisma.linkedAccount.findMany({
            where: {
                verified: true,
                OR: [
                    { primaryUserId: currentUserId },
                    { linkedUserId: currentUserId }
                ]
            }
        });
        
        // Add newly discovered users to the processing queue
        for (const link of linkedAccounts) {
            if (!allFound.has(link.primaryUserId)) {
                toProcess.push(link.primaryUserId);
            }
            if (!allFound.has(link.linkedUserId)) {
                toProcess.push(link.linkedUserId);
            }
        }
    }

    return Array.from(allFound);
}