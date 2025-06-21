import { prisma } from '../src/database'

async function checkLinkedAccounts() {
    try {
        // Get all linked accounts
        const linkedAccounts = await prisma.linkedAccount.findMany({
            include: {
                primaryUser: true,
                linkedUser: true
            }
        })

        console.log('\n=== ALL LINKED ACCOUNTS ===\n')
        
        for (const link of linkedAccounts) {
            console.log(`Link ID: ${link.id}`)
            console.log(`  Primary User: ${link.primaryUser.email} (${link.primaryUserId})`)
            console.log(`  Linked User: ${link.linkedUser.email} (${link.linkedUserId})`)
            console.log(`  Verified: ${link.verified}`)
            console.log(`  Created: ${link.createdAt.toISOString()}`)
            console.log(`  Updated: ${link.updatedAt.toISOString()}`)
            console.log('\n---\n')
        }

        // Check specific users
        const googleUserId = '16ac50a9-be22-4858-96cf-cacb935361a0'
        const regularUserId = 'c1d7ac36-420a-4d32-8983-8ce084cc5ce9'
        
        console.log('\n=== CHECKING SPECIFIC USERS ===\n')
        
        // Check if Google account is linked
        const googleLinks = await prisma.linkedAccount.findMany({
            where: {
                OR: [
                    { primaryUserId: googleUserId },
                    { linkedUserId: googleUserId }
                ]
            },
            include: {
                primaryUser: true,
                linkedUser: true
            }
        })
        
        console.log(`Google account (${googleUserId}) links:`)
        if (googleLinks.length === 0) {
            console.log('  No links found')
        } else {
            googleLinks.forEach(link => {
                console.log(`  - Linked with: ${link.primaryUserId === googleUserId ? link.linkedUser.email : link.primaryUser.email}`)
            })
        }
        
        // Check if regular account is linked
        const regularLinks = await prisma.linkedAccount.findMany({
            where: {
                OR: [
                    { primaryUserId: regularUserId },
                    { linkedUserId: regularUserId }
                ]
            },
            include: {
                primaryUser: true,
                linkedUser: true
            }
        })
        
        console.log(`\nRegular account (${regularUserId}) links:`)
        if (regularLinks.length === 0) {
            console.log('  No links found')
        } else {
            regularLinks.forEach(link => {
                console.log(`  - Linked with: ${link.primaryUserId === regularUserId ? link.linkedUser.email : link.primaryUser.email}`)
            })
        }

    } catch (error) {
        console.error('Error checking linked accounts:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkLinkedAccounts()