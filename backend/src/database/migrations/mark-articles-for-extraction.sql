-- Mark all existing articles as needing content extraction
-- This is for articles imported from Pocket that only have excerpts

-- Mark articles that likely came from Pocket (have excerpt but limited content)
UPDATE articles 
SET 
    content_extracted = false,
    extraction_status = 'pending'
WHERE 
    -- Articles where content equals excerpt (Pocket imports)
    (content = excerpt AND excerpt IS NOT NULL)
    -- Or articles with very short content (likely just excerpts)
    OR (LENGTH(content) < 500 AND excerpt IS NOT NULL)
    -- Or articles with no content
    OR content IS NULL 
    OR content = '';