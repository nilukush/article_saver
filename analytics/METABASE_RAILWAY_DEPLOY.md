# Deploy Metabase on Railway in 5 Minutes

## Quick Start

### 1. Deploy Metabase + PostgreSQL
Click this link to deploy instantly:
👉 https://railway.app/new/template/metabase

Or manually:
1. Go to https://railway.app/new
2. Search for "Metabase"
3. Select the Metabase + PostgreSQL template
4. Click "Deploy"

### 2. Configure Environment Variables
Once deployed, go to your Metabase service settings and add:

```env
# Metabase Configuration
MB_SITE_NAME=Article Saver Analytics
MB_ANON_TRACKING_ENABLED=false
MB_ENABLE_PUBLIC_SHARING=true
MB_ENABLE_EMBEDDING=true

# Email Configuration (Optional - for reports)
MB_EMAIL_SMTP_HOST=smtp.gmail.com
MB_EMAIL_SMTP_PORT=587
MB_EMAIL_SMTP_USERNAME=your-email@gmail.com
MB_EMAIL_SMTP_PASSWORD=your-app-password
MB_EMAIL_FROM_ADDRESS=your-email@gmail.com
```

### 3. Access Metabase
1. Click on your Metabase service
2. Go to "Settings" → "Networking"
3. Click "Generate Domain" to get your URL
4. Visit the URL (e.g., `metabase-production-xyz.up.railway.app`)

### 4. Initial Setup
1. Create admin account
2. Skip adding your data (we'll do it properly)
3. Complete setup

### 5. Connect to Article Saver Database

First, create a read-only user in your Article Saver PostgreSQL:

```sql
-- Run this in your Article Saver database
CREATE USER metabase_reader WITH PASSWORD 'generate_secure_password_here';
GRANT CONNECT ON DATABASE postgres TO metabase_reader;
GRANT USAGE ON SCHEMA public TO metabase_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_reader;
```

Then in Metabase:
1. Go to Admin → Databases → Add Database
2. Fill in:
   - Database type: PostgreSQL
   - Display name: Article Saver Production
   - Host: Your Article Saver DB host
   - Port: Your DB port (usually 5432)
   - Database name: postgres (or your DB name)
   - Username: metabase_reader
   - Password: [the password you created]
   - Use SSL: Yes

### 6. Import Pre-built Dashboards

Create these 4 dashboards using the queries from `metabase_queries.sql`:

#### Dashboard 1: Executive Overview
1. Click "New" → "Dashboard"
2. Name it "Executive Overview"
3. Add these cards:
   - Total Users (Number)
   - Total Articles (Number)
   - Articles Read (Number)
   - Active Users Today (Number)
   - User Growth (Line Chart)
   - Articles Growth (Line Chart)

#### Dashboard 2: User Analytics
1. Create "User Analytics" dashboard
2. Add:
   - User Engagement Table
   - Daily Active Users (Line Chart)
   - Activity Heatmap
   - Authentication Methods (Pie Chart)

#### Dashboard 3: Content Insights
1. Create "Content Insights" dashboard
2. Add:
   - Popular Sources (Bar Chart)
   - Tag Cloud
   - Content Length Distribution
   - Failed Extractions Trend

#### Dashboard 4: Feature Usage
1. Create "Feature Usage" dashboard
2. Add:
   - Feature Adoption Funnel
   - Import Success Metrics
   - Linked Accounts Distribution

### 7. Set Up Automated Reports

1. Go to any dashboard
2. Click "Subscriptions" (mail icon)
3. Set up weekly email:
   - Every Monday at 9 AM
   - Send to your email
   - Include all cards

### 8. Create Public Dashboard

For community transparency:
1. Create "Public Stats" dashboard
2. Add non-sensitive metrics:
   - Total Users
   - Total Articles Saved
   - Popular Sources
3. Click sharing icon → "Public link"
4. Embed in Article Saver website

## Cost Breakdown

- **Metabase**: $5/month (0.5 vCPU, 512MB RAM)
- **PostgreSQL for Metabase**: $5/month
- **Total**: $10/month

## Optimization Tips

1. **Performance**: Add indexes for common queries
2. **Caching**: Enable query result caching in Metabase
3. **Scheduling**: Run heavy queries during off-hours
4. **Alerts**: Set up alerts for:
   - New user signups
   - High activity from a user
   - System errors

## Troubleshooting

### Can't connect to database?
- Check firewall rules
- Verify SSL settings
- Test with `psql` first

### Queries slow?
- Add indexes on User.createdAt, Article.createdAt, Article.userId
- Use Metabase's caching feature
- Consider materialized views for complex queries

### Need more metrics?
- Check `metabase_queries.sql` for 20+ ready queries
- Join the Article Saver community for shared dashboards

## Next Steps

1. **Week 1**: Get familiar with basic metrics
2. **Week 2**: Customize dashboards for your needs
3. **Month 1**: Add custom metrics based on user feedback
4. **Month 2**: Consider adding PostHog for product analytics

## Alternative Free Options

If $10/month is too much:
1. **Local Docker**: Run Metabase locally
2. **Render.com**: Free tier available
3. **Google Sheets**: Export data weekly for analysis

Remember: Start simple, focus on metrics that drive decisions!