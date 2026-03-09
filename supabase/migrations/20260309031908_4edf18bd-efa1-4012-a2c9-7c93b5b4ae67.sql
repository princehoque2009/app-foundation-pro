
-- Drop all existing SELECT policies on stories
DROP POLICY IF EXISTS "Everyone can view public stories" ON public.stories;
DROP POLICY IF EXISTS "Policy to implement Time To Live (TTL)" ON public.stories;
DROP POLICY IF EXISTS "Users can view friends' stories" ON public.stories;
DROP POLICY IF EXISTS "stories_select_visible" ON public.stories;

-- Drop duplicate INSERT policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.stories;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.stories;
DROP POLICY IF EXISTS "stories_insert_owner" ON public.stories;

-- Drop duplicate DELETE/UPDATE policies
DROP POLICY IF EXISTS "stories_delete_self" ON public.stories;
DROP POLICY IF EXISTS "stories_update_self" ON public.stories;

-- Create single clean PERMISSIVE SELECT policy
CREATE POLICY "stories_select"
  ON public.stories FOR SELECT
  TO authenticated
  USING (
    expires_at > now() AND (
      user_id = auth.uid()
      OR visibility = 'public'
      OR EXISTS (
        SELECT 1 FROM friendships f
        WHERE (f.user_id = stories.user_id AND f.friend_id = auth.uid())
           OR (f.friend_id = stories.user_id AND f.user_id = auth.uid())
      )
    )
  );

-- Create single clean INSERT policy
CREATE POLICY "stories_insert"
  ON public.stories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
