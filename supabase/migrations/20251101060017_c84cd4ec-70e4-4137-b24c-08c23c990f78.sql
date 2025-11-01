-- Create trigger to automatically create friendship when friend request is accepted
CREATE OR REPLACE FUNCTION public.create_friendship_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if status changed to accepted
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Create friendship from requester to recipient
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (NEW.from_user_id, NEW.to_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Create reciprocal friendship from recipient to requester
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (NEW.to_user_id, NEW.from_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_friendship_on_accept ON public.friend_requests;

-- Create trigger
CREATE TRIGGER trigger_create_friendship_on_accept
  AFTER UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_friendship_on_accept();