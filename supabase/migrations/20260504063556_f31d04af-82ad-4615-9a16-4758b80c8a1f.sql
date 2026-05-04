
-- 1) User presence/status
CREATE TABLE IF NOT EXISTS public.user_status (
  user_id UUID PRIMARY KEY,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view user status" ON public.user_status;
CREATE POLICY "Anyone authenticated can view user status"
ON public.user_status FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can upsert their own status" ON public.user_status;
CREATE POLICY "Users can upsert their own status"
ON public.user_status FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own status" ON public.user_status;
CREATE POLICY "Users can update their own status"
ON public.user_status FOR UPDATE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;

-- 2) One-like-per-user on stories: dedupe + unique
DELETE FROM public.story_reactions a
USING public.story_reactions b
WHERE a.ctid < b.ctid
  AND a.story_id = b.story_id
  AND a.user_id = b.user_id;

ALTER TABLE public.story_reactions
  DROP CONSTRAINT IF EXISTS story_reactions_unique_user_story;
ALTER TABLE public.story_reactions
  ADD CONSTRAINT story_reactions_unique_user_story UNIQUE (story_id, user_id);

-- 3) Realtime for messaging tables (idempotent-ish)
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversations';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; END IF;
END $$;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
