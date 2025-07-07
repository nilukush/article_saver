# Metabase Setup - Fixing Memory Issues

## Problem: Railway Free Tier Memory Limit
Metabase requires more memory than Railway's free tier provides (512MB). You have several options:

## Option 1: Local Metabase (Recommended for Now)
Since Metabase is already running locally on port 3000, let's use that:

### 1. Access Metabase
```bash
# Open in browser
open http://localhost:3000
```

### 2. Initial Setup
1. **Welcome Screen**: Click "Let's get started"
2. **Your Info**: 
   - First name: Nilesh
   - Last name: Kumar
   - Email: your-email
   - Password: Create a strong password
3. **Database**: Select "I'll add my data later"
4. **Usage data**: Disable anonymous usage statistics
5. Click "Finish"

### 3. Create Read-Only Database User
Connect to your Article Saver PostgreSQL and run:

```sql
-- Create read-only user for Metabase
CREATE USER metabase_reader WITH PASSWORD 'generate_secure_password_here';

-- Grant connection permission
GRANT CONNECT ON DATABASE postgres TO metabase_reader;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO metabase_reader;

-- Grant SELECT on all current tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_reader;

-- Grant SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_reader;

-- Verify permissions
\du metabase_reader
```

### 4. Connect to Article Saver Database
1. Click **Admin** (gear icon) → **Databases** → **Add database**
2. Configure:
   - **Database type**: PostgreSQL
   - **Display name**: Article Saver Analytics
   - **Host**: localhost (or your database host)
   - **Port**: 5432
   - **Database name**: postgres (or your database name)
   - **Username**: metabase_reader
   - **Password**: [the password you created]
   - **Schemas**: public
   - **SSL**: Prefer SSL

3. Click **Save**

### 5. Security Settings (Important!)
Since the logs show "Saved credentials encryption is DISABLED", do this:

1. **Admin** → **Settings** → **Security**
2. Enable:
   - Session cookies
   - Secure embedding (if needed)
   - Password complexity requirements

### 6. Create Your First Dashboard

#### Quick Executive Dashboard:
1. Click **New** → **SQL query**
2. Select "Article Saver Analytics" database
3. Paste this query:

```sql
-- User and Article Summary
SELECT 
  (SELECT COUNT(*) FROM "User") as total_users,
  (SELECT COUNT(*) FROM "Article") as total_articles,
  (SELECT COUNT(*) FROM "Article" WHERE "isRead" = true) as articles_read,
  (SELECT COUNT(DISTINCT "userId") FROM "Article" 
   WHERE DATE("createdAt") = CURRENT_DATE) as active_users_today
```

4. Click **Run query**
5. Click **Visualization** → Choose "Number"
6. Save as "Key Metrics"

## Option 2: Fix Railway Deployment

### Increase Memory Allocation
1. In Railway dashboard, click on Metabase service
2. Go to **Settings** → **Deploy**
3. Add environment variable:
   ```
   JAVA_OPTS=-Xmx256m -Xms128m
   ```
4. Redeploy

### Or Upgrade Railway Plan
- Hobby plan ($5/month) provides 8GB RAM
- This will easily run Metabase

## Option 3: Use Render.com (Free)

1. Sign up at https://render.com
2. Create new **PostgreSQL** database (free tier)
3. Create new **Web Service**:
   - Source: Docker
   - Image: `metabase/metabase:latest`
   - Instance Type: Free
   - Environment variables:
     ```
     MB_DB_TYPE=postgres
     MB_DB_DBNAME=[from step 2]
     MB_DB_PORT=5432
     MB_DB_USER=[from step 2]
     MB_DB_PASS=[from step 2]
     MB_DB_HOST=[from step 2]
     ```

## Option 4: Minimal Cloud Setup

Use **Supabase** for PostgreSQL + **Vercel** for Metabase:
1. Create free Supabase project
2. Deploy Metabase to Vercel using Docker
3. Connect them together

## Recommended Path

1. **Today**: Use local Metabase (already running)
2. **This week**: Set up dashboards and queries
3. **Next week**: Deploy to Render.com or upgrade Railway
4. **Long term**: Consider self-hosting on a VPS ($5/month)

## Next Steps with Local Metabase

1. Import queries from `analytics/metabase_queries.sql`
2. Create 4 dashboards:
   - Executive Overview
   - User Analytics  
   - Content Insights
   - Feature Usage
3. Set up email reports (requires SMTP configuration)
4. Share read-only dashboard links with your users

## Local Metabase Management

```bash
# Stop Metabase
# Press Ctrl+C in the terminal where it's running

# Start Metabase again
java -jar metabase.jar

# Run as background service
nohup java -jar metabase.jar &

# Check if running
ps aux | grep metabase
```

## Important Notes

1. **Backup**: Your local Metabase data is stored in `metabase.db.mv.db`
2. **Updates**: Download new versions from https://www.metabase.com/start/oss/
3. **Performance**: Local Metabase is fine for 2-10 users
4. **Access**: Only accessible on your machine unless you expose it

Would you like me to help you:
1. Set up the local Metabase dashboards?
2. Deploy to Render.com instead?
3. Upgrade Railway for more memory?