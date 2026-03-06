
-- Allow authenticated users to upload files to post-media bucket
CREATE POLICY "Authenticated users can upload to post-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media');

-- Allow authenticated users to upload files to avatars bucket
CREATE POLICY "Authenticated users can upload to avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to upload files to banners bucket
CREATE POLICY "Authenticated users can upload to banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'banners');

-- Allow public read access to post-media
CREATE POLICY "Public read access to post-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-media');

-- Allow public read access to avatars
CREATE POLICY "Public read access to avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow public read access to banners
CREATE POLICY "Public read access to banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'banners');
