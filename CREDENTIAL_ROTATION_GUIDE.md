# Credential Rotation Guide

## Overview
This guide provides step-by-step instructions for rotating all credentials that were exposed in the git repository.

## 1. Generate New Credentials

### JWT Secret
Generate a new secure JWT secret:
```bash
# Option 1: Using openssl
openssl rand -base64 64

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Database Password
Generate a new secure database password:
```bash
# Generate a 32-character password
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

## 2. Update Railway Environment Variables

### Via Railway Dashboard:
1. Go to https://railway.app/dashboard
2. Select your project: `article-saver`
3. Click on the `article-saver-backend` service
4. Go to the "Variables" tab
5. Update the following variables:
   - `JWT_SECRET`: Paste your new JWT secret
   - `DATABASE_URL`: Update with new password (see below)

### Via Railway CLI:
```bash
# Login to Railway
railway login

# Link to your project
railway link

# Update JWT_SECRET
railway variables set JWT_SECRET="your-new-jwt-secret-here"

# Update DATABASE_URL (replace password portion)
railway variables set DATABASE_URL="postgresql://postgres.ysrdtfglkisuqjfsfnqk:[NEW-PASSWORD-HERE]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

## 3. Update Supabase/PostgreSQL Password

### If using Supabase:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → Database
4. Click "Reset database password"
5. Copy the new password
6. Update the DATABASE_URL in Railway with the new password

### If using Railway PostgreSQL:
1. Go to Railway dashboard
2. Select the PostgreSQL service
3. Go to Settings → Database
4. Generate a new password
5. Update all services using this database

## 4. Restart Services

### Railway:
```bash
# Restart the backend service
railway up --service article-saver-backend

# Or via dashboard:
# Click "Redeploy" on the service
```

### Local Development:
1. Update your local `.env` file with new credentials
2. Restart your development servers:
```bash
npm run stop:all
npm run dev:backend
```

## 5. Verify Everything Works

### Test Authentication:
```bash
# Test login endpoint
curl -X POST https://articlesaver-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

### Check Database Connection:
```bash
# Check health endpoint
curl https://articlesaver-production.up.railway.app/api/health
```

### Monitor Logs:
```bash
# View Railway logs
railway logs --service article-saver-backend

# Or check in dashboard under "Logs" tab
```

## 6. Security Audit

### Check for Unauthorized Access:
1. Review Supabase logs:
   - Go to Supabase Dashboard → Logs → Database
   - Look for connections from unknown IPs
   - Check for unusual query patterns

2. Review Authentication logs:
   - Check Railway logs for failed login attempts
   - Look for tokens created with old JWT secret

3. User Account Audit:
   - Check for any new user accounts created
   - Review user activity for anomalies

### Database Queries to Run:
```sql
-- Check for recently created users
SELECT * FROM "User" 
WHERE "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;

-- Check for suspicious login patterns
SELECT email, COUNT(*) as login_attempts
FROM "AccountLinkingAudit"
WHERE action = 'login_attempt' 
  AND "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY email
HAVING COUNT(*) > 10;
```

## 7. Additional Security Measures

### Enable 2FA on Critical Services:
- [ ] Enable 2FA on GitHub account
- [ ] Enable 2FA on Railway account
- [ ] Enable 2FA on Supabase account

### Set Up Monitoring:
- [ ] Enable Railway alerting for failed deployments
- [ ] Set up Supabase email alerts for database access
- [ ] Configure GitHub security alerts

### Review Access:
- [ ] Audit GitHub repository collaborators
- [ ] Review Railway team members
- [ ] Check Supabase project members

## 8. Communication

### If User Data Was Potentially Accessed:
1. Prepare a security notification for users
2. Consider forcing password resets
3. Monitor for unusual account activity

### Internal Documentation:
1. Document the incident
2. Update security procedures
3. Schedule regular credential rotation

## Emergency Contacts

- Railway Support: https://railway.app/help
- Supabase Support: https://supabase.com/support
- GitHub Security: https://github.com/security

## Credential Rotation Schedule

Going forward, rotate credentials:
- JWT Secret: Every 90 days
- Database Password: Every 90 days
- OAuth Secrets: Every 180 days
- API Keys: Every 90 days

Set calendar reminders for credential rotation.

---

**Last Updated**: 2025-07-03
**Next Rotation Due**: 2025-10-01