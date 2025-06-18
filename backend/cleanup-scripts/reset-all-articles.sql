-- Complete reset of all articles for fresh start
-- WARNING: This will delete ALL articles for ALL users

-- Delete all articles
DELETE FROM "Article";

-- Reset any auto-increment sequences (if using serial IDs)
-- Note: UUIDs don't need sequence reset

-- Optional: Reset user import tracking if you have it
-- DELETE FROM "ImportHistory" WHERE "source" = 'pocket';

-- Verify cleanup
SELECT COUNT(*) as remaining_articles FROM "Article";

-- Show users who had articles (for verification)
SELECT DISTINCT "userId" FROM "Article";