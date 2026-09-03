GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notes TO authenticated;
GRANT ALL ON public.user_notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_reactions TO authenticated;
GRANT ALL ON public.note_reactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_mutes TO authenticated;
GRANT ALL ON public.note_mutes TO service_role;