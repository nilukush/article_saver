# ✅ Final OAuth Configuration Steps

You have EVERYTHING configured correctly in the code. Now you just need to:

## 1. Update Railway Environment Variables

The script has generated a complete configuration file with ALL your credentials from `.env`.

**Copy the JSON from `railway-complete-config.json` and paste it into Railway:**
1. Go to: https://railway.com/project/0aa88c47-f03c-4849-b177-79fff0c37282/settings/variables
2. Click "RAW Editor"
3. DELETE all existing content
4. Paste the complete JSON
5. Click "Update Variables"

## 2. Update OAuth Providers

### Google OAuth ✅
- Go to: https://console.cloud.google.com/apis/credentials
- Click on your OAuth 2.0 Client ID
- **ADD** this redirect URI (keep existing localhost ones):
  ```
  https://articlesaver-production.up.railway.app/api/auth/google/callback
  ```
- Click Save

### GitHub OAuth ⚠️
Since GitHub only allows ONE redirect URL, you have options:

**Quick Test Option:**
- Go to: https://github.com/settings/developers
- Click on your OAuth App
- TEMPORARILY change the callback URL to:
  ```
  https://articlesaver-production.up.railway.app/api/auth/github/callback
  ```
- Test production, then switch back to localhost for development

**Production Option:**
- Create a NEW GitHub OAuth App for production only
- Keep your existing app for development

### Pocket API ✅
- No action needed! Pocket uses dynamic redirect URIs
- Your existing consumer key will work automatically

## 3. Test Everything

After Railway redeploys (takes ~2-3 minutes), test:

```bash
# Test Google OAuth
curl https://articlesaver-production.up.railway.app/api/auth/google/url?port=3000

# Test GitHub OAuth
curl https://articlesaver-production.up.railway.app/api/auth/github/url?port=3000

# Test Pocket OAuth
curl https://articlesaver-production.up.railway.app/api/pocket/auth/url
```

## Summary

✅ Your existing OAuth credentials from `.env` are being used
✅ All secrets are properly configured
✅ Pocket consumer key is included
✅ Email (Brevo) configuration is included
✅ Just need to update the redirect URLs in Google and GitHub dashboards

The backend is already deployed and waiting for these environment variables!