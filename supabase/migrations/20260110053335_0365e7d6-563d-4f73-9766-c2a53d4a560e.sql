-- Add country field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country text;

-- Create index for country searches
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);