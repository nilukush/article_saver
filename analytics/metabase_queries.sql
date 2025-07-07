-- Article Saver Analytics Queries for Metabase
-- Ready-to-use queries for product and business metrics

-- ============================================
-- 1. EXECUTIVE DASHBOARD QUERIES
-- ============================================

-- 1.1 Key Metrics Summary (Number Cards)
-- Total Users
SELECT COUNT(*) as total_users FROM "User";

-- Total Articles
SELECT COUNT(*) as total_articles FROM "Article";

-- Articles Read
SELECT COUNT(*) as articles_read FROM "Article" WHERE "isRead" = true;

-- Active Users Today
SELECT COUNT(DISTINCT u.id) as active_users_today
FROM "User" u
JOIN "Article" a ON u.id = a."userId"
WHERE DATE(a."createdAt") = CURRENT_DATE;

-- 1.2 User Growth Chart
SELECT 
  DATE_TRUNC('day', "createdAt") as date,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', "createdAt")) as cumulative_users
FROM "User"
GROUP BY DATE_TRUNC('day', "createdAt")
ORDER BY date;

-- 1.3 Articles Growth Chart
SELECT 
  DATE_TRUNC('day', "createdAt") as date,
  COUNT(*) as new_articles,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', "createdAt")) as cumulative_articles
FROM "Article"
GROUP BY DATE_TRUNC('day', "createdAt")
ORDER BY date;

-- ============================================
-- 2. USER BEHAVIOR ANALYTICS
-- ============================================

