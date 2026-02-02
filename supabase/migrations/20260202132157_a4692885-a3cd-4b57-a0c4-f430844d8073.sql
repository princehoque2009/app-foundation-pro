-- Create pages table
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  banner_url TEXT,
  logo_url TEXT,
  privacy TEXT NOT NULL DEFAULT 'public',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followers_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create page_members table
CREATE TABLE public.page_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'follower',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(page_id, user_id)
);

-- Create groups table (different from chat_groups for messaging)
CREATE TABLE public.community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  banner_url TEXT,
  logo_url TEXT,
  privacy TEXT NOT NULL DEFAULT 'public',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  members_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.community_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create page_posts table for posts made by pages
CREATE TABLE public.page_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  caption TEXT,
  media_url TEXT,
  media_type TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_posts table for posts in groups
CREATE TABLE public.community_group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption TEXT,
  media_url TEXT,
  media_type TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_posts ENABLE ROW LEVEL SECURITY;

-- Pages RLS policies
CREATE POLICY "Public pages viewable by everyone" ON public.pages
  FOR SELECT USING (privacy = 'public');

CREATE POLICY "Private pages viewable by members" ON public.pages
  FOR SELECT USING (
    privacy = 'private' AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.page_members WHERE page_id = pages.id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create pages" ON public.pages
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Page owners can update" ON public.pages
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Page owners can delete" ON public.pages
  FOR DELETE USING (auth.uid() = created_by);

-- Page members RLS policies
CREATE POLICY "Page members viewable" ON public.page_members
  FOR SELECT USING (true);

CREATE POLICY "Users can follow pages" ON public.page_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow pages" ON public.page_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Page admins can manage members" ON public.page_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.pages WHERE id = page_members.page_id AND created_by = auth.uid())
  );

-- Community groups RLS policies
CREATE POLICY "Public groups viewable by everyone" ON public.community_groups
  FOR SELECT USING (privacy = 'public');

CREATE POLICY "Private groups viewable by members" ON public.community_groups
  FOR SELECT USING (
    privacy = 'private' AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.community_group_members WHERE group_id = community_groups.id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create groups" ON public.community_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group owners can update" ON public.community_groups
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Group owners can delete" ON public.community_groups
  FOR DELETE USING (auth.uid() = created_by);

-- Community group members RLS policies
CREATE POLICY "Group members viewable" ON public.community_group_members
  FOR SELECT USING (true);

CREATE POLICY "Users can join groups" ON public.community_group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON public.community_group_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Group admins can manage members" ON public.community_group_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.community_groups WHERE id = community_group_members.group_id AND created_by = auth.uid())
  );

-- Page posts RLS policies
CREATE POLICY "Page posts viewable" ON public.page_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pages WHERE id = page_posts.page_id AND privacy = 'public')
    OR EXISTS (SELECT 1 FROM public.page_members WHERE page_id = page_posts.page_id AND user_id = auth.uid())
  );

CREATE POLICY "Page admins can create posts" ON public.page_posts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.pages WHERE id = page_posts.page_id AND created_by = auth.uid())
  );

CREATE POLICY "Page admins can update posts" ON public.page_posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.pages WHERE id = page_posts.page_id AND created_by = auth.uid())
  );

CREATE POLICY "Page admins can delete posts" ON public.page_posts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.pages WHERE id = page_posts.page_id AND created_by = auth.uid())
  );

-- Community group posts RLS policies
CREATE POLICY "Group posts viewable by members" ON public.community_group_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.community_groups WHERE id = community_group_posts.group_id AND privacy = 'public')
    OR EXISTS (SELECT 1 FROM public.community_group_members WHERE group_id = community_group_posts.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Group members can create posts" ON public.community_group_posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.community_group_members WHERE group_id = community_group_posts.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Post owners can update" ON public.community_group_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Post owners and admins can delete" ON public.community_group_posts
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.community_groups WHERE id = community_group_posts.group_id AND created_by = auth.uid())
  );

-- Create storage bucket for pages/groups media
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-media', 'lab-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lab-media bucket
CREATE POLICY "Lab media viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'lab-media');

CREATE POLICY "Authenticated users can upload lab media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lab-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own lab media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'lab-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own lab media" ON storage.objects
  FOR DELETE USING (bucket_id = 'lab-media' AND auth.uid()::text = (storage.foldername(name))[1]);