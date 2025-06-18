# Get Your Bearer Token

## Method 1: From Desktop App (Easiest)
1. Open Article Saver desktop app
2. Press `Cmd + Option + I` (macOS) to open Developer Tools
3. Go to "Application" tab
4. Click "Local Storage" in left sidebar
5. Look for your token (might be under `authToken`, `token`, or similar)

## Method 2: From Network Tab
1. Open Article Saver desktop app
2. Press `Cmd + Option + I` to open Developer Tools
3. Go to "Network" tab
4. Reload the app or perform any action
5. Look for API requests to `/api/articles`
6. Click on any request and check "Headers" tab
7. Find "Authorization: Bearer YOUR_TOKEN" in Request Headers

## Method 3: Test Token Validity
Once you have a token, test it with:
```bash
curl -X GET http://localhost:3001/api/articles/user/info \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

This should return your user info and article count.

## Then Use Cleanup Commands

### Complete Reset (All Articles)
```bash
curl -X DELETE http://localhost:3001/api/articles/bulk/all \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Smart Cleanup (Remove duplicates, empty content, etc.)
```bash
curl -X DELETE http://localhost:3001/api/articles/bulk/smart-cleanup \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "removeDuplicateUrls": true,
    "removeWithoutContent": true,
    "olderThanDays": 30
  }'
```