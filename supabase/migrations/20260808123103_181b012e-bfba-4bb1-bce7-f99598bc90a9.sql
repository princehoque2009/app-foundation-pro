ALTER TABLE public.user_notes
  ADD COLUMN IF NOT EXISTS emoji TEXT,
  ADD COLUMN IF NOT EXISTS music TEXT,
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'followers';

CREATE TABLE IF NOT EXISTS public.note_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.user_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (note_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_reactions TO authenticated;
GRANT ALL ON public.note_reactions TO service_role;
ALTER TABLE public.note_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view note reactions"
  ON public.note_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add their own note reactions"
  ON public.note_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own note reactions"
  ON public.note_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own note reactions"
  ON public.note_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.note_mutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  muted_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, muted_user_id)
);

GRANT SELECT, INSERT, DELETE ON public.note_mutes TO authenticated;
GRANT ALL ON public.note_mutes TO service_role;
ALTER TABLE public.note_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own note mutes"
  ON public.note_mutes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own note mutes"
  ON public.note_mutes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own note mutes"
  ON public.note_mutes FOR DELETE TO authenticated USING (auth.uid() = user_id);