-- 2.1 User Engagement Levels
WITH user_stats AS (
  SELECT 
    u.id,
    u.email,
    COUNT(a.id) as total_articles,
    COUNT(CASE WHEN a."isRead" = true THEN 1 END) as read_articles,
    COUNT(CASE WHEN a."isArchived" = true THEN 1 END) as archived_articles,
    COUNT(CASE WHEN a."createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as articles_last_week,
    MAX(a."createdAt") as last_activity
  FROM "User" u
  LEFT JOIN "Article" a ON u.id = a."userId"
  GROUP BY u.id, u.email
)
SELECT 
  email,
  total_articles,
  read_articles,
  ROUND(100.0 * read_articles / NULLIF(total_articles, 0), 1) as read_percentage,
  articles_last_week,
  CASE 
    WHEN articles_last_week > 10 THEN 'Power User'
    WHEN articles_last_week > 3 THEN 'Active User'
    WHEN articles_last_week > 0 THEN 'Light User'
    WHEN last_activity < CURRENT_DATE - INTERVAL '30 days' THEN 'Churned'
    ELSE 'Inactive'
  END as user_segment,
  last_activity
FROM user_stats
ORDER BY total_articles DESC;

-- 2.2 Daily Active Users (DAU)
SELECT 
  DATE_TRUNC('day', a."createdAt") as date,
  COUNT(DISTINCT a."userId") as daily_active_users
FROM "Article" a
WHERE a."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', a."createdAt")
ORDER BY date;

-- 2.3 User Activity Heatmap (Hour of Day)
SELECT 
  EXTRACT(HOUR FROM "createdAt") as hour_of_day,
  EXTRACT(DOW FROM "createdAt") as day_of_week,
  COUNT(*) as articles_saved
FROM "Article"
GROUP BY hour_of_day, day_of_week
ORDER BY day_of_week, hour_of_day;

-- 2.4 Authentication Methods Distribution
SELECT 
  CASE 
    WHEN password IS NOT NULL AND "googleId" IS NULL AND "githubId" IS NULL THEN 'Email/Password'
    WHEN "googleId" IS NOT NULL THEN 'Google OAuth'
    WHEN "githubId" IS NOT NULL THEN 'GitHub OAuth'
    WHEN EXISTS (SELECT 1 FROM "Credential" c WHERE c."userId" = "User".id) THEN 'Passkey'
    ELSE 'Unknown'
  END as auth_method,
  COUNT(*) as user_count
FROM "User"
GROUP BY auth_method;

-- ============================================
-- 3. CONTENT ANALYTICS
-- ============================================

-- 3.1 Popular Content Sources
SELECT 
  CASE 
    WHEN url LIKE '%github.com%' THEN 'GitHub'
    WHEN url LIKE '%medium.com%' THEN 'Medium'
    WHEN url LIKE '%dev.to%' THEN 'Dev.to'
    WHEN url LIKE '%stackoverflow.com%' THEN 'Stack Overflow'
    WHEN url LIKE '%hackernews%' THEN 'Hacker News'
    WHEN url LIKE '%reddit.com%' THEN 'Reddit'
    ELSE COALESCE(
      SUBSTRING(url FROM '(?:.*://)?(?:www\.)?([^/?]*)'),
      'Unknown'
    )
  END as source,
  COUNT(*) as article_count,
  COUNT(DISTINCT "userId") as unique_users,
  ROUND(100.0 * COUNT(CASE WHEN "isRead" = true THEN 1 END) / COUNT(*), 1) as read_rate
FROM "Article"
WHERE url IS NOT NULL
GROUP BY source
ORDER BY article_count DESC
LIMIT 20;

-- 3.2 Tag Analytics
WITH tag_data AS (
  SELECT 
    unnest(tags) as tag,
    "userId",
    "isRead"
  FROM "Article"
  WHERE array_length(tags, 1) > 0
)
SELECT 
  tag,
  COUNT(*) as usage_count,
  COUNT(DISTINCT "userId") as users_using_tag,
  ROUND(100.0 * COUNT(CASE WHEN "isRead" = true THEN 1 END) / COUNT(*), 1) as read_rate
FROM tag_data
GROUP BY tag
ORDER BY usage_count DESC
LIMIT 25;

-- 3.3 Content Length Distribution
SELECT 
  CASE 
    WHEN LENGTH(content) < 1000 THEN '< 1K chars'
    WHEN LENGTH(content) < 5000 THEN '1K-5K chars'
    WHEN LENGTH(content) < 10000 THEN '5K-10K chars'
    WHEN LENGTH(content) < 20000 THEN '10K-20K chars'
    ELSE '> 20K chars'
  END as content_length_range,
  COUNT(*) as article_count,
  ROUND(100.0 * COUNT(CASE WHEN "isRead" = true THEN 1 END) / COUNT(*), 1) as read_rate
FROM "Article"
WHERE content IS NOT NULL
GROUP BY content_length_range
ORDER BY 
  CASE content_length_range
    WHEN '< 1K chars' THEN 1
    WHEN '1K-5K chars' THEN 2
    WHEN '5K-10K chars' THEN 3
    WHEN '10K-20K chars' THEN 4
    ELSE 5
  END;

-- 3.4 Articles Without Content (Failed Extractions)
SELECT 
  DATE_TRUNC('day', "createdAt") as date,
  COUNT(CASE WHEN content IS NULL OR LENGTH(content) < 100 THEN 1 END) as failed_extractions,
  COUNT(*) as total_articles,
  ROUND(100.0 * COUNT(CASE WHEN content IS NULL OR LENGTH(content) < 100 THEN 1 END) / COUNT(*), 2) as failure_rate
FROM "Article"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- ============================================
-- 4. FEATURE USAGE ANALYTICS
-- ============================================

-- 4.1 Import Success Metrics
SELECT 
  DATE_TRUNC('day', "createdAt") as date,
  COUNT(*) as articles_imported,
  COUNT(DISTINCT "userId") as users_importing,
  COUNT(CASE WHEN tags @> ARRAY['imported-from-pocket'] THEN 1 END) as pocket_imports
FROM "Article"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- 4.2 Feature Adoption Funnel
WITH user_features AS (
  SELECT 
    u.id,
    u.email,
    COUNT(a.id) > 0 as has_saved_article,
    COUNT(CASE WHEN a."isRead" = true THEN 1 END) > 0 as has_read_article,
    COUNT(CASE WHEN a."isArchived" = true THEN 1 END) > 0 as has_archived_article,
    COUNT(CASE WHEN array_length(a.tags, 1) > 0 THEN 1 END) > 0 as has_used_tags,
    COUNT(CASE WHEN a.tags @> ARRAY['imported-from-pocket'] THEN 1 END) > 0 as has_imported_pocket
  FROM "User" u
  LEFT JOIN "Article" a ON u.id = a."userId"
  GROUP BY u.id, u.email
)
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN has_saved_article THEN 1 END) as users_saved_article,
  COUNT(CASE WHEN has_read_article THEN 1 END) as users_read_article,
  COUNT(CASE WHEN has_archived_article THEN 1 END) as users_archived_article,
  COUNT(CASE WHEN has_used_tags THEN 1 END) as users_used_tags,
  COUNT(CASE WHEN has_imported_pocket THEN 1 END) as users_imported_pocket
