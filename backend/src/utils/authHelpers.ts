import { prisma } from '../database';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

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
    if (tokenLinkedIds && tokenLinkedIds.length > 0) {
        return tokenLinkedIds;
    }
    
    // Otherwise, query the database
    const linkedAccounts = await prisma.linkedAccount.findMany({
        where: {
            verified: true,
            OR: [
                { primaryUserId: userId },
                { linkedUserId: userId }
            ]
        }
    });

    const userIds = new Set<string>([userId]);
    
    linkedAccounts.forEach(link => {
        userIds.add(link.primaryUserId);
        userIds.add(link.linkedUserId);
    });

    return Array.from(userIds);
}