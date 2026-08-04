CREATE TABLE public.user_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notes TO authenticated;
GRANT ALL ON public.user_notes TO service_role;

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active notes"
ON public.user_notes FOR SELECT TO authenticated
USING (expires_at > now());

CREATE POLICY "Users can create their own note"
ON public.user_notes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own note"
ON public.user_notes FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own note"
ON public.user_notes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_user_notes_expires ON public.user_notes (expires_at);