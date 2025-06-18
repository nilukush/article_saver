-- Reset articles for specific user only
-- Replace 'YOUR_USER_ID' with your actual user ID

-- First, find your user ID
SELECT id, email FROM "User" WHERE email = 'your-email@example.com';

-- Delete articles for specific user
-- DELETE FROM "Article" WHERE "userId" = 'YOUR_USER_ID';

-- Or delete only Pocket imports (if you have source tracking)
-- DELETE FROM "Article" WHERE "userId" = 'YOUR_USER_ID' AND "source" = 'pocket';

-- Verify cleanup for your user
-- SELECT COUNT(*) as remaining_articles FROM "Article" WHERE "userId" = 'YOUR_USER_ID';