# JWT Token Rotation - Action Plan

## Issue Identified
After rotating the JWT_SECRET on the production server (Railway), all existing JWT tokens became invalid because they were signed with the old secret. This is causing "Invalid or expired token" errors.

## Immediate Actions Required

### 1. For Desktop App Users (You)
**You need to log out and log back in:**

1. Open the Article Saver desktop app
2. Go to Settings
3. Click "Sign Out" or "Logout"
4. Close the app completely
5. Reopen the app
6. Sign in again with your credentials
7. This will generate a new JWT token with the new secret

### 2. For All Other Users
All users who were logged in before the credential rotation will need to:
- Log out of the application
- Log back in to get a new valid token

## Technical Details

### What Happened:
- Old JWT Secret: `7NW6VgMcHDTrIvce6CIqiOhLdEyY1QR0ksEnaDH87ji/HsgU3YMCtGrNYAkNPl/Kakec4V+E7ZBd/c8O+B4u/w==`
- New JWT Secret: `bRJMGgAhIDHXFNMcfXmVM96kYhS6fLAfi4acWdTBMO4XAj+hEYE2VSZilcRiqR/B`
- All tokens signed with the old secret are now invalid

### Error Log Analysis:
```
2025-07-03 12:21:28 [article-saver-backend] error: Invalid or expired token
  "statusCode": 403,
  "url": "/api/pocket/sessions/discover",
  "method": "GET"
```

## Prevention for Future Rotations

### Option 1: Implement JWT Secret Rotation Strategy
- Keep both old and new secrets for a transition period
- Try verifying with new secret first, then fall back to old
- After all users have rotated, remove old secret

### Option 2: Implement Refresh Tokens
- Issue short-lived access tokens
- Use refresh tokens to get new access tokens
- During rotation, invalidate refresh tokens to force re-auth

### Option 3: Force Re-authentication
- Add a "secret version" to JWT payload
- When secret is rotated, increment version
- Reject tokens with old version

## Local Development Update
Your local `.env` file has been updated with the new credentials:
- ✅ DATABASE_URL updated
- ✅ JWT_SECRET updated

## Next Steps
1. Log out and log back in from the desktop app
2. Test Pocket authorization again
3. Monitor for any other authentication issues

---
**Generated**: 2025-07-03
**Issue**: JWT token invalidation after secret rotation