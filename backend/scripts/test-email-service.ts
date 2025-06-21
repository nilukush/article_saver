#!/usr/bin/env npx ts-node

import dotenv from 'dotenv';
import { emailService } from '../src/services/emailService';
import { storeVerificationCode } from '../src/utils/verificationCode';
import logger from '../src/utils/logger';

// Load environment variables
dotenv.config();

async function testEmailService() {
    console.log('🧪 Testing Email Service Configuration...\n');

    // Test 1: Check configuration
    console.log('1️⃣ Checking email configuration...');
    const hasConfig = process.env.SMTP_USER && process.env.SMTP_PASS;
    if (!hasConfig) {
        console.error('❌ Email service not configured. Please set SMTP_USER and SMTP_PASS in .env file');
        process.exit(1);
    }
    console.log('✅ Email configuration found\n');

    // Test 2: Test connection
    console.log('2️⃣ Testing SMTP connection...');
    const isConnected = await emailService.testConnection();
    if (!isConnected) {
        console.error('❌ Failed to connect to SMTP server. Please check your credentials.');
        process.exit(1);
    }
    console.log('✅ SMTP connection successful\n');

    // Test 3: Send test verification email
    const testEmail = process.argv[2];
    if (!testEmail) {
        console.log('ℹ️  To send a test email, run: npm run test:email your-email@example.com');
        console.log('\n✅ Email service is properly configured and ready to use!');
        process.exit(0);
    }

    console.log(`3️⃣ Sending test verification email to ${testEmail}...`);
    
    try {
        // Generate a test verification code
        const { code, expiresAt } = await storeVerificationCode(
            'test-user-id',
            testEmail,
            'test_email_service',
            { length: 6, type: 'numeric' }
        );

        // Send the email
        const sent = await emailService.sendVerificationCode(testEmail, code, {
            userId: 'test-user-id',
            existingProvider: 'local',
            newProvider: 'google',
            expiresIn: 15
        });

        if (sent) {
            console.log('✅ Test email sent successfully!');
            console.log(`📧 Check ${testEmail} for a verification code: ${code}`);
            console.log(`⏰ Code expires at: ${expiresAt.toLocaleString()}`);
        } else {
            console.error('❌ Failed to send test email');
        }
    } catch (error) {
        console.error('❌ Error sending test email:', error);
    }

    console.log('\n✅ Email service test completed!');
    process.exit(0);
}

// Run the test
testEmailService().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});