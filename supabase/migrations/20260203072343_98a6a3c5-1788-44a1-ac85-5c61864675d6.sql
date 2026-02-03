-- Phase 1 & 2: Add advisor_suggestions table for tracking suggestions with delivery status

-- Create advisor_suggestions table for tracking suggestions
CREATE TABLE IF NOT EXISTS public.advisor_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID,
  target_type TEXT, -- 'post', 'profile', 'content'
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  context TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'seen', 'opened', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  seen_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.advisor_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advisor_suggestions
-- Advisors can create suggestions
CREATE POLICY "Advisors can create suggestions"
  ON public.advisor_suggestions
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'advisor') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Advisors can view their own suggestions
CREATE POLICY "Advisors can view their suggestions"
  ON public.advisor_suggestions
  FOR SELECT
  USING (
    advisor_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Users can view suggestions sent to them
CREATE POLICY "Users can view received suggestions"
  ON public.advisor_suggestions
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update status of their received suggestions
CREATE POLICY "Users can update suggestion status"
  ON public.advisor_suggestions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Advisors can update their own suggestions
CREATE POLICY "Advisors can update their suggestions"
  ON public.advisor_suggestions
  FOR UPDATE
  USING (
    advisor_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_advisor_suggestions_user_id ON public.advisor_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_advisor_suggestions_advisor_id ON public.advisor_suggestions(advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_suggestions_status ON public.advisor_suggestions(status);

-- Add page_members insert policy for page creators (fixes RLS issue)
DROP POLICY IF EXISTS "Page creators can add themselves" ON public.page_members;
CREATE POLICY "Page creators can add themselves"
  ON public.page_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.pages
      WHERE pages.id = page_members.page_id
      AND pages.created_by = auth.uid()
    )
  );

-- Add community_group_members insert policy for group creators (fixes RLS issue)
DROP POLICY IF EXISTS "Group creators can add themselves" ON public.community_group_members;
CREATE POLICY "Group creators can add themselves"
  ON public.community_group_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.community_groups
      WHERE community_groups.id = community_group_members.group_id
      AND community_groups.created_by = auth.uid()
    )
  );