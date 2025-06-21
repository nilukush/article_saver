# Critical Fix: Linked Accounts Article Access Issue

## Problem
Users logging in with email/password were seeing 0 articles despite having linked accounts with articles. This was because the email/password login flow wasn't properly resolving linked accounts like the OAuth flow does.

## Root Cause
The email/password login endpoint was only including the single `userId` in the JWT token, not the array of linked user IDs. When the articles endpoint called `getAllLinkedUserIds()`, it had to query the database every time, and if there were any issues with the linked accounts (verification status, primary account resolution, etc.), users wouldn't see their articles.

## Solution Implemented

### 1. Enhanced Email/Password Login (auth.ts)
- Now properly resolves ALL linked accounts during login
- Includes `linkedUserIds` array in the JWT token
- Ensures consistent behavior with OAuth logins

### 2. Updated Authentication Middleware (auth.ts)
- Extended `AuthenticatedRequest` interface to include `linkedUserIds`
- Passes linked user IDs from token to request context

### 3. Optimized getAllLinkedUserIds Function (authHelpers.ts)
- Now accepts optional `tokenLinkedIds` parameter
- Uses token data when available (performance optimization)
- Falls back to database query only when needed

### 4. Updated All Article Endpoints (articles.ts)
- Pass token linked IDs to `getAllLinkedUserIds` function
- Ensures all endpoints use the optimized approach

### 5. Added Diagnostic Endpoints
- `/api/articles/user/info` - Shows article counts across all linked accounts
- `/api/articles/diagnostics/linked-accounts` - Comprehensive linked account diagnostics

## Testing the Fix

1. **Run the test script:**
   ```bash
   cd backend
   node test-linked-accounts.js user@example.com password123
   ```

2. **Check the diagnostics endpoint:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3003/api/articles/diagnostics/linked-accounts
   ```

3. **Verify user info:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3003/api/articles/user/info
   ```

## What Users Need to Do

**IMPORTANT:** Users experiencing this issue need to:
1. Log out completely
2. Log back in with their email/password
3. Their new token will contain all linked user IDs
4. They should now see articles from all linked accounts

## Technical Details

### JWT Token Structure (Before)
```json
{
  "userId": "uuid-1234",
  "email": "user@example.com"
}
```

### JWT Token Structure (After)
```json
{
  "userId": "uuid-1234",
  "email": "user@example.com",
  "linkedUserIds": ["uuid-1234", "uuid-5678", "uuid-9012"]
}
```

## Monitoring
- Check logs for `[AUTH] Email/password login successful with linked accounts`
- Monitor the `linkedAccountCount` in login logs
- Use diagnostic endpoints to verify linked account resolution

## Future Improvements
1. Consider migrating to enterprise authentication middleware for all endpoints
2. Add automatic token refresh when linked accounts change
3. Implement a unified identity resolution service