-- Add parent_id to comments for threaded replies
ALTER TABLE public.comments
ADD COLUMN parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Add mentioned_user_id for @mentions
ALTER TABLE public.comments  
ADD COLUMN mentioned_user_id UUID REFERENCES public.profiles(id);

-- Create index for faster reply queries
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX idx_comments_mentioned_user ON public.comments(mentioned_user_id);

-- Add reactions to comments
CREATE TABLE public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment_reactions
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for comment_reactions
CREATE POLICY "Comment reactions are viewable by everyone"
ON public.comment_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can add reactions to comments"
ON public.comment_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
ON public.comment_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Add message_reactions table for messenger
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Message reactions viewable by conversation participants"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add message reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own message reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Add reply_to_id for message replies
ALTER TABLE public.messages
ADD COLUMN reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add is_pinned for pinned messages
ALTER TABLE public.messages
ADD COLUMN is_pinned BOOLEAN DEFAULT false;

-- Create notification for comment replies
CREATE OR REPLACE FUNCTION public.notify_comment_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_comment RECORD;
BEGIN
  -- Only trigger for replies (comments with parent_id)
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_comment FROM public.comments WHERE id = NEW.parent_id;
    
    -- Don't notify if replying to own comment
    IF parent_comment.user_id != NEW.user_id THEN
      PERFORM create_notification(
        parent_comment.user_id,
        NEW.user_id,
        'comment_reply',
        'Reply to your comment',
        'Someone replied to your comment',
        '/post/' || NEW.post_id::text
      );
    END IF;
  END IF;
  
  -- Handle mentions
  IF NEW.mentioned_user_id IS NOT NULL AND NEW.mentioned_user_id != NEW.user_id THEN
    PERFORM create_notification(
      NEW.mentioned_user_id,
      NEW.user_id,
      'mention',
      'You were mentioned',
      'Someone mentioned you in a comment',
      '/post/' || NEW.post_id::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_reply
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment_reply();