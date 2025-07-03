# Umami + Supabase Connection Fix - Step by Step

## The Problem
Your deployment is failing because you're using the DIRECT database URL instead of the POOLER URL.

## Step-by-Step Fix

### 1. Get the Correct Connection String from Supabase

1. **Login to Supabase**: https://supabase.com/dashboard
2. **Select your project**: `article-saver-analytics`
3. **Navigate to**: Settings (gear icon) → Database
4. **Find "Connection pooling" section**
5. **IMPORTANT**: Make sure these settings are selected:
   - Connection pooling: **Enabled** ✅
   - Pool mode: **Session** (NOT Transaction)
   
6. **Copy the connection string** that looks like:
   ```
   postgresql://postgres.imbyatyyriivfuebqutt:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```

   ⚠️ **NOT the one that looks like**:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.imbyatyyriivfuebqutt.supabase.co:5432/postgres
   ```

### 2. Prepare Your Environment Variables

```env
# CORRECT FORMAT (notice "pooler" in the URL)
DATABASE_URL=postgresql://postgres.imbyatyyriivfuebqutt:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require

# Your app secret (generate if you haven't)
APP_SECRET=your-32-character-secret-here

# Optional (helps avoid ad blockers)
TRACKER_SCRIPT_NAME=stats.js
COLLECT_API_ENDPOINT=/api/analytics
```

### 3. Update Vercel Environment Variables

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your Umami project**
3. **Navigate to**: Settings → Environment Variables
4. **Update DATABASE_URL**:
   - Delete the old one
   - Add new one with the POOLER URL
   - Make sure to add `?pgbouncer=true&sslmode=require` at the end
5. **Save changes**

### 4. Redeploy

1. Go to Deployments tab
2. Click on the three dots (...) next to the failed deployment
3. Click "Redeploy"
4. Select "Use existing environment variables"
5. Deploy

## Why This Fix Works

1. **Pooler vs Direct**:
   - Direct connections are for migrations and admin tasks
   - Pooler connections are for applications (like Umami on Vercel)
   - Vercel is serverless and needs connection pooling

2. **Session vs Transaction Mode**:
   - Umami uses Prisma with prepared statements
   - Only SESSION mode supports prepared statements
   - Transaction mode will fail

3. **SSL Requirement**:
   - Supabase requires SSL for security
   - The `sslmode=require` parameter is mandatory

## Verification Steps

After deployment succeeds:
1. Visit your Umami URL
2. Login with default credentials:
   - Username: `admin`
   - Password: `umami`
3. **IMMEDIATELY change the password**
4. Add your website for tracking

## Common Mistakes to Avoid

❌ Using direct database URL (db.xxx.supabase.co)
❌ Using transaction mode pooling (port 6543)
❌ Forgetting sslmode=require
❌ Not including pgbouncer=true
❌ Using wrong password format

✅ Use pooler URL (pooler.supabase.com)
✅ Use session mode (port 5432)
✅ Include both pgbouncer=true AND sslmode=require
✅ Copy password exactly as shown in Supabase

## If It Still Fails

1. **Check Supabase logs**:
   - Supabase Dashboard → Logs → Postgres
   - Look for connection attempts

2. **Verify password**:
   - Try resetting database password in Supabase
   - Use simple password without special characters

3. **Check for IP bans**:
   - Settings → Database → Network Bans
   - Remove any Vercel IPs if banned

This should fix your deployment!