-- Create import sessions table for enterprise import state management
-- This replaces in-memory storage with database persistence

CREATE TABLE IF NOT EXISTS "ImportSession" (
    id VARCHAR(255) PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL CHECK (source IN ('pocket', 'manual')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Progress tracking (JSON field for flexibility)
    progress JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata (JSON field for extensibility)
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_import_session_user_source (userId, source),
    INDEX idx_import_session_status (status),
    INDEX idx_import_session_created ("createdAt")
);

-- Create trigger to automatically update updatedAt
CREATE OR REPLACE FUNCTION update_import_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_import_session_updated_at
    BEFORE UPDATE ON "ImportSession"
    FOR EACH ROW
    EXECUTE FUNCTION update_import_session_updated_at();

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_import_session_user_status ON "ImportSession" ("userId", status);
CREATE INDEX IF NOT EXISTS idx_import_session_source_status ON "ImportSession" (source, status);

-- Sample progress structure (for documentation):
-- {
--   "currentPage": 1,
--   "totalPages": 10,
--   "articlesProcessed": 150,
--   "totalArticles": 1000,
--   "imported": 140,
--   "skipped": 8,
--   "failed": 2,
--   "currentAction": "Processing batch 3 of 10"
-- }

-- Sample metadata structure (for documentation):
-- {
--   "accessToken": "encrypted_token",
--   "startTime": "2024-01-01T12:00:00Z",
--   "endTime": "2024-01-01T12:30:00Z",
--   "estimatedTimeRemaining": 300,
--   "errorMessage": null,
--   "importSettings": {
--     "batchSize": 30,
--     "maxRetries": 3,
--     "includeArchived": true
--   }
-- }