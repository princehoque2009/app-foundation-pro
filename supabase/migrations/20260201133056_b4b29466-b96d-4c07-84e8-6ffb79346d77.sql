-- Task 1: Add cover_photo_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Create storage bucket for cover photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('cover-photos', 'cover-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for cover-photos bucket

-- Allow public read access
CREATE POLICY "Cover photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'cover-photos');

-- Allow authenticated users to upload their own cover photos
CREATE POLICY "Users can upload their own cover photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cover-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own cover photos
CREATE POLICY "Users can update their own cover photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cover-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own cover photos
CREATE POLICY "Users can delete their own cover photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cover-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);