
-- Create post_reactions table to replace simple likes with multi-reactions
CREATE TABLE public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL DEFAULT 'like',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Reactions viewable by everyone" ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON public.post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reactions" ON public.post_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove their reactions" ON public.post_reactions FOR DELETE USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON public.post_reactions(user_id);

-- Trigger to maintain likes_count on posts table (counts all reactions)
CREATE OR REPLACE FUNCTION public.handle_post_reaction_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_post_reaction_change
AFTER INSERT OR DELETE ON public.post_reactions
FOR EACH ROW EXECUTE FUNCTION public.handle_post_reaction_count();

-- Migrate existing likes to post_reactions
INSERT INTO public.post_reactions (post_id, user_id, reaction, created_at)
SELECT post_id, user_id, 'like', created_at FROM public.likes
ON CONFLICT (post_id, user_id) DO NOTHING;
