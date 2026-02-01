-- Create avatars storage bucket (matching cover-photos pattern)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '-'))[2]
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '-'))[2]
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '-'))[2]
);

-- Allow public read access to all avatars
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');