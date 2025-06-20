import { prisma } from '../src/database';

async function cleanupDuplicateAccounts() {
    console.log('🧹 Starting account cleanup...\n');
    
    // Find the primary account
    const primaryAccount = await prisma.user.findUnique({
        where: { email: 'nilukush@gmail.com' }
    });
    
    if (!primaryAccount) {
        console.error('❌ Primary account not found');
        return;
    }
    
    console.log('✅ Found primary account:', {
        id: primaryAccount.id,
        email: primaryAccount.email,
        provider: primaryAccount.provider
    });
    
    // Find all Google accounts with unique emails
    const googleAccounts = await prisma.user.findMany({
        where: {
            email: {
                startsWith: 'nilukush@gmail.com.google.'
            }
        }
    });
    
    console.log(`\n📋 Found ${googleAccounts.length} Google accounts to process`);
    
    // Keep only the most recent Google account
    const sortedGoogleAccounts = googleAccounts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const accountToKeep = sortedGoogleAccounts[0];
    const accountsToDelete = sortedGoogleAccounts.slice(1);
    
    if (accountToKeep) {
        console.log('\n✅ Keeping most recent Google account:', {
            id: accountToKeep.id,
            email: accountToKeep.email,
            createdAt: accountToKeep.createdAt
        });
        
        // Ensure this account is properly linked to the primary
        const existingLink = await prisma.linkedAccount.findFirst({
            where: {
                OR: [
                    { primaryUserId: primaryAccount.id, linkedUserId: accountToKeep.id },
                    { primaryUserId: accountToKeep.id, linkedUserId: primaryAccount.id }
                ]
            }
        });
        
        if (!existingLink) {
            console.log('\n🔗 Creating link between primary and Google account...');
            await prisma.linkedAccount.create({
                data: {
                    primaryUserId: primaryAccount.id,
                    linkedUserId: accountToKeep.id,
                    verified: true,
                    metadata: {
                        method: 'cleanup',
                        linkedAt: new Date()
                    }
                }
            });
            console.log('✅ Link created');
        } else {
            console.log('✅ Accounts are already linked');
        }
    }
    
    // Delete duplicate Google accounts
    console.log(`\n🗑️  Deleting ${accountsToDelete.length} duplicate Google accounts...`);
    
    for (const account of accountsToDelete) {
        console.log(`Deleting: ${account.email} (${account.id})`);
        
        // First delete any linked account records
        await prisma.linkedAccount.deleteMany({
            where: {
                OR: [
                    { primaryUserId: account.id },
                    { linkedUserId: account.id }
                ]
            }
        });
        
        // Delete the user account
        await prisma.user.delete({
            where: { id: account.id }
        });
    }
    
    console.log('\n✅ Cleanup complete!');
    
    // Show final state
    const remainingAccounts = await prisma.user.findMany({
        where: {
            OR: [
                { email: 'nilukush@gmail.com' },
                { email: { startsWith: 'nilukush@gmail.com.' } }
            ]
        }
    });
    
    console.log(`\n📊 Final state: ${remainingAccounts.length} accounts`);
    remainingAccounts.forEach(acc => {
        console.log(`- ${acc.email} (${acc.provider})`);
    });
    
    await prisma.$disconnect();
}

cleanupDuplicateAccounts().catch(console.error);