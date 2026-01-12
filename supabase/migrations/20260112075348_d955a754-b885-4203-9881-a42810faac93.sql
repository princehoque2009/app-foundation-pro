-- Create post_media table for multiple media per post
CREATE TABLE public.post_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_media
CREATE POLICY "Post media is viewable by everyone" 
ON public.post_media 
FOR SELECT 
USING (true);

CREATE POLICY "Users can add media to their own posts" 
ON public.post_media 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_id 
    AND posts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete media from their own posts" 
ON public.post_media 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_id 
    AND posts.user_id = auth.uid()
  )
);

-- Create advertisements table for ad management
CREATE TABLE public.advertisements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('feed', 'banner', 'story', 'video')),
  media_url TEXT,
  target_url TEXT,
  -- Targeting options
  target_countries TEXT[] DEFAULT '{}',
  target_content_types TEXT[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  -- Scheduling
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  daily_impression_limit INTEGER,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Stats
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on advertisements
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advertisements
CREATE POLICY "Admins can manage all advertisements" 
ON public.advertisements 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active ads" 
ON public.advertisements 
FOR SELECT 
USING (is_active = true);

-- Create ad_analytics table for tracking
CREATE TABLE public.ad_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'conversion')),
  user_id UUID,
  country TEXT,
  device_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ad_analytics
ALTER TABLE public.ad_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_analytics
CREATE POLICY "Admins can view all ad analytics" 
ON public.ad_analytics 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert ad analytics" 
ON public.ad_analytics 
FOR INSERT 
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_post_media_post_id ON public.post_media(post_id);
CREATE INDEX idx_post_media_display_order ON public.post_media(post_id, display_order);
CREATE INDEX idx_advertisements_active ON public.advertisements(is_active) WHERE is_active = true;
CREATE INDEX idx_ad_analytics_ad_id ON public.ad_analytics(ad_id);
CREATE INDEX idx_ad_analytics_created_at ON public.ad_analytics(created_at);