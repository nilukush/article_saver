# Metabase Deployment on Render - Step by Step

## What This Will Give You
- Professional analytics dashboards for Article Saver
- Direct connection to your Supabase database
- User growth metrics, article analytics, reading patterns
- Free hosting on Render.com
- Setup time: 30 minutes

## Step 1: Get Your Supabase Connection Details (2 mins)

1. Go to your Supabase dashboard: https://app.supabase.com
2. Click on your Article Saver project
3. Go to Settings → Database
4. Copy these values (you'll need them later):
   ```
   Host: db.xxxxxxxxxxxx.supabase.co
   Port: 5432
   Database: postgres
   User: postgres
   Password: [Your database password]
   ```

## Step 2: Deploy to Render (10 mins)

1. Go to https://render.com and sign up (free)
2. Connect your GitHub account
3. Click "New +" → "Blueprint"
4. Connect your `article_saver` repository
5. When asked for the blueprint file path, enter: `analytics/render.yaml`
6. Click "Apply"
7. Wait for deployment (takes about 10 minutes)

## Step 3: Access Metabase (5 mins)

1. Once deployed, click on "article-saver-analytics" service
2. Click the URL at the top (looks like: https://article-saver-analytics-xxxx.onrender.com)
3. Complete Metabase setup wizard:
   - Language: English
   - Your info: Enter your details
   - Database: We'll add this next

## Step 4: Connect to Supabase (5 mins)

1. In Metabase setup, when asked about database:
   - Database type: PostgreSQL
   - Display name: Article Saver Production
   - Host: [Your Supabase host from Step 1]
   - Port: 5432
   - Database name: postgres
   - Username: postgres
   - Password: [Your Supabase password from Step 1]
   
2. **IMPORTANT**: Toggle ON "Use a secure connection (SSL)"
3. Click "Next" to test connection
4. If successful, complete the setup

## Step 5: Create Your First Dashboard (10 mins)

1. Click "New" → "Dashboard" → Name it "Article Saver Overview"
2. Click "Add a question"
3. Use these pre-built queries:

### Total Users & Growth
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN "createdAt" > CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week,
  COUNT(CASE WHEN "createdAt" > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_this_month
FROM "User"
```

### Articles Overview
```sql
SELECT 
  COUNT(*) as total_articles,
  COUNT(DISTINCT "userId") as users_with_articles,
  ROUND(AVG(CASE WHEN "isRead" THEN 1 ELSE 0 END) * 100, 1) as read_rate,
  COUNT(CASE WHEN "createdAt" > CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week
FROM "Article"
```

### User Growth Chart
```sql
SELECT 
  DATE_TRUNC('day', "createdAt") as date,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', "createdAt")) as total_users
FROM "User"
GROUP BY date
ORDER BY date
```

### Active Users
```sql
SELECT 
  DATE_TRUNC('day', a."createdAt") as date,
  COUNT(DISTINCT a."userId") as active_users
FROM "Article" a
WHERE a."createdAt" > CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date
```

## Troubleshooting

### Connection Failed?
1. Make sure SSL is enabled
2. Check your Supabase password is correct
3. Verify your Supabase project is active

### Queries Not Working?
1. Check table names are capitalized: "User", "Article"
2. Check column names are quoted: "createdAt", "userId"

## What's Next?

1. **Today**: Set up the basic dashboards above
2. **Tomorrow**: Add more specific metrics (reading time, popular content)
3. **This Week**: Set up automated email reports
4. **Next Week**: Add custom visualizations

## Free Tier Limits
- Render: Free web service (spins down after 15 mins inactivity)
- Metabase: No limits
- Your dashboards: Unlimited

## Need More Queries?
Check `metabase_queries.sql` in the analytics folder for 20+ pre-built queries!