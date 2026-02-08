
-- Store items table
CREATE TABLE public.store_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'decoration', -- decoration, badge, boost, gift
  price INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active store items" ON public.store_items
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage store items" ON public.store_items
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Store purchases table
CREATE TABLE public.store_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.store_items(id),
  price_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, revoked
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON public.store_purchases
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create purchases" ON public.store_purchases
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" ON public.store_purchases
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- User devices table for single-device enforcement
CREATE TABLE public.user_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices" ON public.user_devices
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own devices" ON public.user_devices
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all devices" ON public.user_devices
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all devices" ON public.user_devices
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Wallet flags for fraud detection
CREATE TABLE public.wallet_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  flag_type TEXT NOT NULL, -- rapid_spending, failed_transactions, abnormal_gifting
  details JSONB DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all wallet flags" ON public.wallet_flags
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage wallet flags" ON public.wallet_flags
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert wallet flags" ON public.wallet_flags
FOR INSERT WITH CHECK (true);

-- Add indexes
CREATE INDEX idx_store_purchases_user ON public.store_purchases(user_id);
CREATE INDEX idx_store_purchases_item ON public.store_purchases(item_id);
CREATE INDEX idx_user_devices_user ON public.user_devices(user_id);
CREATE INDEX idx_user_devices_active ON public.user_devices(user_id, is_active);
CREATE INDEX idx_wallet_flags_user ON public.wallet_flags(user_id);

-- Insert default store items
INSERT INTO public.store_items (name, description, category, price, icon) VALUES
  ('Verified Badge', 'Get a verified badge on your profile to stand out', 'badge', 500, 'verified'),
  ('Premium Frame', 'Add a premium golden frame to your profile picture', 'decoration', 200, 'frame_gold'),
  ('Neon Frame', 'Add a neon glow frame to your profile picture', 'decoration', 150, 'frame_neon'),
  ('Rainbow Name', 'Make your display name rainbow colored', 'decoration', 300, 'rainbow'),
  ('Post Boost - 24h', 'Boost your post visibility for 24 hours', 'boost', 100, 'boost_24'),
  ('Post Boost - 7d', 'Boost your post visibility for 7 days', 'boost', 500, 'boost_7d'),
  ('Profile Spotlight', 'Feature your profile in suggested accounts for 24h', 'boost', 250, 'spotlight'),
  ('Custom Badge', 'Create a custom badge for your profile', 'badge', 1000, 'custom_badge');
