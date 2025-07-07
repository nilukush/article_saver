# Article Saver Analytics Setup

## Overview
This directory contains everything you need to set up comprehensive analytics for Article Saver using Metabase (free, open-source business intelligence tool).

## Quick Start (15 minutes)

### Option 1: Railway (Recommended)
1. Deploy Metabase: https://railway.app/new/template/metabase
2. Follow instructions in `METABASE_RAILWAY_DEPLOY.md`
3. Import queries from `metabase_queries.sql`
4. Cost: ~$10/month

### Option 2: Local Development (Free)
```bash
# Run Metabase with Docker
docker run -d -p 3000:3000 \
  -v ~/metabase-data:/metabase-data \
  -e "MB_DB_FILE=/metabase-data/metabase.db" \
  --name metabase metabase/metabase

# Access at http://localhost:3000
```

## Files in This Directory

### 📊 `metabase_queries.sql`
20+ production-ready SQL queries organized by dashboard:
- Executive Overview (6 queries)
- User Behavior Analytics (4 queries)
- Content Analytics (4 queries)
- Feature Usage Analytics (3 queries)
- Retention Analysis (2 queries)
- System Performance (2 queries)

### 🚀 `METABASE_RAILWAY_DEPLOY.md`
Step-by-step deployment guide for Railway including:
- One-click deployment link
- Environment variable configuration
- Database connection setup
- Dashboard creation instructions
- Cost breakdown ($10/month)

### 📈 `ANALYTICS_IMPLEMENTATION_PLAN.md`
Comprehensive implementation strategy:
- Phase 1: Core setup (Day 1)
- Phase 2: Essential dashboards (Day 1-2)
- Phase 3: Advanced analytics (Week 1)
- Phase 4: Automated reporting (Week 2)

## Key Metrics You'll Track

### User Metrics
- Total users and growth rate
- Daily/Weekly/Monthly Active Users
- User segmentation (Power/Active/Light/Churned)
- Authentication method distribution
- Retention cohorts

### Content Metrics
- Articles saved per user
- Popular content sources
- Tag usage patterns
- Reading completion rates
- Content extraction success

### Feature Usage
- Import success rates (Pocket)
- Feature adoption funnel
- Linked accounts usage
- Search and filter patterns

### System Performance
- Article processing success rate
- Database growth metrics
- API performance (when implemented)

## Database Setup

Create a read-only user for Metabase:

```sql
-- Run in your Article Saver PostgreSQL
CREATE USER metabase_reader WITH PASSWORD 'secure_password_here';
GRANT CONNECT ON DATABASE postgres TO metabase_reader;
GRANT USAGE ON SCHEMA public TO metabase_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_reader;
```

## Dashboard Templates

### 1. Executive Overview
- Total Users (Number card)
- Total Articles (Number card)
- User Growth (Line chart)
- Article Growth (Line chart)
- Active Users Today (Number card)
- User Engagement Table

### 2. User Analytics
- User Activity Heatmap
- Daily Active Users trend
- User Segmentation pie chart
- Retention Cohort table

### 3. Content Insights
- Popular Sources bar chart
- Tag Word Cloud
- Content Length Distribution
- Failed Extraction trends

### 4. Feature Usage
- Feature Adoption Funnel
- Import Success Metrics
- Linked Accounts Distribution

## Best Practices

### Performance
1. Add these indexes for better query performance:
```sql
CREATE INDEX idx_article_userid_createdat ON articles(user_id, created_at);
CREATE INDEX idx_article_createdat ON articles(created_at);
CREATE INDEX idx_user_createdat ON users(created_at);
```

2. Enable Metabase query caching
3. Schedule heavy reports during off-hours

### Security
1. Always use read-only database user
2. Enable SSL for database connections
3. Restrict Metabase access with strong passwords
4. Don't expose sensitive user data in public dashboards

### Maintenance
1. Weekly review of metrics
2. Monthly dashboard optimization
3. Quarterly metric relevance assessment

## Scaling Considerations

### Current (2 users)
- Focus on: User engagement, feature adoption
- Simple dashboards with core metrics
- Manual weekly reviews

### Growth (10-100 users)
- Add: Cohort analysis, user segments
- Automated daily reports
- Public community dashboard

### Scale (100+ users)
- Consider: PostHog for product analytics
- Custom event tracking in application
- Real-time monitoring with Grafana

## Alternative Solutions

If Metabase doesn't work for you:

1. **Apache Superset** - More complex but powerful
2. **Redash** - Good PostgreSQL support
3. **Grafana** - Better for real-time monitoring
4. **Google Sheets** - Manual but free

## Support

- Metabase Documentation: https://www.metabase.com/docs/
- Railway Support: https://docs.railway.app/
- Article Saver Issues: https://github.com/nilukush/article_saver/issues

## Next Steps

1. Deploy Metabase (15 mins)
2. Create first dashboard (30 mins)
3. Review initial insights
4. Share findings with users
5. Iterate based on feedback

Remember: Start simple, measure what matters, iterate based on insights!