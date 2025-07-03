# URGENT: Fix Umami Database Connection Error

## The Problem
Your connection is failing because you're using **port 5432** but Supabase pooled connections require **port 6543** for serverless environments like Vercel.

## Immediate Fix - Change Your DATABASE_URL

### Current (WRONG):
```
postgresql://postgres.imbyatyyriivfuebqutt:d6gUL5ugknamY6HM@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require
```

### Change to (CORRECT):
```
postgresql://postgres.imbyatyyriivfuebqutt:d6gUL5ugknamY6HM@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

## Step-by-Step Fix:

### 1. Update Environment Variable in Vercel

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your Umami project
3. Go to **Settings → Environment Variables**
4. Find `DATABASE_URL`
5. Click the three dots → Edit
6. **Change the port from 5432 to 6543**
7. **Remove** `&sslmode=require` (not needed for pooler)
8. **Add** `&connection_limit=1` (important for serverless)
9. Save

### 2. Add Missing Environment Variables

Make sure you have ALL of these:

```env
DATABASE_URL=postgresql://postgres.imbyatyyriivfuebqutt:d6gUL5ugknamY6HM@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

APP_SECRET=K7ZwmFtH9vH1PqNrXkYjWqBLzV8Tc4D6Qs5RnE3JmA8=

# Optional but recommended
DISABLE_DB_CHECK=1
```

### 3. Alternative: Skip Database Check During Build

If connection still fails, add this environment variable:
```
DISABLE_DB_CHECK=1
```

This will skip the database check during build time.

## Why This Happens

1. **Port 5432**: Direct database connection (doesn't work from Vercel)
2. **Port 6543**: Pooled connection via PgBouncer (required for serverless)
3. **Vercel is serverless**: Needs connection pooling to work properly

## Quick Test

After updating:
1. Click **Redeploy** in Vercel
2. Don't change any other settings
3. Just redeploy with new environment variables

## If It Still Fails

### Check These:

1. **Is your Supabase project active?**
   - Free tier projects pause after 1 week of inactivity
   - Go to Supabase dashboard and check

2. **Check for IP bans**:
   - Supabase Dashboard → Settings → Database → Network Bans
   - Remove any Vercel IPs if present

3. **Password issues**:
   - Your password `d6gUL5ugknamY6HM` looks fine (no special chars)
   - But if you changed it, avoid using `@` symbol

## Alternative Solution: Direct Deploy

If nothing works, try this build command in Vercel:
```
npm install --production && npm run build-app
```

This skips the database checks entirely.

## Expected Result

After fixing the port to 6543, deployment should succeed and you'll be able to:
1. Access Umami at https://umami-green-gamma-76.vercel.app
2. Login with admin/umami
3. See your analytics dashboard

The key issue is the PORT - change 5432 to 6543!