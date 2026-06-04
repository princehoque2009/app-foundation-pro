
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS pinned_message_id uuid;

CREATE TABLE IF NOT EXISTS public.chat_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  nickname text,
  theme text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, conversation_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_preferences TO authenticated;
GRANT ALL ON public.chat_preferences TO service_role;

ALTER TABLE public.chat_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat preferences"
  ON public.chat_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_chat_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_chat_preferences_updated_at ON public.chat_preferences;
CREATE TRIGGER trg_chat_preferences_updated_at
  BEFORE UPDATE ON public.chat_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_preferences_updated_at();
