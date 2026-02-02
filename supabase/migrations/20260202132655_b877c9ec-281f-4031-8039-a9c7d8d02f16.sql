-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;

-- Create a fixed policy without recursion
CREATE POLICY "Users can add participants to conversations" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);