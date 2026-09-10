import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

type Cursor = { p: number; t: string };

const clamp01 = (n: number) => (isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
const encodeCursor = (c: Cursor) => btoa(JSON.stringify(c));
const decodeCursor = (s: string | null | undefined): Cursor | null => {
  if (!s) return null;
  try {
    const c = JSON.parse(atob(s));
    if (typeof c?.p === "number" && typeof c?.t === "string") return c;
  } catch { /* ignore malformed cursor */ }
  return null;
};

// Deterministic pseudo-random in [0,1) from a string seed.
const seeded = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

const WEIGHTS = {
  social: 0.25,
  interest: 0.2,
  engagement: 0.15,
  freshness: 0.15,
  quality: 0.1,
  circle: 0.1,
  exploration: 0.05,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const authClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    const uid = userData?.user?.id;
    if (userErr || !uid) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit) || 12, 1), 30);
    const cursor = decodeCursor(body?.cursor) ?? { p: 0, t: new Date().toISOString() };

    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    // ---------- viewer graph & signals ----------
    const [
      followingRes,
      followersRes,
      circleMembershipRes,
      relScoreRes,
      interestRes,
      feedbackRes,
      blockedRes,
      seenRes,
    ] = await Promise.all([
      db.from("friendships").select("friend_id").eq("user_id", uid).limit(2000),
      db.from("friendships").select("user_id").eq("friend_id", uid).limit(2000),
      db.from("community_group_members").select("group_id").eq("user_id", uid).limit(200),
      db.from("user_relationship_scores").select("related_user_id, relationship_score").eq("user_id", uid).limit(2000),
      db.from("user_interests").select("topic, interest_score, last_interaction_at").eq("user_id", uid)
        .order("interest_score", { ascending: false }).limit(50),
      db.from("user_content_feedback").select("post_id, author_id, feedback_type").eq("user_id", uid).limit(3000),
      db.from("blocked_users").select("blocked_user_id").eq("user_id", uid).limit(2000),
      db.from("feed_events").select("post_id").eq("user_id", uid).eq("event_type", "post_view")
        .order("created_at", { ascending: false }).limit(400),
    ]);

    const following = new Set((followingRes.data ?? []).map((r: any) => r.friend_id));
    const followers = new Set((followersRes.data ?? []).map((r: any) => r.user_id));
    const mutuals = new Set([...following].filter((id) => followers.has(id)));
    const myGroups = (circleMembershipRes.data ?? []).map((r: any) => r.group_id);

    let circlePeers = new Set<string>();
    if (myGroups.length) {
      const { data: peers } = await db
        .from("community_group_members")
        .select("user_id")
        .in("group_id", myGroups)
        .limit(5000);
      circlePeers = new Set((peers ?? []).map((r: any) => r.user_id).filter((id: string) => id !== uid));
    }

    const relScores = new Map<string, number>();
    for (const r of relScoreRes.data ?? []) relScores.set(r.related_user_id, Number(r.relationship_score) || 0);

    const interests = new Map<string, number>();
    for (const r of interestRes.data ?? []) interests.set(String(r.topic).toLowerCase(), Number(r.interest_score) || 0);
    const maxInterest = Math.max(1, ...[...interests.values()]);
    const topTopics = [...interests.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t);

    const hiddenPosts = new Set<string>();
    const suppressedAuthors = new Set<string>();
    const dampenedAuthors = new Set<string>();
    for (const f of feedbackRes.data ?? []) {
      if (f.feedback_type === "hide" && f.post_id) hiddenPosts.add(f.post_id);
      if ((f.feedback_type === "mute" || f.feedback_type === "block") && f.author_id) suppressedAuthors.add(f.author_id);
      if (f.feedback_type === "not_interested") {
        if (f.post_id) hiddenPosts.add(f.post_id);
        if (f.author_id) dampenedAuthors.add(f.author_id);
      }
    }
    for (const b of blockedRes.data ?? []) suppressedAuthors.add(b.blocked_user_id);

    const alreadySeen = new Set((seenRes.data ?? []).map((r: any) => r.post_id).filter(Boolean));

    // ---------- candidate generation ----------
    const closeIds = [...new Set([
      ...[...relScores.entries()].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([id]) => id),
      ...[...mutuals],
      ...[...circlePeers],
    ])].filter((id) => id !== uid && !suppressedAuthors.has(id)).slice(0, 200);

    const followingIds = [...following].filter((id) => !suppressedAuthors.has(id)).slice(0, 500);

    const SELECT = `
      id, user_id, caption, media_url, media_type, likes_count, comments_count, is_reel,
      created_at, topic_tags, visibility, circle_id, engagement_score, views_count,
      profiles:user_id ( username, display_name, avatar_url, is_verified, profile_theme, is_suspended ),
      post_media ( id, media_url, media_type, display_order )
    `;

    const horizon = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString();
    const base = (withHorizon = true) => {
      let q = db.from("posts").select(SELECT)
        .eq("is_reel", false)
        .eq("is_archived", false)
        .eq("visibility", "public")
        .lte("created_at", cursor.t);
      if (withHorizon) q = q.gte("created_at", horizon);
      return q;
    };

    const queries: Promise<any>[] = [];
    const sources: string[] = [];

    if (closeIds.length) { queries.push(base().in("user_id", closeIds).order("created_at", { ascending: false }).limit(120)); sources.push("close"); }
    if (followingIds.length) { queries.push(base().in("user_id", followingIds).order("created_at", { ascending: false }).limit(90)); sources.push("following"); }
    if (topTopics.length) { queries.push(base().overlaps("topic_tags", topTopics).order("created_at", { ascending: false }).limit(60)); sources.push("interest"); }
    // trending + exploration
    queries.push(base().order("likes_count", { ascending: false }).limit(50));
    sources.push("trending");
    queries.push(base().order("created_at", { ascending: false }).limit(60));
    sources.push("exploration");

    const results = await Promise.all(queries);

    type Cand = { post: any; source: string };
    const byId = new Map<string, Cand>();
    results.forEach((res, i) => {
      for (const post of res.data ?? []) {
        if (!byId.has(post.id)) byId.set(post.id, { post, source: sources[i] });
      }
    });

    // ---------- eligibility & safety ----------
    const candidates: Cand[] = [...byId.values()].filter(({ post }) => {
      if (!post?.id) return false;
      if (hiddenPosts.has(post.id)) return false;
      if (suppressedAuthors.has(post.user_id)) return false;
      if (post.profiles?.is_suspended) return false;
      if (post.circle_id && !myGroups.includes(post.circle_id)) return false;
      return true;
    });

    const postIds = candidates.map((c) => c.post.id);
    const rankingMap = new Map<string, any>();
    if (postIds.length) {
      const { data: rankings } = await db.from("post_rankings").select("*").in("post_id", postIds.slice(0, 1000));
      for (const r of rankings ?? []) rankingMap.set(r.post_id, r);
    }

    const maxRel = Math.max(1, ...[...relScores.values()]);
    const now = Date.now();

    const scored = candidates.map(({ post, source }) => {
      const authorId = post.user_id as string;

      // social affinity
      const rel = clamp01((relScores.get(authorId) ?? 0) / maxRel);
      const graph =
        (mutuals.has(authorId) ? 0.4 : 0) +
        (following.has(authorId) ? 0.3 : 0) +
        (circlePeers.has(authorId) ? 0.3 : 0);
      const social = clamp01(rel * 0.6 + clamp01(graph) * 0.4);

      // interest match
      const tags: string[] = (post.topic_tags ?? []).map((t: string) => String(t).toLowerCase());
      const interestHit = tags.reduce((acc, t) => acc + (interests.get(t) ?? 0), 0);
      const interest = clamp01(interestHit / (maxInterest * 2));

      // engagement quality, normalised by reach
      const reactions = Number(post.likes_count) || 0;
      const comments = Number(post.comments_count) || 0;
      const views = Number(post.views_count) || 0;
      const weighted = reactions * 1 + comments * 3;
      const reach = Math.max(20, views, reactions * 4);
      const engagement = clamp01(weighted / reach);

      // freshness — exponential decay
      const ageHours = Math.max(0, (now - new Date(post.created_at).getTime()) / 3600000);
      const freshness = clamp01(Math.exp(-ageHours / 48));

      // cached quality (fallback to engagement)
      const ranking = rankingMap.get(post.id);
      const quality = clamp01(ranking ? Number(ranking.quality_score) : engagement * 0.8);

      // circle relevance
      const circle = clamp01(
        (post.circle_id && myGroups.includes(post.circle_id) ? 0.4 : 0) +
        (circlePeers.has(authorId) ? 0.35 : 0) +
        (comments > 0 && circlePeers.has(authorId) ? 0.25 : 0),
      );

      // controlled exploration
      const isNew = !following.has(authorId) && !circlePeers.has(authorId) && !relScores.has(authorId);
      const exploration = isNew ? clamp01(0.5 + seeded(uid + post.id) * 0.5) : 0.15;

      let score =
        social * WEIGHTS.social +
        interest * WEIGHTS.interest +
        engagement * WEIGHTS.engagement +
        freshness * WEIGHTS.freshness +
        quality * WEIGHTS.quality +
        circle * WEIGHTS.circle +
        exploration * WEIGHTS.exploration;

      if (dampenedAuthors.has(authorId)) score *= 0.5;
      if (alreadySeen.has(post.id)) score *= 0.45;
      if (post.profiles?.is_verified && following.has(authorId)) score *= 1.03;

      return { post, source, score: clamp01(score) * 100, isNew };
    });

    scored.sort((a, b) => b.score - a.score);

    // ---------- diversity re-ranking ----------
    const ordered: typeof scored = [];
    const pool = [...scored];
    const recentAuthors: string[] = [];
    const recentTopics: string[] = [];
    while (pool.length) {
      let pickIdx = 0;
      for (let i = 0; i < Math.min(pool.length, 25); i++) {
        const c = pool[i];
        const author = c.post.user_id;
        const topic = (c.post.topic_tags ?? [])[0] ?? "";
        const authorRun = recentAuthors.slice(-2).filter((a) => a === author).length;
        const topicRun = topic ? recentTopics.slice(-3).filter((t) => t === topic).length : 0;
        if (authorRun < 2 && topicRun < 3) { pickIdx = i; break; }
        pickIdx = i;
      }
      const [picked] = pool.splice(pickIdx, 1);
      ordered.push(picked);
      recentAuthors.push(picked.post.user_id);
      recentTopics.push((picked.post.topic_tags ?? [])[0] ?? "");
    }

    const start = cursor.p * limit;
    const page = ordered.slice(start, start + limit);
    const hasMore = ordered.length > start + limit;

    return json({
      posts: page.map(({ post }) => ({
        ...post,
        post_media: (post.post_media ?? []).sort((a: any, b: any) => a.display_order - b.display_order),
      })),
      nextCursor: hasMore ? encodeCursor({ p: cursor.p + 1, t: cursor.t }) : null,
      hasMore,
    });
  } catch (e) {
    console.error("personalized-feed failed:", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
