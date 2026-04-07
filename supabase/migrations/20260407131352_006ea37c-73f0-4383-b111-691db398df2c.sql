-- Add new feature toggle settings
INSERT INTO public.app_settings (setting_key, setting_value, description)
VALUES
  ('stories_enabled', 'true', 'Enable or disable Stories feature globally'),
  ('explore_enabled', 'true', 'Enable or disable Explore/Search feature globally'),
  ('notifications_enabled', 'true', 'Enable or disable Notifications feature globally'),
  ('profile_editing_enabled', 'true', 'Enable or disable Profile editing globally'),
  ('posting_enabled', 'true', 'Enable or disable Posting feature globally')
ON CONFLICT (setting_key) DO NOTHING;