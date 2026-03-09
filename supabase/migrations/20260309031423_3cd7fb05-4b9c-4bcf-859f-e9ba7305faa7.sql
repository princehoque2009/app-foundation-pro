
-- Add unique constraint on stories.id for foreign key references
ALTER TABLE public.stories ADD CONSTRAINT stories_id_unique UNIQUE (id);

-- Story views tracking table
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story owners can view story views"
  ON public.story_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE stories.id = story_views.story_id
      AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can see own views"
  ON public.story_views FOR SELECT
  USING (viewer_id = auth.uid());

CREATE POLICY "Users can record views"
  ON public.story_views FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

-- Story reactions table
CREATE TABLE public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL DEFAULT '❤️',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story owners can see reactions"
  ON public.story_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE stories.id = story_reactions.story_id
      AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can see own reactions"
  ON public.story_reactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add reactions"
  ON public.story_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove reactions"
  ON public.story_reactions FOR DELETE
  USING (user_id = auth.uid());
