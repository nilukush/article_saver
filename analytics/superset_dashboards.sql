-- Apache Superset Dashboard Queries for Article Saver
-- Import these queries to create your analytics dashboards

-- ============================================
-- DASHBOARD 1: EXECUTIVE OVERVIEW
-- ============================================

-- Query 1.1: Key Metrics (Use as Big Number charts)
-- Total Users
SELECT COUNT(*) as value, 'Total Users' as metric FROM "User";

-- Total Articles
SELECT COUNT(*) as value, 'Total Articles' as metric FROM "Article";

-- Articles Read
SELECT COUNT(*) as value, 'Articles Read' as metric 
FROM "Article" WHERE "isRead" = true;

-- Active Users Today
SELECT COUNT(DISTINCT "userId") as value, 'Active Today' as metric
FROM "Article" 
WHERE DATE("createdAt") = CURRENT_DATE;

-- Query 1.2: Growth Over Time (Line Chart)
SELECT 
  DATE("createdAt") as date,
  'Users' as metric,
  COUNT(*) as new_count,
  SUM(COUNT(*)) OVER (ORDER BY DATE("createdAt")) as cumulative
FROM "User"
GROUP BY DATE("createdAt")
UNION ALL
SELECT 
  DATE("createdAt") as date,
  'Articles' as metric,
  COUNT(*) as new_count,
  SUM(COUNT(*)) OVER (ORDER BY DATE("createdAt")) as cumulative
FROM "Article"
GROUP BY DATE("createdAt")
ORDER BY date, metric;

-- Query 1.3: User Activity Distribution (Pie Chart)
WITH user_activity AS (
  SELECT 
    u.id,
    COUNT(a.id) as article_count,
    CASE 
      WHEN COUNT(a.id) = 0 THEN 'Inactive'
      WHEN COUNT(a.id) BETWEEN 1 AND 10 THEN 'Light User'
      WHEN COUNT(a.id) BETWEEN 11 AND 50 THEN 'Regular User'
      ELSE 'Power User'
    END as user_type
  FROM "User" u
  LEFT JOIN "Article" a ON u.id = a."userId"
  GROUP BY u.id
)
SELECT user_type, COUNT(*) as user_count
FROM user_activity
GROUP BY user_type;

-- ============================================
-- DASHBOARD 2: USER ANALYTICS
-- ============================================

-- Query 2.1: User Engagement Table
SELECT 
  u.email,
  u."createdAt" as signup_date,
  COUNT(a.id) as total_articles,
  COUNT(CASE WHEN a."isRead" = true THEN 1 END) as articles_read,
  COUNT(CASE WHEN a."isArchived" = true THEN 1 END) as articles_archived,
  ROUND(100.0 * COUNT(CASE WHEN a."isRead" = true THEN 1 END) / NULLIF(COUNT(a.id), 0), 1) as read_rate,
  MAX(a."createdAt") as last_activity,
  CASE 
    WHEN MAX(a."createdAt") > CURRENT_DATE - INTERVAL '7 days' THEN 'Active'
    WHEN MAX(a."createdAt") > CURRENT_DATE - INTERVAL '30 days' THEN 'Dormant'
    ELSE 'Churned'
  END as status
FROM "User" u
LEFT JOIN "Article" a ON u.id = a."userId"
GROUP BY u.id, u.email, u."createdAt"
ORDER BY total_articles DESC;

-- Query 2.2: Daily Active Users Trend (Line Chart)
SELECT 
  DATE("createdAt") as date,
  COUNT(DISTINCT "userId") as daily_active_users
FROM "Article"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE("createdAt")
ORDER BY date;

-- Query 2.3: User Activity Heatmap (Heatmap)
SELECT 
  EXTRACT(HOUR FROM "createdAt") as hour,
  CASE EXTRACT(DOW FROM "createdAt")
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day_of_week,
  COUNT(*) as activity_count
FROM "Article"
GROUP BY hour, EXTRACT(DOW FROM "createdAt")
ORDER BY EXTRACT(DOW FROM "createdAt"), hour;

-- ============================================
-- DASHBOARD 3: CONTENT ANALYTICS
-- ============================================

