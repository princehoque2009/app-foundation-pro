-- Add more creative store items
INSERT INTO public.store_items (name, description, icon, category, price, metadata, is_active)
VALUES
  ('Custom Emoji Badge', 'Choose your own emoji to display next to your name', 'custom_emoji', 'badge', 80, '{"duration_days": 30}'::jsonb, true),
  ('Chat Theme', 'Unlock exclusive chat background themes for your conversations', 'chat_theme', 'decoration', 60, '{"duration_days": 30}'::jsonb, true),
  ('Profile Announcement', 'Pin a special announcement banner on your profile', 'announcement', 'decoration', 40, '{"duration_days": 7}'::jsonb, true),
  ('Profile Views Tracker', 'See who viewed your profile in the last 30 days', 'profile_views', 'boost', 100, '{"duration_days": 30}'::jsonb, true),
  ('Trending Badge', 'Get a trending indicator next to your posts for 7 days', 'trending', 'boost', 120, '{"duration_days": 7}'::jsonb, true)
ON CONFLICT DO NOTHING;