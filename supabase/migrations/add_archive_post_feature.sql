-- Supabase Migration: Add archive post functionality
-- File: supabase/migrations/add_archive_post_feature.sql
-- Description: Adds is_archived column to posts table and creates performance indexes

-- Step 1: Add is_archived column to posts table
-- This column tracks whether a post is archived (hidden from public view)
ALTER TABLE posts
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Create a basic index on is_archived for quick lookups
-- Used for feed queries that exclude archived posts
CREATE INDEX idx_posts_is_archived ON posts(is_archived);

-- Step 3: Create a composite index for user + archived status
-- Used for querying user's archived posts efficiently
CREATE INDEX idx_posts_user_archived ON posts(user_id, is_archived);

-- Step 4: Create specialized index for archived posts queries
-- Used specifically when fetching archived posts for a user (sorted by date)
CREATE INDEX idx_posts_archived_by_user ON posts(user_id, is_archived, created_at DESC)
WHERE is_archived = true;

-- Step 5: Create index optimized for feed queries
-- Only includes non-archived posts to speed up main feed loading
CREATE INDEX idx_posts_feed ON posts(created_at DESC)
WHERE is_archived = false;

-- Verify the column was created
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'posts' AND column_name = 'is_archived';
