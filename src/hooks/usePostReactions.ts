import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Premium custom reaction set (Facebook-style, but stylized — not plain emoji vibe)
export const REACTION_TYPES = [
  { key: "like",    label: "Like",    emoji: "👍", color: "from-blue-400 to-blue-600",       ring: "ring-blue-400" },
  { key: "love",    label: "Love",    emoji: "❤️", color: "from-rose-400 to-red-600",         ring: "ring-rose-400" },
  { key: "support", label: "Support", emoji: "🤝", color: "from-emerald-400 to-teal-600",    ring: "ring-emerald-400" },
  { key: "fire",    label: "Hype",    emoji: "🔥", color: "from-orange-400 to-rose-600",     ring: "ring-orange-400" },
  { key: "laugh",   label: "Laugh",   emoji: "😂", color: "from-yellow-300 to-amber-500",    ring: "ring-yellow-400" },
  { key: "shock",   label: "Shock",   emoji: "😮", color: "from-sky-300 to-indigo-500",      ring: "ring-sky-400" },
  { key: "respect", label: "Respect", emoji: "🫡", color: "from-violet-400 to-purple-600",   ring: "ring-violet-400" },
] as const;

export type ReactionKey = typeof REACTION_TYPES[number]["key"];

export const getReactionMeta = (key?: string | null) =>
  REACTION_TYPES.find(r => r.key === key) || REACTION_TYPES[0];

export const getEmojiForReaction = (key?: string | null): string =>
  getReactionMeta(key).emoji;

export const usePostReactions = (postId: string) => {
  return useQuery({
    queryKey: ["post-reactions", postId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("post_reactions")
        .select("id, user_id, reaction")
        .eq("post_id", postId);

      if (error) throw error;

      const myReaction = user ? (data?.find(r => r.user_id === user.id)?.reaction as ReactionKey | undefined) ?? null : null;
      const totalCount = data?.length || 0;

      const counts: Record<string, number> = {};
      for (const r of data || []) {
        counts[r.reaction] = (counts[r.reaction] || 0) + 1;
      }

      return { myReaction, counts, totalCount };
    },
  });
};

export const useToggleReaction = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reaction, currentReaction }: { reaction: ReactionKey | null; currentReaction: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Always remove existing reaction first (clean slate)
      if (currentReaction) {
        const { error: delErr } = await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (delErr) throw delErr;
      }

      // If picking a new (different) reaction, insert it
      if (reaction && reaction !== currentReaction) {
        const { error } = await supabase
          .from("post_reactions")
          .insert({ post_id: postId, user_id: user.id, reaction });
        if (error) throw error;
      }
    },
    onMutate: async ({ reaction, currentReaction }) => {
      await queryClient.cancelQueries({ queryKey: ["post-reactions", postId] });
      const prev = queryClient.getQueryData(["post-reactions", postId]);

      queryClient.setQueryData(["post-reactions", postId], (old: any) => {
        if (!old) return old;
        const newCounts = { ...(old.counts || {}) };
        if (currentReaction) {
          newCounts[currentReaction] = Math.max(0, (newCounts[currentReaction] || 0) - 1);
        }
        const isSame = reaction && reaction === currentReaction;
        const newReaction = isSame ? null : reaction;
        if (newReaction) {
          newCounts[newReaction] = (newCounts[newReaction] || 0) + 1;
        }
        const newTotal = Object.values(newCounts).reduce<number>((a, b) => a + (b as number), 0);
        return { myReaction: newReaction, counts: newCounts, totalCount: newTotal };
      });

      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.id !== postId) return post;
          let delta = 0;
          if (currentReaction && (!reaction || reaction === currentReaction)) delta = -1;
          else if (!currentReaction && reaction) delta = 1;
          return { ...post, likes_count: Math.max(0, (post.likes_count || 0) + delta) };
        });
      });

      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["post-reactions", postId], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["post-reactions", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
  });
};

export const useReactionUsers = (postId: string, _filterReaction?: string | null) => {
  return useQuery({
    queryKey: ["reaction-users", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_reactions")
        .select("user_id, reaction")
        .eq("post_id", postId);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .in("id", userIds);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id) || { username: "unknown", display_name: null, avatar_url: null, is_verified: false },
      }));
    },
    enabled: !!postId,
  });
};
