import { supabase } from "@/integrations/supabase/client";
import type { FeedPage, FeedPost, FeedbackType, FeedEventType } from "@/types/feed";

const POST_SELECT = `
  *,
  profiles:user_id (
    username,
    display_name,
    avatar_url,
    is_verified,
    profile_theme
  ),
  post_media (
    id,
    media_url,
    media_type,
    display_order
  )
`;

/** Chronological fallback used when the ranking service is unavailable. */
export async function fetchChronologicalFeed(
  cursor: string | null,
  limit = 12
): Promise<FeedPage> {
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("is_reel", false)
    .eq("is_archived", false)
    .is("circle_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) throw error;

  const posts = ((data ?? []) as unknown as FeedPost[]).map((p) => ({
    ...p,
    post_media: (p.post_media ?? []).sort((a, b) => a.display_order - b.display_order),
  }));

  const hasMore = posts.length === limit;
  return {
    posts,
    nextCursor: hasMore ? posts[posts.length - 1].created_at : null,
    hasMore,
  };
}

/** Ranked feed from the personalized-feed edge function, with a safe fallback. */
export async function fetchPersonalizedFeed(
  cursor: string | null,
  limit = 12
): Promise<FeedPage> {
  try {
    const { data, error } = await supabase.functions.invoke("personalized-feed", {
      body: { cursor, limit },
    });
    if (error) throw error;
    if (!data || !Array.isArray(data.posts)) throw new Error("Malformed feed response");
    return {
      posts: data.posts as FeedPost[],
      nextCursor: data.nextCursor ?? null,
      hasMore: Boolean(data.hasMore),
    };
  } catch (e) {
    console.warn("personalized-feed unavailable, falling back to chronological", e);
    // Cursors are not interchangeable: only fall back cleanly on the first page.
    return fetchChronologicalFeed(null, limit);
  }
}

export async function recordFeedEvent(params: {
  userId: string;
  postId?: string | null;
  authorId?: string | null;
  eventType: FeedEventType;
  value?: number;
}) {
  const { userId, postId = null, authorId = null, eventType, value = 1 } = params;
  const { error } = await supabase.from("feed_events").insert({
    user_id: userId,
    post_id: postId,
    author_id: authorId,
    event_type: eventType,
    value,
  });
  if (error) console.warn("feed event failed", error.message);
}

export async function recordContentFeedback(params: {
  userId: string;
  postId?: string | null;
  authorId?: string | null;
  feedbackType: FeedbackType;
}) {
  const { userId, postId = null, authorId = null, feedbackType } = params;
  const { error } = await supabase.from("user_content_feedback").insert({
    user_id: userId,
    post_id: postId,
    author_id: authorId,
    feedback_type: feedbackType,
  });
  if (error) throw error;
}
