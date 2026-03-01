
-- Create missing storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO NOTHING;

-- RLS policies for banners bucket
CREATE POLICY "Banner images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

CREATE POLICY "Users can upload their own banner"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own banner"
ON storage.objects FOR UPDATE
USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own banner"
ON storage.objects FOR DELETE
USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for stories bucket
CREATE POLICY "Story media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

CREATE POLICY "Users can upload their own stories"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own stories"
ON storage.objects FOR DELETE
USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their store purchases (for enable/disable)
CREATE POLICY "Users can update their own purchases"
ON store_purchases FOR UPDATE
USING (auth.uid() = user_id);
