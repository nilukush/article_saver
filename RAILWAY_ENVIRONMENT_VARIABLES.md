# Railway Environment Variables Configuration

This document lists all environment variables that need to be configured in Railway for production deployment.

## Required Environment Variables

### 🔐 Authentication & Security
```bash
# JWT Secret (min 32 characters, use Railway's generate random string)
JWT_SECRET=your-secure-jwt-secret-min-32-chars-here

# Session Secret (optional, defaults to JWT_SECRET)
SESSION_SECRET=your-session-secret-here
```

### 🗄️ Database
```bash
# PostgreSQL connection string (provided by Railway)
DATABASE_URL=postgresql://user:password@host:port/database?pgbouncer=true
```

### 🔑 OAuth Configuration

#### Google OAuth
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://articlesaver-production.up.railway.app/api/auth/google/callback
```

#### GitHub OAuth
```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=https://articlesaver-production.up.railway.app/api/auth/github/callback
```

#### Pocket Integration
```bash
POCKET_CONSUMER_KEY=your-pocket-consumer-key
POCKET_REDIRECT_URI=https://articlesaver-production.up.railway.app/api/pocket/callback
```

### 🌐 CORS & Frontend
```bash
# Frontend URL for CORS (update when frontend is deployed)
CORS_ORIGIN=https://articlesaver.app
```

### 📊 Monitoring & Alerts
```bash
# Webhook URL for critical alerts (optional)
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Enable APM (optional)
APM_ENABLED=false
```

### 🚀 Runtime Configuration
```bash
# Node environment
NODE_ENV=production

# Port (Railway provides this automatically)
PORT=3001
```

## How to Configure in Railway

1. **Navigate to your service** in Railway dashboard
2. Click on the **Variables** tab
3. Click **"Raw Editor"** for bulk entry or add individually
4. For sensitive values, click the **lock icon** to seal them

### Using Railway CLI
```bash
# Set a single variable
railway variables set JWT_SECRET=your-secret-here

# Set multiple variables from .env file
railway variables set < .env.production
```

## Security Best Practices

### 1. Seal Sensitive Variables
Always seal these variables in Railway:
- `JWT_SECRET`
- `SESSION_SECRET`
- `DATABASE_URL`
- All OAuth client secrets
- `ALERT_WEBHOOK_URL`

### 2. Generate Strong Secrets
Use Railway's random string generator or:
```bash
# Generate a secure secret
openssl rand -base64 32
```

### 3. OAuth Setup
1. Update OAuth provider settings with production URLs
2. Ensure redirect URIs match exactly (including https://)
3. Enable only required scopes

### 4. CORS Configuration
- Set `CORS_ORIGIN` to your exact frontend domain
- Don't use wildcards (*) in production
- Include both www and non-www if needed

## Verification

After setting all variables, verify configuration:

1. Check health endpoint:
```bash
curl https://articlesaver-production.up.railway.app/api/health
```

2. Check logs in Railway dashboard for any missing variable warnings

3. Test OAuth flows with each provider

## Troubleshooting

### Missing Variables
Check Railway logs for messages like:
- "JWT_SECRET is not set"
- "OAuth configuration incomplete"

### OAuth Redirect Errors
- Ensure redirect URIs match exactly
- Check for trailing slashes
- Verify HTTPS is used

### CORS Issues
- Check browser console for CORS errors
- Verify CORS_ORIGIN matches frontend URL
- Ensure credentials are included in requests