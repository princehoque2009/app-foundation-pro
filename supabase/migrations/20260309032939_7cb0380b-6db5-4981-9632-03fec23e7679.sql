
-- Circle invitations table
CREATE TABLE public.circle_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  UNIQUE (circle_id, invited_user_id, status)
);

ALTER TABLE public.circle_invitations ENABLE ROW LEVEL SECURITY;

-- Invited users can see their invitations
CREATE POLICY "Users can see their invitations"
  ON public.circle_invitations FOR SELECT
  TO authenticated
  USING (invited_user_id = auth.uid() OR invited_by = auth.uid());

-- Circle admins/creators can invite
CREATE POLICY "Circle admins can invite"
  ON public.circle_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM community_groups
      WHERE id = circle_invitations.circle_id
      AND created_by = auth.uid()
    )
  );

-- Invited users can update (accept/decline)
CREATE POLICY "Invited users can respond"
  ON public.circle_invitations FOR UPDATE
  TO authenticated
  USING (invited_user_id = auth.uid());

-- Inviters can delete invitations
CREATE POLICY "Inviters can delete"
  ON public.circle_invitations FOR DELETE
  TO authenticated
  USING (invited_by = auth.uid());
