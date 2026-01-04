-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';

-- Note: Enum values cannot be added in a transaction, so this migration 
-- will add the values separately. The existing has_role function will 
-- automatically work with the new roles.