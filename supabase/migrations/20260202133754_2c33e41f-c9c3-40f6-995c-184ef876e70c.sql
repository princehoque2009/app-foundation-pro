-- Create pinned_posts table for users to pin posts to their profile
CREATE TABLE public.pinned_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.pinned_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Pinned posts are viewable by everyone"
ON public.pinned_posts FOR SELECT
USING (true);

CREATE POLICY "Users can pin their own posts"
ON public.pinned_posts FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

CREATE POLICY "Users can unpin their own posts"
ON public.pinned_posts FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pinned posts"
ON public.pinned_posts FOR UPDATE
USING (auth.uid() = user_id);