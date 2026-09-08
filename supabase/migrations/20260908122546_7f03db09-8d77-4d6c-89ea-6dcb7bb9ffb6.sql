-- ============ posts: additive columns ============
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS topic_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS circle_id uuid,
  ADD COLUMN IF NOT EXISTS engagement_score numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON public.posts (visibility);
CREATE INDEX IF NOT EXISTS idx_posts_circle_id ON public.posts (circle_id);
CREATE INDEX IF NOT EXISTS idx_posts_topic_tags ON public.posts USING GIN (topic_tags);

-- ============ user_interests ============
CREATE TABLE IF NOT EXISTS public.user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  interest_score numeric NOT NULL DEFAULT 0,
  interaction_count integer NOT NULL DEFAULT 0,
  last_interaction_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_interests TO authenticated;
GRANT ALL ON public.user_interests TO service_role;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interests" ON public.user_interests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_user_score ON public.user_interests (user_id, interest_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_interests_topic ON public.user_interests (topic);

-- ============ user_relationship_scores ============
CREATE TABLE IF NOT EXISTS public.user_relationship_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  related_user_id uuid NOT NULL,
  relationship_score numeric NOT NULL DEFAULT 0,
  message_score numeric NOT NULL DEFAULT 0,
  comment_score numeric NOT NULL DEFAULT 0,
  reaction_score numeric NOT NULL DEFAULT 0,
  circle_score numeric NOT NULL DEFAULT 0,
  last_interaction_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, related_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_relationship_scores TO authenticated;
GRANT ALL ON public.user_relationship_scores TO service_role;
ALTER TABLE public.user_relationship_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own relationship scores" ON public.user_relationship_scores FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_urs_user_score ON public.user_relationship_scores (user_id, relationship_score DESC);

-- ============ post_rankings ============
CREATE TABLE IF NOT EXISTS public.post_rankings (
  post_id uuid PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  quality_score numeric NOT NULL DEFAULT 0,
  engagement_score numeric NOT NULL DEFAULT 0,
  trending_score numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.post_rankings TO authenticated;
GRANT ALL ON public.post_rankings TO service_role;
ALTER TABLE public.post_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rankings readable" ON public.post_rankings FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_post_rankings_trending ON public.post_rankings (trending_score DESC);

-- ============ user_content_feedback ============
CREATE TABLE IF NOT EXISTS public.user_content_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid,
  author_id uuid,
  feedback_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.user_content_feedback TO authenticated;
GRANT ALL ON public.user_content_feedback TO service_role;
ALTER TABLE public.user_content_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback" ON public.user_content_feedback FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ucf_user_post ON public.user_content_feedback (user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_ucf_user_author ON public.user_content_feedback (user_id, author_id);

-- ============ feed_events ============
CREATE TABLE IF NOT EXISTS public.feed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid,
  author_id uuid,
  event_type text NOT NULL,
  value numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feed_events TO authenticated;
GRANT ALL ON public.feed_events TO service_role;
ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events insert" ON public.feed_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own events select" ON public.feed_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_user_created ON public.feed_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_events_post ON public.feed_events (post_id);