FROM user_features;

-- 4.3 Linked Accounts Usage
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN "googleId" IS NOT NULL THEN 1 END) as google_linked,
  COUNT(CASE WHEN "githubId" IS NOT NULL THEN 1 END) as github_linked,
  COUNT(CASE WHEN "pocketUsername" IS NOT NULL THEN 1 END) as pocket_linked,
  COUNT(CASE WHEN array_length("linkedUserIds", 1) > 0 THEN 1 END) as has_linked_accounts
FROM "User";

-- ============================================
-- 5. RETENTION AND COHORT ANALYSIS
-- ============================================

-- 5.1 Weekly Cohort Retention
WITH cohort_data AS (
  SELECT 
    u.id as user_id,
    DATE_TRUNC('week', u."createdAt") as cohort_week,
    DATE_TRUNC('week', a."createdAt") as activity_week,
    EXTRACT(EPOCH FROM (DATE_TRUNC('week', a."createdAt") - DATE_TRUNC('week', u."createdAt"))) / 604800 as weeks_since_signup
  FROM "User" u
  LEFT JOIN "Article" a ON u.id = a."userId"
  WHERE u."createdAt" >= CURRENT_DATE - INTERVAL '90 days'
),
cohort_summary AS (
  SELECT 
    cohort_week,
    COUNT(DISTINCT user_id) as cohort_size,
    COUNT(DISTINCT CASE WHEN weeks_since_signup = 0 THEN user_id END) as week_0,
    COUNT(DISTINCT CASE WHEN weeks_since_signup = 1 THEN user_id END) as week_1,
    COUNT(DISTINCT CASE WHEN weeks_since_signup = 2 THEN user_id END) as week_2,
    COUNT(DISTINCT CASE WHEN weeks_since_signup = 3 THEN user_id END) as week_3,
    COUNT(DISTINCT CASE WHEN weeks_since_signup = 4 THEN user_id END) as week_4
  FROM cohort_data
  GROUP BY cohort_week
)
SELECT 
  cohort_week,
  cohort_size,
  ROUND(100.0 * week_0 / cohort_size, 1) as week_0_pct,
  ROUND(100.0 * week_1 / cohort_size, 1) as week_1_pct,
  ROUND(100.0 * week_2 / cohort_size, 1) as week_2_pct,
  ROUND(100.0 * week_3 / cohort_size, 1) as week_3_pct,
  ROUND(100.0 * week_4 / cohort_size, 1) as week_4_pct
FROM cohort_summary
ORDER BY cohort_week DESC;

-- 5.2 User Lifetime Value (Articles Saved)
SELECT 
  DATE_TRUNC('month', u."createdAt") as signup_month,
  COUNT(DISTINCT u.id) as users,
  ROUND(AVG(article_count), 1) as avg_articles_per_user,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY article_count) as median_articles,
  MAX(article_count) as max_articles
FROM "User" u
LEFT JOIN (
  SELECT "userId", COUNT(*) as article_count
  FROM "Article"
  GROUP BY "userId"
) a ON u.id = a."userId"
GROUP BY signup_month
ORDER BY signup_month DESC;

-- ============================================
-- 6. SYSTEM PERFORMANCE METRICS
-- ============================================

-- 6.1 Article Processing Performance
SELECT 
  DATE_TRUNC('hour', "createdAt") as hour,
  COUNT(*) as articles_processed,
  COUNT(CASE WHEN content IS NOT NULL AND LENGTH(content) > 100 THEN 1 END) as successful_extractions,
  ROUND(
    100.0 * COUNT(CASE WHEN content IS NOT NULL AND LENGTH(content) > 100 THEN 1 END) / COUNT(*), 
    2
  ) as success_rate,
  ROUND(AVG(LENGTH(content)), 0) as avg_content_length
FROM "Article"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- 6.2 Database Growth Metrics
SELECT 
  'Users' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('"User"')) as total_size
FROM "User"
UNION ALL
SELECT 
  'Articles' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('"Article"')) as total_size
FROM "Article"
UNION ALL
SELECT 
  'Credentials' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('"Credential"')) as total_size
FROM "Credential"
ORDER BY table_name;