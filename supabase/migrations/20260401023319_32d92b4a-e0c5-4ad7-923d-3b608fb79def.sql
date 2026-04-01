-- Story Highlights system
CREATE TABLE public.story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  cover_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.story_highlight_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid NOT NULL REFERENCES public.story_highlights(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(highlight_id, story_id)
);

-- Story interactive stickers (polls, questions, countdowns)
CREATE TABLE public.story_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  sticker_type text NOT NULL,
  position_x real NOT NULL DEFAULT 50,
  position_y real NOT NULL DEFAULT 50,
  scale real NOT NULL DEFAULT 1,
  rotation real NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Poll votes
CREATE TABLE public.story_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id uuid NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sticker_id, user_id)
);

-- Question responses
CREATE TABLE public.story_question_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id uuid NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Story archive & editor metadata
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS text_overlay text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS text_style jsonb;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS filter_name text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS sticker_data jsonb;

-- RLS policies
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_highlight_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_question_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view highlights" ON public.story_highlights FOR SELECT USING (true);
CREATE POLICY "Owners manage highlights" ON public.story_highlights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view highlight items" ON public.story_highlight_items FOR SELECT USING (true);
CREATE POLICY "Highlight owners manage items" ON public.story_highlight_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.story_highlights WHERE id = story_highlight_items.highlight_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.story_highlights WHERE id = story_highlight_items.highlight_id AND user_id = auth.uid()));

CREATE POLICY "Anyone can view stickers" ON public.story_stickers FOR SELECT USING (true);
CREATE POLICY "Story owners manage stickers" ON public.story_stickers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.stories WHERE id = story_stickers.story_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stories WHERE id = story_stickers.story_id AND user_id = auth.uid()));

CREATE POLICY "View poll votes" ON public.story_poll_votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.story_stickers ss
    JOIN public.stories s ON s.id = ss.story_id
    WHERE ss.id = story_poll_votes.sticker_id AND s.user_id = auth.uid()
  ) OR user_id = auth.uid());
CREATE POLICY "Users can vote" ON public.story_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change vote" ON public.story_poll_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove vote" ON public.story_poll_votes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "View question responses" ON public.story_question_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.story_stickers ss
    JOIN public.stories s ON s.id = ss.story_id
    WHERE ss.id = story_question_responses.sticker_id AND s.user_id = auth.uid()
  ) OR user_id = auth.uid());
CREATE POLICY "Users can respond" ON public.story_question_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their stories" ON public.stories FOR UPDATE USING (auth.uid() = user_id);