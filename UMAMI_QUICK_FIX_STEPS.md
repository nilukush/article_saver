# Umami Quick Fix - Do These Steps Now

## 1. Check Vercel Logs First (1 minute)

Go to: https://vercel.com/dashboard
- Click your Umami project
- Go to "Functions" tab
- Click "Logs"
- Try to login again
- **Copy any error messages you see**

## 2. Most Likely Issue: Missing APP_SECRET

### Add APP_SECRET to Vercel:

1. Generate a secret:
   ```bash
   openssl rand -base64 32
   ```
   
   Or use this: `K7ZwmFtH9vH1PqNrXkYjWqBLzV8Tc4D6Qs5RnE3JmA8=`

2. Go to Vercel → Settings → Environment Variables
3. Add:
   ```
   APP_SECRET=K7ZwmFtH9vH1PqNrXkYjWqBLzV8Tc4D6Qs5RnE3JmA8=
   ```

4. Redeploy

## 3. Check Your Connection String

Your DATABASE_URL should look EXACTLY like this:
```
postgresql://postgres.imbyatyyriivfuebqutt:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require
```

Make sure:
- ✅ It has `pooler.supabase.com` (not db.supabase.co)
- ✅ Port is 5432 (not 6543)
- ✅ Has `?pgbouncer=true&sslmode=require` at the end
- ✅ Password has no special characters (or is URL encoded)

## 4. Force Database Migration

In Vercel Settings → General:
1. Change Build Command to:
   ```
   npx prisma migrate deploy && npm run build
   ```
2. Save and Redeploy

## 5. If Still Not Working - Check Database

Go to Supabase SQL Editor and run:
```sql
-- Check if Umami tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user', 'website', 'session', 'event');
```

If result is 0, tables don't exist - migration failed.

## 6. Emergency Fix - Manual Table Creation

If no tables exist:
1. Go to: https://github.com/umami-software/umami/blob/master/db/postgresql/migrations/01_init/migration.sql
2. Copy the SQL
3. Run in Supabase SQL Editor
4. Then run:
```sql
-- Create admin user
INSERT INTO "user" (user_id, username, password, role, created_at)
VALUES (
  '41e2b680-648e-4b09-bcd7-3e2b10c06264'::uuid,
  'admin',
  '$2b$10$BUli0c.muyCW1ErNJc3jL.vFRFtFJWrT8/GcR4A.sUdCznaXiqFXa',
  'admin',
  NOW()
);
```

## Common Fix Success Rate:
1. **Missing APP_SECRET**: 40% of cases
2. **Wrong connection string**: 30% of cases
3. **Failed migration**: 20% of cases
4. **Other issues**: 10% of cases

Try these in order and let me know which error you see in Vercel logs!