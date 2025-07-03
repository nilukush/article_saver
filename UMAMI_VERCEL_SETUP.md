# Umami Analytics Setup on Vercel - Complete Guide

## Prerequisites
✅ You've forked Umami repository
✅ You have a Vercel account
❓ You need a PostgreSQL database (we'll set this up)

## Step 1: Set Up Free PostgreSQL Database

### Option A: Supabase (Recommended - Free tier)
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub
4. Create new project:
   - Project name: `article-saver-analytics`
   - Database Password: Generate a strong password (save this!)
   - Region: Choose closest to you
5. Wait for project to initialize (2-3 minutes)

### Get Your Database URL:
1. Go to Settings → Database
2. Find "Connection string" section
3. Copy the **URI** under "Connection Pooling" section
4. Your URL looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
5. **IMPORTANT**: Add `?pgbouncer=true` to the end:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?pgbouncer=true
   ```

## Step 2: Generate App Secret
Run this in your terminal to generate a secure secret:
```bash
openssl rand -base64 32
```
Or use any password generator to create a 32+ character random string.

## Step 3: Deploy to Vercel

1. Go to https://vercel.com/new
2. Import your forked Umami repository
3. Configure environment variables:

### Required Environment Variables:
```
DATABASE_URL = [Your Supabase connection string with ?pgbouncer=true]
APP_SECRET = [Your generated secret from Step 2]
```

### Optional but Recommended:
```
TRACKER_SCRIPT_NAME = stats.js
COLLECT_API_ENDPOINT = /api/analytics
```

4. Click "Deploy"
5. Wait for deployment (3-5 minutes)

## Step 4: Initialize Database

After deployment completes:
1. Visit your Umami URL: `https://[your-project].vercel.app`
2. You might see a database error - this is normal!
3. Go to Vercel dashboard → Functions tab
4. Check logs for any migration messages

If database isn't initialized:
1. Go to your Supabase project
2. Click "SQL Editor"
3. Create new query
4. Copy the schema from: https://github.com/umami-software/umami/blob/master/db/postgresql/schema.sql
5. Run the query

## Step 5: First Login

1. Visit: `https://[your-project].vercel.app`
2. Default credentials:
   - Username: `admin`
   - Password: `umami`
3. **IMMEDIATELY change the password!**

## Step 6: Add Your Website

1. Click "Settings" → "Websites"
2. Click "Add website"
3. Enter:
   - Name: `Article Saver`
   - Domain: `nilukush.github.io`
4. Copy the tracking code

## Step 7: Add Tracking to Your Site

Update your index.html:
```html
<!-- Replace the Plausible script with: -->
<script async src="https://[your-umami].vercel.app/script.js" data-website-id="[your-website-id]"></script>
```

### To Avoid Ad Blockers (Optional):
Add to your `vercel.json` in article_saver repo:
```json
{
  "rewrites": [
    {
      "source": "/stats/script.js",
      "destination": "https://[your-umami].vercel.app/script.js"
    },
    {
      "source": "/stats/collect",
      "destination": "https://[your-umami].vercel.app/api/collect"
    }
  ]
}
```

Then use:
```html
<script async src="/stats/script.js" data-website-id="[your-website-id]"></script>
```

## Step 8: Test Your Setup

1. Visit your website
2. Go to Umami dashboard
3. Check "Realtime" to see if your visit appears
4. If not, check browser console for errors

## Troubleshooting

### "Database connection failed"
- Check DATABASE_URL has `?pgbouncer=true`
- Verify password doesn't contain special characters that need encoding
- Check Supabase project is active

### "No data showing"
- Disable ad blocker to test
- Check website-id matches exactly
- Verify script is loading (Network tab)

### "Build failed on Vercel"
- Ensure all environment variables are set
- Check build logs for specific errors
- Try redeploying

## Your Specific Next Steps:

1. **Create Supabase account** (free)
2. **Get connection string** with pooling enabled
3. **Generate APP_SECRET**: 
   ```bash
   openssl rand -base64 32
   ```
4. **In Vercel**, when importing:
   - Add DATABASE_URL (with ?pgbouncer=true)
   - Add APP_SECRET
5. **Deploy and wait**
6. **Login and change password**
7. **Add your website**
8. **Update index.html** with new tracking code

## Benefits Over Plausible:
- ✅ 100% Free forever
- ✅ Unlimited websites
- ✅ No visitor limits
- ✅ Own your data
- ✅ Privacy-focused
- ✅ Can customize UI

This is the most cost-effective analytics solution for bootstrapped founders!