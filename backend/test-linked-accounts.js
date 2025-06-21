#!/usr/bin/env node

/**
 * Test script to verify linked account article access
 * Run with: node test-linked-accounts.js
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3003/api';

async function testLinkedAccounts(email, password) {
    console.log(`\n🔍 Testing linked accounts for ${email}\n`);
    
    try {
        // 1. Login
        console.log('1. Logging in...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const loginData = await loginResponse.json();
        if (!loginResponse.ok) {
            console.error('❌ Login failed:', loginData);
            return;
        }
        
        const token = loginData.token;
        console.log('✅ Login successful');
        console.log('   User ID:', loginData.user.id);
        console.log('   Email:', loginData.user.email);
        
        // 2. Check user info
        console.log('\n2. Checking user info...');
        const userInfoResponse = await fetch(`${API_BASE}/articles/user/info`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const userInfo = await userInfoResponse.json();
        console.log('✅ User info retrieved:');
        console.log('   Linked accounts:', userInfo.user.linkedAccountCount || 1);
        console.log('   Total articles:', userInfo.stats.totalArticles);
        if (userInfo.stats.articlesByAccount) {
            console.log('   Articles by account:');
            Object.entries(userInfo.stats.articlesByAccount).forEach(([account, count]) => {
                console.log(`     - ${account}: ${count} articles`);
            });
        }
        
        // 3. Check linked accounts diagnostics
        console.log('\n3. Running linked accounts diagnostics...');
        const diagnosticsResponse = await fetch(`${API_BASE}/articles/diagnostics/linked-accounts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const diagnostics = await diagnosticsResponse.json();
        console.log('✅ Diagnostics complete:');
        console.log('   Token has linked IDs:', diagnostics.diagnostics.tokenInfo.hasLinkedIds);
        console.log('   Linked user IDs in token:', diagnostics.diagnostics.tokenInfo.linkedUserIds);
        console.log('   Database linked accounts:', diagnostics.diagnostics.databaseInfo.linkedAccounts.length);
        console.log('   Issues found:');
        Object.entries(diagnostics.diagnostics.issues).forEach(([issue, value]) => {
            console.log(`     - ${issue}: ${value}`);
        });
        console.log('   Recommendation:', diagnostics.recommendation);
        
        // 4. Get articles
        console.log('\n4. Fetching articles...');
        const articlesResponse = await fetch(`${API_BASE}/articles?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const articlesData = await articlesResponse.json();
        console.log('✅ Articles retrieved:');
        console.log('   Total articles accessible:', articlesData.pagination.total);
        console.log('   First 5 article titles:');
        articlesData.articles.forEach((article, index) => {
            console.log(`     ${index + 1}. ${article.title || 'Untitled'}`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Get credentials from command line or use defaults
const email = process.argv[2] || 'test@example.com';
const password = process.argv[3] || 'password123';

console.log('🚀 Article Saver - Linked Accounts Test');
console.log('=====================================');
console.log('Usage: node test-linked-accounts.js [email] [password]');

testLinkedAccounts(email, password);