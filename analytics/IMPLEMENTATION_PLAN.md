# Article Saver Analytics Implementation Plan

## Executive Summary
Set up a comprehensive analytics dashboard for Article Saver using **Metabase** (free, open-source) to track product and business metrics for your 2 users with room to scale.

## Why Metabase?
- ✅ You already have experience with it
- ✅ Excellent PostgreSQL support
- ✅ Beautiful, shareable dashboards
- ✅ Low cost (~$5-10/month on Railway)
- ✅ Quick setup (30 minutes)
- ✅ Enterprise-grade features

## Phase 1: Core Setup (Day 1)

### 1. Deploy Metabase on Railway
```bash
# Quick deployment
1. Go to https://railway.app/new
2. Deploy from template: PostgreSQL + Metabase
3. Set environment variables:
   MB_DB_TYPE=postgres
   MB_DB_DBNAME=${{PGDATABASE}}
   MB_DB_PORT=${{PGPORT}}
   MB_DB_USER=${{PGUSER}}
   MB_DB_PASS=${{PGPASSWORD}}
   MB_DB_HOST=${{RAILWAY_PRIVATE_DOMAIN}}
```

### 2. Create Read-Only Database User
```sql
-- Run in your Article Saver PostgreSQL
CREATE USER metabase_reader WITH PASSWORD 'secure_password_here';
GRANT CONNECT ON DATABASE articlesaver TO metabase_reader;
GRANT USAGE ON SCHEMA public TO metabase_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_reader;
```

### 3. Connect Metabase to Article Saver Database
1. Add database connection in Metabase admin
2. Use the read-only user credentials
3. Enable SSL connection
4. Test connection

## Phase 2: Essential Dashboards (Day 1-2)

### Dashboard 1: Executive Overview
**Key Metrics:**
- Total Users (currently 2)
- Total Articles Saved
- Articles per User
- User Growth Rate
- Active Users (DAU/WAU/MAU)

**SQL Query:**
```sql
-- User Growth Over Time
SELECT 
  DATE_TRUNC('day', "createdAt") as date,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', "createdAt")) as total_users
FROM "User"
GROUP BY DATE_TRUNC('day', "createdAt")
ORDER BY date DESC;
```

### Dashboard 2: User Behavior Analytics
**Key Metrics:**
- Articles saved per user over time
- Reading patterns (time of day, day of week)
- Most active users
- Authentication methods used
- Linked accounts distribution

**SQL Query:**
```sql
-- User Activity Heatmap
SELECT 
  u.email,
  COUNT(a.id) as articles_saved,
  COUNT(CASE WHEN a."isRead" = true THEN 1 END) as articles_read,
  COUNT(CASE WHEN a."isArchived" = true THEN 1 END) as articles_archived,
  MAX(a."createdAt") as last_activity
FROM "User" u
LEFT JOIN "Article" a ON u.id = a."userId"
GROUP BY u.id, u.email
ORDER BY articles_saved DESC;
```

### Dashboard 3: Content Analytics
**Key Metrics:**
- Popular domains/sources
- Tag usage and distribution
- Article length distribution
- Content extraction success rate
- Import success rates (Pocket)

**SQL Query:**
```sql
-- Popular Content Sources
SELECT 
  SUBSTRING(url FROM '(?:.*://)?(?:www\.)?([^/?]*)') as domain,
  COUNT(*) as article_count,
  COUNT(DISTINCT "userId") as unique_users,
  AVG(LENGTH(content)) as avg_content_length
FROM "Article"
WHERE url IS NOT NULL
GROUP BY domain
ORDER BY article_count DESC
LIMIT 20;
```

### Dashboard 4: Feature Usage
**Key Metrics:**
- Import feature usage (especially Pocket)
- Search/filter usage
- Tag creation and usage
- Archive feature usage
- Desktop app vs API usage

## Phase 3: Advanced Analytics (Week 1)

### 1. Retention Analysis
```sql
-- User Retention Cohort
WITH user_cohorts AS (
  SELECT 
    u.id,
    DATE_TRUNC('week', u."createdAt") as cohort_week,
    DATE_TRUNC('week', a."createdAt") as activity_week
  FROM "User" u
  LEFT JOIN "Article" a ON u.id = a."userId"
)
SELECT 
  cohort_week,
  COUNT(DISTINCT CASE WHEN activity_week = cohort_week THEN id END) as week_0,
  COUNT(DISTINCT CASE WHEN activity_week = cohort_week + INTERVAL '1 week' THEN id END) as week_1,
  COUNT(DISTINCT CASE WHEN activity_week = cohort_week + INTERVAL '2 weeks' THEN id END) as week_2
FROM user_cohorts
GROUP BY cohort_week
ORDER BY cohort_week;
```

### 2. User Segmentation
- Power users (>50 articles)
- Regular users (10-50 articles)
- Light users (<10 articles)
- Churned users (no activity >30 days)

### 3. Performance Monitoring
- API response times
- Content extraction success rates
- Database query performance
- Error rates by endpoint

## Phase 4: Automated Reporting (Week 2)

### 1. Weekly Email Reports
- Set up Metabase pulses for key stakeholders
- Include: User growth, engagement metrics, top content

### 2. Alerts
- New user signups
- High-value user activity
- System performance issues
- Import failures

### 3. Public Dashboard
- Create a public dashboard for community
- Show: Total users, articles saved, popular sources
- Embed in Article Saver website

## Implementation Checklist

### Immediate (Day 1):
- [ ] Deploy Metabase on Railway
- [ ] Create read-only database user
- [ ] Connect Metabase to PostgreSQL
- [ ] Create Executive Overview dashboard
- [ ] Set up first 5 queries

### Short-term (Week 1):
- [ ] Complete all 4 core dashboards
- [ ] Implement user segmentation
- [ ] Set up automated weekly reports
- [ ] Create retention analysis

### Medium-term (Month 1):
- [ ] Add custom event tracking in app
- [ ] Implement funnel analysis
- [ ] Create performance monitoring dashboard
- [ ] Set up alerting for key metrics

## Cost Analysis
- **Metabase on Railway**: ~$5-10/month
- **Additional PostgreSQL for Metabase**: ~$5/month
- **Total**: ~$10-15/month

## Alternative: Quick Start with SQLite
If you want to test immediately:
```bash
# Local Metabase with SQLite
docker run -d -p 3000:3000 --name metabase metabase/metabase
```

Then manually sync data from PostgreSQL to SQLite for analysis.

## Success Metrics
- ✅ Track user growth from 2 to 100 users
- ✅ Identify most engaged features
- ✅ Understand user retention patterns
- ✅ Monitor system performance
- ✅ Make data-driven product decisions

## Next Steps
1. Deploy Metabase today
2. Create first dashboard
3. Share with early users for feedback
4. Iterate based on insights

Remember: Start simple, iterate based on what metrics actually drive decisions for Article Saver's growth.