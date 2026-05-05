
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(p_other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_conv uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_other_user IS NULL OR p_other_user = v_uid THEN
    RAISE EXCEPTION 'Invalid other user';
  END IF;

  SELECT cp1.conversation_id INTO v_conv
  FROM conversation_participants cp1
  JOIN conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = v_uid AND cp2.user_id = p_other_user
  LIMIT 1;

  IF v_conv IS NOT NULL THEN
    RETURN v_conv;
  END IF;

  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO v_conv;
  INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conv, v_uid), (v_conv, p_other_user);

  RETURN v_conv;
END;
$$;
