# Railway Deployment Guide - Article Saver Backend

## Overview
This guide provides enterprise-grade deployment instructions for the Article Saver backend on Railway.

## Current Configuration

### Railway.json (Root Directory)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run install:all && cd backend && npm run db:generate && npm run build"
  },
  "deploy": {
    "startCommand": "cd backend && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Key Features Already Implemented
✅ Health check endpoints (`/health` and `/api/health`)  
✅ Enterprise security with Helmet  
✅ Rate limiting (100 requests per 15 minutes)  
✅ Trust proxy configured for Railway  
✅ Winston logging with rotation  
✅ Proper error handling middleware  

## Environment Variables Setup

### Required Variables (Set in Railway Dashboard)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?pgbouncer=true

# Authentication
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://articlesaver-production.up.railway.app/api/auth/google/callback

# OAuth - GitHub  
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=https://articlesaver-production.up.railway.app/api/auth/github/callback

# OAuth - Pocket
POCKET_CONSUMER_KEY=your-pocket-consumer-key
POCKET_REDIRECT_URI=https://articlesaver-production.up.railway.app/api/pocket/callback

# Environment
NODE_ENV=production
PORT=3001

# Optional
CORS_ORIGIN=https://your-frontend-domain.com
```

### Security Best Practices
1. **Use Sealed Variables** for sensitive data:
   - JWT_SECRET
   - All OAuth client secrets
   - DATABASE_URL
   
2. **Shared Variables** for common settings:
   - NODE_ENV
   - API versions
   - Feature flags

## Railway Service Configuration

### Build & Deploy Settings
1. **Builder**: NIXPACKS (default)
2. **Node Provider**: Automatically detected
3. **Build Command**: Set via railway.json
4. **Start Command**: Set via railway.json
5. **Watch Paths**: 
   - `/backend/**`
   - `/shared/**`
   - `/package.json`
   - `/railway.json`

### Resource Configuration
- **CPU**: 2 vCPU
- **Memory**: 1 GB
- **Restart Policy**: ON_FAILURE (3 retries)
- **Region**: US West (California)

### Health Check Configuration
Railway will automatically use the `/health` endpoint. The backend provides:
- Basic health: `/health`
- Detailed health: `/api/health`
- Database health: `/api/debug/database-health`

## Deployment Process

### Initial Setup
1. Connect GitHub repository
2. Set all environment variables in Railway dashboard
3. Configure service settings as specified above
4. Deploy

### Deployment Commands
```bash
# Commit railway.json to repository
git add railway.json
git commit -m "Add Railway deployment configuration"
git push origin main

# Railway will auto-deploy on push to main branch
```

### Monitoring Deployment
1. Check build logs in Railway dashboard
2. Verify health endpoints after deployment:
   ```bash
   curl https://articlesaver-production.up.railway.app/health
   curl https://articlesaver-production.up.railway.app/api/health
   ```

## Post-Deployment Verification

### 1. Health Checks
```bash
# Basic health
curl https://articlesaver-production.up.railway.app/health

# Detailed health
curl https://articlesaver-production.up.railway.app/api/health

# Database health (for debugging)
curl https://articlesaver-production.up.railway.app/api/debug/database-health
```

### 2. OAuth Configuration
```bash
# Verify OAuth setup (remove in production)
curl https://articlesaver-production.up.railway.app/api/debug/oauth-config
```

### 3. Test Rate Limiting
Rate limiting is configured for 100 requests per 15 minutes. Test with:
```bash
for i in {1..101}; do curl https://articlesaver-production.up.railway.app/health; done
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check npm workspace configuration
   - Verify all dependencies are listed in backend/package.json
   - Ensure DATABASE_URL is set for Prisma generation

2. **Runtime Errors**
   - Check environment variables are properly set
   - Verify database connection string
   - Review logs in Railway dashboard

3. **OAuth Issues**
   - Ensure redirect URIs match exactly
   - Verify client IDs and secrets are correct
   - Check CORS configuration includes frontend URL

### Debug Endpoints (Remove in Production)
- `/api/debug/database-health` - Database connectivity
- `/api/debug/oauth-config` - OAuth configuration status

## Maintenance

### Database Migrations
```bash
# Run via Railway CLI
railway run npm run db:migrate
```

### Log Monitoring
- Logs are structured JSON in production
- Available in Railway dashboard
- Winston handles log rotation automatically

### Scaling
- Horizontal scaling: Increase replicas in Railway
- Vertical scaling: Adjust CPU/Memory limits
- Database: Consider connection pooling limits

## Security Checklist

- [ ] All sensitive variables sealed in Railway
- [ ] JWT_SECRET is at least 32 characters
- [ ] OAuth redirect URIs use HTTPS
- [ ] CORS origin properly configured
- [ ] Rate limiting enabled
- [ ] Helmet security headers active
- [ ] Trust proxy configured for Railway
- [ ] Debug endpoints removed for production

## Additional Resources

- [Railway Monorepo Guide](https://docs.railway.com/guides/monorepo)
- [Railway Environment Variables](https://docs.railway.com/guides/variables)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)