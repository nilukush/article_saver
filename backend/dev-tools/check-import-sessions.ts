import { prisma } from '../src/database';

async function checkImportSessions() {
    try {
        console.log('Checking import sessions...\n');
        
        // Get all import sessions
        const sessions = await prisma.importSession.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        console.log(`Total import sessions: ${sessions.length}`);
        
        // Group by status
        const statusGroups = sessions.reduce((acc, session) => {
            acc[session.status] = (acc[session.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        console.log('\nSessions by status:');
        Object.entries(statusGroups).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });
        
        // Show active sessions
        const activeSessions = sessions.filter(s => s.status === 'running' || s.status === 'pending');
        if (activeSessions.length > 0) {
            console.log('\nActive sessions:');
            activeSessions.forEach(session => {
                console.log(`  ID: ${session.id}`);
                console.log(`  User: ${session.userId}`);
                console.log(`  Status: ${session.status}`);
                console.log(`  Progress:`, session.progress);
                console.log(`  Updated: ${session.updatedAt}`);
                console.log('---');
            });
        } else {
            console.log('\nNo active sessions found.');
        }
        
        // Show recent sessions
        console.log('\nRecent sessions (last 5):');
        sessions.slice(0, 5).forEach(session => {
            console.log(`  ID: ${session.id}`);
            console.log(`  Status: ${session.status}`);
            console.log(`  Created: ${session.createdAt}`);
            console.log(`  Progress:`, session.progress);
            console.log('---');
        });
        
    } catch (error) {
        console.error('Error checking import sessions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkImportSessions();