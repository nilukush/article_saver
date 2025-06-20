import { prisma } from '../src/database';
import bcrypt from 'bcryptjs';

async function setPassword() {
    const email = 'nilukush@gmail.com';
    const password = process.argv[2];
    
    if (!password) {
        console.error('❌ Please provide a password as argument');
        console.error('Usage: npm run set-password <password>');
        process.exit(1);
    }
    
    console.log(`\n🔐 Setting password for user: ${email}\n`);
    
    // Find the user
    const user = await prisma.user.findUnique({
        where: { email }
    });
    
    if (!user) {
        console.error('❌ User not found');
        process.exit(1);
    }
    
    console.log('✅ Found user:', {
        id: user.id,
        email: user.email,
        provider: user.provider,
        hasPassword: !!user.password
    });
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the user with the new password
    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });
    
    console.log('\n✅ Password set successfully!');
    console.log('You can now login with email/password');
    
    await prisma.$disconnect();
}

setPassword().catch(console.error);