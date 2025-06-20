import { prisma } from '../src/database'

async function checkAccountLinking() {
    try {
        // Check linked accounts
        const linkedAccounts = await prisma.linkedAccount.findMany({
            include: {
                primaryUser: true,
                linkedUser: true
            }
        })
        
        console.log('Linked accounts:')
        linkedAccounts.forEach(link => {
            console.log(`- Primary: ${link.primaryUser.email} <-> Linked: ${link.linkedUser.email} (Verified: ${link.verified})`)
        })
        
        // Check if the accounts are linked
        const mainAccount = await prisma.user.findUnique({
            where: { email: 'nilukush@gmail.com' }
        })
        
        const googleAccount = await prisma.user.findUnique({
            where: { email: 'nilukush@gmail.com.google.1750402875382' }
        })
        
        if (mainAccount && googleAccount) {
            const link = await prisma.linkedAccount.findFirst({
                where: {
                    OR: [
                        { primaryUserId: mainAccount.id, linkedUserId: googleAccount.id },
                        { primaryUserId: googleAccount.id, linkedUserId: mainAccount.id }
                    ]
                }
            })
            
            if (link) {
                console.log('\n✅ Accounts are linked!')
                console.log(`Link verified: ${link.verified}`)
            } else {
                console.log('\n❌ Accounts are NOT linked!')
                console.log('This is why articles are not showing.')
            }
        }
        
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkAccountLinking()