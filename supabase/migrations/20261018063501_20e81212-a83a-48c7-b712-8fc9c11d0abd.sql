CREATE TABLE public.anniversary_collectibles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, badge text NOT NULL CHECK (badge IN ('founding','star','pioneer')), earned_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,badge));
GRANT SELECT ON public.anniversary_collectibles TO authenticated;
GRANT ALL ON public.anniversary_collectibles TO service_role;
ALTER TABLE public.anniversary_collectibles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can see earned anniversary awards" ON public.anniversary_collectibles FOR SELECT TO authenticated USING (true);
CREATE TRIGGER anniversary_collectibles_updated BEFORE UPDATE ON public.anniversary_collectibles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.anniversary_capsules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000), opens_at timestamptz NOT NULL DEFAULT '2027-10-17T00:00:00Z', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.anniversary_capsules TO service_role;
ALTER TABLE public.anniversary_capsules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER anniversary_capsules_updated BEFORE UPDATE ON public.anniversary_capsules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE FUNCTION public.claim_anniversary_collectible(p_badge text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
IF now() < '2026-10-17T00:00:00Z'::timestamptz OR now() >= '2026-10-24T00:00:00Z'::timestamptz THEN RAISE EXCEPTION 'The anniversary claiming window has ended'; END IF;
IF p_badge NOT IN ('founding','star','pioneer') OR p_badge IS NULL THEN RAISE EXCEPTION 'Unknown collectible'; END IF;
IF p_badge='founding' AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND created_at<'2026-10-17T00:00:00Z') THEN RAISE EXCEPTION 'Founding Member is for accounts created before the anniversary'; END IF;
IF p_badge='pioneer' AND NOT (EXISTS(SELECT 1 FROM posts WHERE user_id=auth.uid() AND is_reel=true AND created_at>='2025-10-17T00:00:00Z' AND created_at<'2026-10-17T00:00:00Z') OR EXISTS(SELECT 1 FROM stories WHERE user_id=auth.uid() AND created_at>='2025-10-17T00:00:00Z' AND created_at<'2026-10-17T00:00:00Z')) THEN RAISE EXCEPTION 'Pioneer Creator requires a reel or story published in year one'; END IF;
INSERT INTO anniversary_collectibles(user_id,badge) VALUES(auth.uid(),p_badge) ON CONFLICT(user_id,badge) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.claim_anniversary_collectible(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_anniversary_collectible(text) TO authenticated;
CREATE FUNCTION public.anniversary_capsule(p_message text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c public.anniversary_capsules; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
IF p_message IS NOT NULL THEN
IF now() < '2026-10-17T00:00:00Z'::timestamptz OR now() >= '2026-10-24T00:00:00Z'::timestamptz THEN RAISE EXCEPTION 'The capsule sealing window has ended'; END IF;
IF char_length(trim(p_message)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Write between 1 and 2000 characters'; END IF;
INSERT INTO anniversary_capsules(user_id,message) VALUES(auth.uid(),trim(p_message)) ON CONFLICT(user_id) DO NOTHING;
END IF;
SELECT * INTO c FROM anniversary_capsules WHERE user_id=auth.uid();
IF c.id IS NULL THEN RETURN NULL; END IF;
RETURN jsonb_build_object('id',c.id,'created_at',c.created_at,'opens_at',c.opens_at,'message',CASE WHEN now()>=c.opens_at THEN c.message ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.anniversary_capsule(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.anniversary_capsule(text) TO authenticated;
CREATE FUNCTION public.anniversary_wrapped() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
SELECT jsonb_build_object('posts',count(*) FILTER(WHERE NOT is_reel),'reels',count(*) FILTER(WHERE is_reel),'likes',coalesce(sum(likes_count),0),'comments',coalesce(sum(comments_count),0),'views',coalesce(sum(views_count),0)) INTO result FROM posts WHERE user_id=auth.uid() AND created_at>='2025-10-17T00:00:00Z' AND created_at<'2026-10-17T00:00:00Z';
RETURN result || jsonb_build_object('stories',(SELECT count(*) FROM stories WHERE user_id=auth.uid() AND created_at>='2025-10-17T00:00:00Z' AND created_at<'2026-10-17T00:00:00Z'),'joined_at',(SELECT created_at FROM profiles WHERE id=auth.uid()),'top_post',(SELECT jsonb_build_object('id',id,'caption',caption,'media_url',media_url,'likes',likes_count) FROM posts WHERE user_id=auth.uid() AND NOT is_archived AND created_at>='2025-10-17T00:00:00Z' AND created_at<'2026-10-17T00:00:00Z' ORDER BY coalesce(likes_count,0) DESC, created_at DESC LIMIT 1));
END $$;
REVOKE ALL ON FUNCTION public.anniversary_wrapped() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.anniversary_wrapped() TO authenticated;