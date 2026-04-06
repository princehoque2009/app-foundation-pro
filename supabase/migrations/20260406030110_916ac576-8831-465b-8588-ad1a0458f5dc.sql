
-- 1. Notification trigger for post reactions (likes)
CREATE OR REPLACE FUNCTION public.notify_post_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_owner_id UUID;
  v_reactor_name TEXT;
BEGIN
  -- Get post owner
  SELECT user_id INTO v_post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify yourself
  IF v_post_owner_id IS NULL OR v_post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  PERFORM create_notification(
    v_post_owner_id,
    NEW.user_id,
    'like',
    'New Like',
    'liked your post',
    '/post/' || NEW.post_id::text
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_reaction_notify ON public.post_reactions;
CREATE TRIGGER on_post_reaction_notify
AFTER INSERT ON public.post_reactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_reaction();

-- 2. Notification trigger for comments
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_owner_id UUID;
BEGIN
  -- Only for top-level comments (replies handled by notify_comment_reply)
  IF NEW.parent_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  IF v_post_owner_id IS NULL OR v_post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  PERFORM create_notification(
    v_post_owner_id,
    NEW.user_id,
    'comment',
    'New Comment',
    'commented on your post',
    '/post/' || NEW.post_id::text
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_comment_notify ON public.comments;
CREATE TRIGGER on_post_comment_notify
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_comment();

-- 3. Update friend request triggers to use follow terminology
CREATE OR REPLACE FUNCTION public.notify_new_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM create_notification(
    NEW.to_user_id,
    NEW.from_user_id,
    'friend_request',
    'New Follow Request',
    'requested to follow you',
    '/friends'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_friend_request_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    PERFORM create_notification(
      NEW.from_user_id,
      NEW.to_user_id,
      'friend_accept',
      'Follow Request Accepted',
      'started following you',
      '/profile/' || NEW.to_user_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Story reaction notification
CREATE OR REPLACE FUNCTION public.notify_story_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_story_owner_id UUID;
BEGIN
  SELECT user_id INTO v_story_owner_id FROM public.stories WHERE id = NEW.story_id;
  
  IF v_story_owner_id IS NULL OR v_story_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  PERFORM create_notification(
    v_story_owner_id,
    NEW.user_id,
    'story_reaction',
    'Story Reaction',
    'reacted ' || NEW.reaction || ' to your story',
    NULL
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_story_reaction_notify ON public.story_reactions;
CREATE TRIGGER on_story_reaction_notify
AFTER INSERT ON public.story_reactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_story_reaction();

-- 5. Real story view counting
CREATE OR REPLACE FUNCTION public.increment_story_views(p_story_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.stories
  SET views_count = (
    SELECT COUNT(*) FROM public.story_views WHERE story_id = p_story_id
  )
  WHERE id = p_story_id;
END;
$$;

-- Add unique constraint for upsert on story_views
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_views_story_id_viewer_id_key'
  ) THEN
    ALTER TABLE public.story_views ADD CONSTRAINT story_views_story_id_viewer_id_key UNIQUE (story_id, viewer_id);
  END IF;
END$$;

-- 6. Post views tracking
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_views_unique ON public.post_views(post_id, user_id);

CREATE POLICY "Anyone can view post view counts" ON public.post_views FOR SELECT USING (true);
CREATE POLICY "Authenticated users can record views" ON public.post_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add views_count to posts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'views_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN views_count INTEGER DEFAULT 0;
  END IF;
END$$;
