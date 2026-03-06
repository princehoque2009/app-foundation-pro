
-- Circle post likes table
CREATE TABLE public.circle_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.circle_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circle post likes viewable by all" ON public.circle_post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like circle posts" ON public.circle_post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike circle posts" ON public.circle_post_likes FOR DELETE USING (auth.uid() = user_id);

-- Circle post comments table
CREATE TABLE public.circle_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.circle_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circle comments viewable by all" ON public.circle_post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create circle comments" ON public.circle_post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own circle comments" ON public.circle_post_comments FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update likes_count on community_group_posts
CREATE OR REPLACE FUNCTION public.handle_circle_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_group_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_group_posts SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_circle_post_like AFTER INSERT OR DELETE ON public.circle_post_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_circle_post_like_count();

-- Trigger to update comments_count on community_group_posts
CREATE OR REPLACE FUNCTION public.handle_circle_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_group_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_group_posts SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_circle_post_comment AFTER INSERT OR DELETE ON public.circle_post_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_circle_post_comment_count();
