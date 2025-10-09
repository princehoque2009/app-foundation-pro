-- Fix function search_path security warning
DROP FUNCTION IF EXISTS delete_expired_stories();

CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.stories WHERE expires_at < now();
END;
$$;