
ALTER TABLE public.wallets
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_daily_claim date DEFAULT NULL;
