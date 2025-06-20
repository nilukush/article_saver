import { prisma } from '../src/database';

async function checkUser() {
    const email = 'nilukush@gmail.com';
    
    console.log(`\n🔍 Checking for user with email: ${email}\n`);
    
    // Direct email lookup
    const directUser = await prisma.user.findUnique({
        where: { email }
    });
    
    if (directUser) {
        console.log('✅ Found user with direct email match:');
        console.log({
            id: directUser.id,
            email: directUser.email,
            provider: directUser.provider,
            hasPassword: !!directUser.password,
            passwordLength: directUser.password?.length || 0,
            primaryAccountId: directUser.primaryAccountId,
            emailVerified: directUser.emailVerified,
            createdAt: directUser.createdAt
        });
    } else {
        console.log('❌ No user found with direct email match');
    }
    
    // Check for users with this email in metadata
    const usersWithEmailInMetadata = await prisma.user.findMany({
        where: {
            metadata: {
                path: ['actualEmail'],
                equals: email
            }
        }
    });
    
    console.log(`\n📋 Found ${usersWithEmailInMetadata.length} users with email in metadata`);
    usersWithEmailInMetadata.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log({
            id: user.id,
            email: user.email,
            provider: user.provider,
            hasPassword: !!user.password,
            passwordLength: user.password?.length || 0,
            primaryAccountId: user.primaryAccountId,
            metadata: user.metadata
        });
    });
    
    // Check for users with similar emails (might have provider suffix)
    const similarUsers = await prisma.user.findMany({
        where: {
            email: {
                contains: email.split('@')[0]
            }
        }
    });
    
    console.log(`\n🔎 Found ${similarUsers.length} users with similar emails`);
    similarUsers.forEach((user, index) => {
        console.log(`\nSimilar User ${index + 1}:`);
        console.log({
            id: user.id,
            email: user.email,
            provider: user.provider,
            hasPassword: !!user.password,
            primaryAccountId: user.primaryAccountId
        });
    });
    
    // Check linked accounts
    console.log('\n🔗 Checking linked accounts...');
    const linkedAccounts = await prisma.linkedAccount.findMany({
        include: {
            primaryUser: true,
            linkedUser: true
        }
    });
    
    console.log(`Found ${linkedAccounts.length} total linked accounts`);
    
    await prisma.$disconnect();
}

checkUser().catch(console.error);