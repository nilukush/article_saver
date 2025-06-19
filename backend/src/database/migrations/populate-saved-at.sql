-- Populate savedAt field for existing articles
-- For articles that have a publishedDate (imported from Pocket), use that as savedAt
-- For articles without publishedDate (manually added), use createdAt as savedAt

UPDATE articles 
SET saved_at = COALESCE(published_date, created_at)
WHERE saved_at IS NULL;