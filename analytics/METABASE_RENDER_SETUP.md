# Metabase + Supabase Setup Guide (Free)

## 30-Minute Setup

### Step 1: Get Supabase Connection Details
1. Go to your Supabase dashboard
2. Settings → Database
3. Copy:
   - Host: `db.xxxxxxxxxxxx.supabase.co`
   - Port: `5432` 
   - Database: `postgres`
   - User: `postgres`
   - Password: Your database password

### Step 2: Deploy Metabase on Render
1. Go to https://render.com
2. Sign up (free)
3. New → Blueprint
4. Use this render.yaml:

```yaml
databases:
  - name: metabase-db
    plan: free
    databaseName: metabase
    user: metabase

services:
  - type: web
    name: article-saver-analytics
    plan: free
    env: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: MB_DB_TYPE
        value: postgres
      - key: MB_DB_DBNAME
        fromDatabase:
          name: metabase-db
          property: database
      - key: MB_DB_HOST
        fromDatabase:
          name: metabase-db
          property: host
      - key: MB_DB_PORT
        fromDatabase:
          name: metabase-db
          property: port
      - key: MB_DB_USER
        fromDatabase:
          name: metabase-db
          property: user
      - key: MB_DB_PASS
        fromDatabase:
          name: metabase-db
          property: password
      - key: MB_ENCRYPTION_SECRET_KEY
        generateValue: true
```

5. Create Dockerfile:
```dockerfile
FROM metabase/metabase:latest
```

6. Deploy (takes ~10 minutes)

### Step 3: Connect to Supabase
1. Access your Metabase URL (from Render dashboard)
2. Complete setup wizard
3. Add Database → PostgreSQL
4. Enter Supabase connection details
5. Important: Enable SSL!

### Step 4: Create Dashboards

#### Executive Dashboard
```sql
-- User Growth
SELECT 
  DATE_TRUNC('day', "createdAt") as date,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', "createdAt")) as total_users
FROM "User"
GROUP BY date
ORDER BY date;

-- Key Metrics
SELECT 
  (SELECT COUNT(*) FROM "User") as total_users,
  (SELECT COUNT(*) FROM "Article") as total_articles,
  (SELECT COUNT(*) FROM "Article" WHERE "isRead" = true) as articles_read,
  (SELECT ROUND(AVG(article_count), 1) FROM (
    SELECT COUNT(*) as article_count FROM "Article" GROUP BY "userId"
  ) t) as avg_articles_per_user;
```

#### User Analytics Dashboard  
```sql
-- User Activity Levels
SELECT 
  CASE 
    WHEN article_count = 0 THEN 'No Articles'
    WHEN article_count BETWEEN 1 AND 10 THEN '1-10 Articles'
    WHEN article_count BETWEEN 11 AND 50 THEN '11-50 Articles'
    ELSE '50+ Articles'
  END as user_segment,
  COUNT(*) as user_count
FROM (
  SELECT u.id, COUNT(a.id) as article_count
  FROM "User" u
  LEFT JOIN "Article" a ON u.id = a."userId"
  GROUP BY u.id
) user_stats
GROUP BY user_segment;
```

#### Content Analytics
```sql
-- Popular Domains
SELECT 
  SUBSTRING(url FROM '(?:.*://)?(?:www\.)?([^/?]*)') as domain,
  COUNT(*) as article_count,
  ROUND(100.0 * COUNT(CASE WHEN "isRead" = true THEN 1 END) / COUNT(*), 1) as read_rate
FROM "Article"
WHERE url IS NOT NULL
GROUP BY domain
HAVING COUNT(*) > 1
ORDER BY article_count DESC
LIMIT 20;
```

## Alternative: Quick Supabase Dashboard

### Create Views in Supabase SQL Editor:
```sql
-- Run these in Supabase SQL Editor
CREATE OR REPLACE VIEW analytics_daily_metrics AS
SELECT 
  DATE_TRUNC('day', a."createdAt") as date,
  COUNT(DISTINCT a."userId") as active_users,
  COUNT(a.id) as articles_saved,
  COUNT(CASE WHEN a."isRead" = true THEN 1 END) as articles_read
FROM "Article" a
GROUP BY DATE_TRUNC('day', a."createdAt");

CREATE OR REPLACE VIEW analytics_user_metrics AS
SELECT 
  u.id,
  u.email,
  u."createdAt" as signup_date,
  COUNT(a.id) as total_articles,
  COUNT(CASE WHEN a."isRead" = true THEN 1 END) as read_articles,
  MAX(a."createdAt") as last_active
FROM "User" u
LEFT JOIN "Article" a ON u.id = a."userId"
GROUP BY u.id, u.email, u."createdAt";
```

### Then Query from Your App:
```typescript
const { data: dailyMetrics } = await supabase
  .from('analytics_daily_metrics')
  .select('*')
  .order('date', { ascending: false })
  .limit(30)

const { data: userMetrics } = await supabase
  .from('analytics_user_metrics')
  .select('*')
  .order('total_articles', { ascending: false })
```

## Which Option?

### Use Metabase if:
- You want professional dashboards (30 mins)
- Multiple people need access
- You want scheduled reports

### Use Supabase Views + Custom Dashboard if:
- You want full control (2-4 hours)
- You're comfortable with React/Chart.js
- You want it integrated in your app

Both connect directly to your Supabase database and show your actual Article Saver data!