-- Query 3.1: Popular Domains (Bar Chart)
SELECT 
  SUBSTRING(url FROM '(?:.*://)?(?:www\.)?([^/?]*)') as domain,
  COUNT(*) as article_count,
  COUNT(DISTINCT "userId") as unique_users,
  ROUND(100.0 * COUNT(CASE WHEN "isRead" = true THEN 1 END) / COUNT(*), 1) as read_rate
FROM "Article"
WHERE url IS NOT NULL
GROUP BY domain
HAVING COUNT(*) > 1
ORDER BY article_count DESC
LIMIT 20;

-- Query 3.2: Tag Usage (Word Cloud or Bar Chart)
WITH tags_expanded AS (
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
  COUNT(DISTINCT "userId") as users
FROM tags_expanded
GROUP BY tag
ORDER BY usage_count DESC
LIMIT 30;

-- Query 3.3: Content Metrics Over Time (Line Chart)
SELECT 
  DATE("createdAt") as date,
  COUNT(*) as articles_saved,
  COUNT(CASE WHEN "isRead" = true THEN 1 END) as articles_read,
  COUNT(CASE WHEN content IS NOT NULL AND LENGTH(content) > 100 THEN 1 END) as articles_with_content,
  ROUND(100.0 * COUNT(CASE WHEN content IS NULL OR LENGTH(content) < 100 THEN 1 END) / COUNT(*), 1) as extraction_failure_rate
FROM "Article"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE("createdAt")
ORDER BY date;

-- ============================================
-- DASHBOARD 4: FEATURE USAGE
-- ============================================

-- Query 4.1: Feature Adoption Funnel (Funnel Chart)
WITH feature_usage AS (
  SELECT 
    (SELECT COUNT(*) FROM "User") as total_users,
    (SELECT COUNT(DISTINCT "userId") FROM "Article") as users_saved_article,
    (SELECT COUNT(DISTINCT "userId") FROM "Article" WHERE "isRead" = true) as users_read_article,
    (SELECT COUNT(DISTINCT "userId") FROM "Article" WHERE "isArchived" = true) as users_archived_article,
    (SELECT COUNT(DISTINCT "userId") FROM "Article" WHERE array_length(tags, 1) > 0) as users_used_tags
)
SELECT 
  'Signed Up' as step, total_users as users FROM feature_usage
UNION ALL
SELECT 'Saved Article' as step, users_saved_article as users FROM feature_usage
UNION ALL
SELECT 'Read Article' as step, users_read_article as users FROM feature_usage
UNION ALL
SELECT 'Used Tags' as step, users_used_tags as users FROM feature_usage
UNION ALL
SELECT 'Archived Article' as step, users_archived_article as users FROM feature_usage
ORDER BY users DESC;

-- Query 4.2: Import Sources (Pie Chart)
SELECT 
  CASE 
    WHEN 'imported-from-pocket' = ANY(tags) THEN 'Pocket Import'
    WHEN url LIKE '%github.com%' THEN 'GitHub'
    WHEN url LIKE '%medium.com%' THEN 'Medium'
    ELSE 'Manual Save'
  END as source,
  COUNT(*) as article_count
FROM "Article"
GROUP BY source
ORDER BY article_count DESC;

-- ============================================
-- DASHBOARD 5: SYSTEM HEALTH
-- ============================================

-- Query 5.1: Article Processing Success Rate (Gauge)
SELECT 
  COUNT(CASE WHEN content IS NOT NULL AND LENGTH(content) > 100 THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM "Article"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days';

-- Query 5.2: Database Growth (Table)
SELECT 
  'Users' as entity,
  COUNT(*) as total_records,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days
FROM "User"
UNION ALL
SELECT 
  'Articles' as entity,
  COUNT(*) as total_records,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days
FROM "Article";

-- ============================================
-- FILTERS FOR ALL DASHBOARDS
-- ============================================

-- Date Range Filter
SELECT DISTINCT DATE("createdAt") as date 
FROM "Article" 
ORDER BY date DESC;

-- User Filter
SELECT DISTINCT u.id as user_id, u.email as user_email
FROM "User" u
JOIN "Article" a ON u.id = a."userId"
ORDER BY u.email;