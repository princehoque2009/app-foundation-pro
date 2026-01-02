-- Create app_settings table for global admin controls
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read, only admins can modify
CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify app settings" ON public.app_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
  ('messaging_enabled', 'true', 'Enable/disable messaging globally'),
  ('group_chats_enabled', 'true', 'Enable/disable group chat creation'),
  ('voice_messages_enabled', 'true', 'Enable/disable voice messages'),
  ('calls_enabled', 'true', 'Enable/disable calls'),
  ('message_requests_enabled', 'true', 'Enable/disable message requests'),
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
  ('min_age_required', '13', 'Minimum age to use the app'),
  ('require_dob', 'true', 'Require date of birth on signup'),
  ('phone_login_enabled', 'true', 'Enable phone number login')
ON CONFLICT (setting_key) DO NOTHING;

-- Add user restrictions columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS messaging_disabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS posting_disabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_groups boolean DEFAULT true;