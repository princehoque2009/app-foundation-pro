-- Fix notifications table to reference profiles instead of auth.users
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_from_user_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_from_user_id_fkey
  FOREIGN KEY (from_user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;