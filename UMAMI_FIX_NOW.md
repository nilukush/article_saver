# 🚨 UMAMI FIX - DO THIS NOW

## THE PROBLEM: Wrong Port Number!

You're using port **5432** but need port **6543**

## 1-MINUTE FIX:

### Step 1: Go to Vercel
https://vercel.com/dashboard → Your Umami Project → Settings → Environment Variables

### Step 2: Edit DATABASE_URL
Change:
```
:5432/postgres?pgbouncer=true&sslmode=require
```

To:
```
:6543/postgres?pgbouncer=true&connection_limit=1
```

### Step 3: Add APP_SECRET
If missing, add:
```
APP_SECRET=K7ZwmFtH9vH1PqNrXkYjWqBLzV8Tc4D6Qs5RnE3JmA8=
```

### Step 4: Redeploy
Click "Redeploy" → Use existing build cache → Deploy

## COMPLETE CONNECTION STRING:
```
postgresql://postgres.imbyatyyriivfuebqutt:d6gUL5ugknamY6HM@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

## WHY IT FAILS:
- Port 5432 = Direct connection (blocked by Vercel)
- Port 6543 = Pooled connection (works with Vercel)
- Vercel is serverless and needs pooled connections

That's it! Just change the port number!