CREATE TABLE public.vault_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.vault_shares TO authenticated;
GRANT ALL ON public.vault_shares TO service_role;
ALTER TABLE public.vault_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in members can browse the scrapbook" ON public.vault_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can share their own photocard" ON public.vault_shares FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members can remove their own share" ON public.vault_shares FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX vault_shares_created_idx ON public.vault_shares (created_at DESC);