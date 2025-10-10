-- Fix profiles table RLS policies to respect privacy settings
-- Drop the overly permissive policy that allows unauthenticated access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- Policy 1: Users can always view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Authenticated users can view public profiles
CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (account_type = 'public');

-- Policy 3: Users can view private profiles of their friends
CREATE POLICY "Users can view friends' private profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  account_type = 'private' 
  AND EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (
      (friendships.user_id = auth.uid() AND friendships.friend_id = profiles.id)
      OR
      (friendships.friend_id = auth.uid() AND friendships.user_id = profiles.id)
    )
  )
);

-- Add helpful comment
COMMENT ON TABLE public.profiles IS 'User profiles with privacy-respecting RLS policies. Public profiles are visible to all authenticated users, private profiles only to friends.';