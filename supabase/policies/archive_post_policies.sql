-- Supabase RLS Policies for Archive Post Functionality
-- File: supabase/policies/archive_post_policies.sql
-- Description: Security policies to prevent archived posts from being visible publicly

-- IMPORTANT: These policies should be combined with your existing post policies
-- Not replace them. Review your existing RLS setup before applying.

-- Policy 1: Archived posts are never visible to other users or public
-- Only the post owner can see their own archived posts
CREATE POLICY "Archived posts hidden from public"
  ON posts FOR SELECT
  USING (
    is_archived = false 
    OR (is_archived = true AND auth.uid() = user_id)
  );

-- Policy 2: Only post owner can archive their own posts
-- Prevent other users from archiving posts they don't own
CREATE POLICY "Only owner can modify archive status"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Ensure feed queries respect archive status
-- This complements client-side filtering with a server-side safeguard
CREATE POLICY "Public feed excludes archived posts"
  ON posts FOR SELECT
  USING (
    (is_archived = false AND auth.uid() IS NOT NULL)
    OR (is_archived = false AND auth.uid() IS NULL)
    OR (is_archived = true AND auth.uid() = user_id)
  );

-- Note: If your application has anonymous user access, you may need
-- to adjust these policies. The basic rule is:
-- - is_archived = false: Everyone can see (public posts)
-- - is_archived = true: Only the owner can see
