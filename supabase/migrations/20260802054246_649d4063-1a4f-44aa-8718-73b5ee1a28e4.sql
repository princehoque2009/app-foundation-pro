DROP TRIGGER IF EXISTS trigger_create_friendship_on_accept ON public.friend_requests;
CREATE TRIGGER trigger_create_friendship_on_accept
AFTER INSERT OR UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.create_friendship_on_accept();

ALTER TABLE public.profiles ALTER COLUMN account_type SET DEFAULT 'public';