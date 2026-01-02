-- Add date_of_birth column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'email';

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);

-- Add comment for DOB privacy
COMMENT ON COLUMN public.profiles.date_of_birth IS 'Private by default - only visible to user and admin';