CREATE OR REPLACE FUNCTION public.anniversary_capsule(p_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE c public.anniversary_capsules; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
IF p_message IS NOT NULL THEN
IF now() < '2026-10-01T00:00:00Z'::timestamptz OR now() >= '2026-11-01T00:00:00Z'::timestamptz THEN RAISE EXCEPTION 'The capsule sealing window has ended'; END IF;
IF char_length(trim(p_message)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Write between 1 and 2000 characters'; END IF;
INSERT INTO anniversary_capsules(user_id,message) VALUES(auth.uid(),trim(p_message)) ON CONFLICT(user_id) DO NOTHING;
END IF;
SELECT * INTO c FROM anniversary_capsules WHERE user_id=auth.uid();
IF c.id IS NULL THEN RETURN NULL; END IF;
RETURN jsonb_build_object('id',c.id,'created_at',c.created_at,'opens_at',c.opens_at,'message',CASE WHEN now()>=c.opens_at THEN c.message ELSE NULL END);
END $function$;

CREATE OR REPLACE FUNCTION public.claim_anniversary_collectible(p_badge text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
IF now() < '2026-10-01T00:00:00Z'::timestamptz OR now() >= '2026-11-01T00:00:00Z'::timestamptz THEN RAISE EXCEPTION 'The anniversary claiming window has ended'; END IF;
IF p_badge NOT IN ('founding','star','pioneer') OR p_badge IS NULL THEN RAISE EXCEPTION 'Unknown collectible'; END IF;
IF p_badge='founding' AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND created_at<'2026-10-01T00:00:00Z') THEN RAISE EXCEPTION 'Founding Member is for accounts created before the anniversary'; END IF;
IF p_badge='pioneer' AND NOT (EXISTS(SELECT 1 FROM posts WHERE user_id=auth.uid() AND is_reel=true AND created_at>='2025-10-17T00:00:00Z' AND created_at<'2026-10-17T00:00:00Z') OR EXISTS(SELECT 1 FROM stories WHERE user_id=auth.uid() AND created_at>='2025-10-17T00:00:00Z' AND created_at<'2026-10-17T00:00:00Z')) THEN RAISE EXCEPTION 'Pioneer Creator requires a reel or story published in year one'; END IF;
INSERT INTO anniversary_collectibles(user_id,badge) VALUES(auth.uid(),p_badge) ON CONFLICT(user_id,badge) DO NOTHING;
END $function$;