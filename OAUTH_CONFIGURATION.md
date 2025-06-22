# 🔐 OAuth Configuration Guide

## Production OAuth Setup

### 1. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add the following to **Authorized redirect URIs**:
   ```
   https://articlesaver-production.up.railway.app/api/auth/google/callback
   ```
4. Save the changes

### 2. GitHub OAuth Configuration

⚠️ **Important**: GitHub only allows ONE redirect URL per OAuth app.

#### Option A: Create Separate OAuth Apps (Recommended)

**Development App:**
- Application name: `Article Saver (Dev)`
- Homepage URL: `http://localhost:3003`
- Authorization callback URL: `http://localhost:3003/api/auth/github/callback`

**Production App:**
- Application name: `Article Saver`
- Homepage URL: `https://articlesaver-production.up.railway.app`
- Authorization callback URL: `https://articlesaver-production.up.railway.app/api/auth/github/callback`

#### Option B: Use GitHub Apps (Multiple Redirect URLs)
GitHub Apps support multiple redirect URLs, unlike OAuth Apps.

### 3. Environment Variables

Set these in Railway dashboard (Settings → Variables → RAW Editor):

```json
{
  "GOOGLE_CLIENT_ID": "your-google-client-id",
  "GOOGLE_CLIENT_SECRET": "your-google-client-secret",
  "GOOGLE_REDIRECT_URI": "https://articlesaver-production.up.railway.app/api/auth/google/callback",
  "GITHUB_CLIENT_ID": "your-github-client-id",
  "GITHUB_CLIENT_SECRET": "your-github-client-secret",
  "GITHUB_REDIRECT_URI": "https://articlesaver-production.up.railway.app/api/auth/github/callback"
}
```

### 4. Pocket Configuration

The Pocket consumer key should also be configured:
```json
{
  "POCKET_CONSUMER_KEY": "your-pocket-consumer-key",
  "POCKET_REDIRECT_URI": "https://articlesaver-production.up.railway.app/api/pocket/callback"
}
```

## Security Best Practices

1. **Never commit OAuth secrets to Git**
2. **Use different OAuth apps for each environment**
3. **Regularly rotate OAuth secrets**
4. **Monitor OAuth usage in provider dashboards**
5. **Implement proper CSRF protection with state parameters**

## Testing OAuth

After configuration, test the OAuth flows:

1. **Google OAuth**: 
   ```
   https://articlesaver-production.up.railway.app/api/auth/google/url?port=3000
   ```

2. **GitHub OAuth**:
   ```
   https://articlesaver-production.up.railway.app/api/auth/github/url?port=3000
   ```

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Ensure URLs match exactly (including protocol and trailing slashes)
   - Check for typos in environment variables

2. **Invalid Client Error**
   - Verify client ID and secret are correct
   - Ensure OAuth app is not disabled

3. **CORS Issues**
   - Check CORS_ORIGIN environment variable
   - Verify desktop app is using correct backend URL

### Debug Steps

1. Check Railway logs: `railway logs`
2. Verify environment variables are set correctly
3. Test OAuth provider directly in browser
4. Check network tab for exact error messages