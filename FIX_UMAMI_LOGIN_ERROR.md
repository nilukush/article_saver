# Fix Umami Login Error - JSON Parse Issue

## Error: "Failed to execute json on response unexpected end of json input"

This error means Umami's API is returning empty responses instead of JSON. Here's how to fix it:

## Step 1: Check Vercel Logs (Most Important)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your Umami project**
3. **Click "Functions" tab**
4. **Click "View Runtime Logs"**
5. **Look for errors** when you try to login

Common errors to look for:
- Database connection errors
- "relation does not exist" (missing tables)
- Authentication errors
- Migration failures

## Step 2: Verify Database Connection

### Check Your Environment Variables in Vercel:

1. Go to Settings → Environment Variables
2. Verify these are set correctly:

```env
DATABASE_URL=postgresql://postgres.imbyatyyriivfuebqutt:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require

# IMPORTANT: Generate this if missing!
APP_SECRET=[32-character-random-string]

# Optional but helpful
NODE_ENV=production
```

### Common Issues:
- ❌ Missing `?pgbouncer=true&sslmode=require`
- ❌ Using port 6543 instead of 5432
- ❌ Missing APP_SECRET
- ❌ Wrong password

## Step 3: Database Migration Check

The database tables might not have been created. Here's how to fix:

### Option A: Force Database Reset (Quickest)

1. **In Supabase SQL Editor**, run:
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- If no Umami tables, the migration didn't run
```

2. **If tables are missing**, redeploy with this build command in Vercel:
```
npx prisma migrate deploy && npm run build
```

### Option B: Manual Migration

1. **Add this environment variable** in Vercel:
```
DATABASE_TYPE=postgresql
```

2. **Redeploy** the application

## Step 4: Quick Fix Attempts

### Try These in Order:

1. **Clear Browser Data**
   - Clear cookies for umami-green-gamma-76.vercel.app
   - Try incognito/private browsing

2. **Check Build Command**
   - In Vercel Settings → General
   - Build Command should be: `npm run build` or `yarn build`
   - Install Command: `npm install` or `yarn install`

3. **Force Fresh Deployment**
   ```
   - Go to Deployments
   - Click ... menu on latest deployment
   - Select "Redeploy"
   - Choose "Use different environment variables"
   - Just click Deploy (even without changes)
   ```

## Step 5: Nuclear Option - Fresh Install

If nothing works, create a fresh database:

1. **In Supabase**:
   - Create new project: `umami-analytics-v2`
   - Get new connection string

2. **In Vercel**:
   - Update DATABASE_URL with new connection
   - Add build command: `npx prisma generate && npx prisma migrate deploy && npm run build`
   - Redeploy

## Step 6: Alternative - Direct Database Setup

If migrations aren't working, manually create the schema:

1. **Go to Supabase SQL Editor**
2. **Run the Umami schema**:
   - Get schema from: https://github.com/umami-software/umami/blob/master/db/postgresql/schema.sql
   - Paste and execute in SQL Editor

3. **Create default admin user**:
```sql
-- After tables are created, add default admin
INSERT INTO "user" (user_id, username, password, role)
VALUES (
  gen_random_uuid(),
  'admin',
  '$2b$10$BUli0c.muyCW1ErNJc3jL.vFRFtFJWrT8/GcR4A.sUdCznaXiqFXa',
  'admin'
);
```
(Default password is 'umami')

## Debugging Checklist:

- [ ] Check Vercel Function logs for errors
- [ ] Verify DATABASE_URL has pgbouncer=true
- [ ] Confirm APP_SECRET is set
- [ ] Check if database tables exist in Supabase
- [ ] Try incognito browser
- [ ] Look for CORS errors in browser console

## Expected Resolution:

After fixing, you should:
1. See login page load properly
2. Be able to login with admin/umami
3. See Umami dashboard
4. Change default password immediately

The most common cause is missing database tables due to failed migration. Check Vercel logs first!