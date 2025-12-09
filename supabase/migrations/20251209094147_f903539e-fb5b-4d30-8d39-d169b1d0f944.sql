-- Add pinned_comment_id column to posts table for pin comment functionality
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS pinned_comment_id uuid REFERENCES public.comments(id) ON DELETE SET NULL;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_posts_pinned_comment ON public.posts(pinned_comment_id) WHERE pinned_comment_id IS NOT NULL;