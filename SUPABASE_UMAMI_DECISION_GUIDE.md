# Supabase & Umami Setup Decision Guide

## 1. Supabase Project Decision

### ✅ RECOMMENDATION: Create Separate Project for Umami

**Why separate projects are better:**

1. **Performance Isolation**
   - Your main app won't slow down from analytics queries
   - Each project gets its own connection pool
   - No resource competition between apps

2. **Security Benefits**
   - Complete data isolation
   - Separate API keys (reduced security risk)
   - Different access patterns and permissions

3. **Cost Efficiency**
   - Supabase allows 2 free projects
   - You already have 1 for Article Saver
   - Perfect for adding analytics as 2nd project

4. **Best Practice**
   - Industry standard: separate operational and analytical databases
   - Easier maintenance and debugging
   - Independent scaling

### Your Action Plan:
1. **Keep existing project**: `article-saver` (for main app)
2. **Create new project**: `article-saver-analytics` (for Umami)
3. Both stay within free tier limits!

## 2. Umami Environment Variables Explained

### About TRACKER_SCRIPT_NAME and COLLECT_API_ENDPOINT

These are **optional** variables that help avoid ad blockers:

```
TRACKER_SCRIPT_NAME = stats.js
COLLECT_API_ENDPOINT = /api/analytics
```

**What they do:**
- `TRACKER_SCRIPT_NAME`: Renames the default `script.js` to `stats.js`
- `COLLECT_API_ENDPOINT`: Changes data collection endpoint from `/api/collect` to `/api/analytics`

**Do you have these files already?** 
- **NO** - Umami creates these automatically when deployed
- These are Umami's files, not yours
- They help disguise analytics from ad blockers

### Complete Environment Variables for Vercel:

```
# Required
DATABASE_URL = postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?pgbouncer=true
APP_SECRET = [32+ character random string]

# Optional (but recommended for avoiding ad blockers)
TRACKER_SCRIPT_NAME = stats.js
COLLECT_API_ENDPOINT = /api/analytics
```

## 3. Screenshot Issue Fix

I see the problem - the screenshots weren't properly renamed. Let me fix this:

### Current Situation:
- You have 5 screenshots including the new import progress one
- The renamed files might be pointing to wrong images

### Fix Steps:
1. Copy the new import screenshot
2. Update the HTML to use correct screenshots
3. Ensure each tab shows different image