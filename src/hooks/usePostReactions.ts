import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const REACTION_TYPES = [
  { emoji: "👍", label: "Like", key: "like" },
  { emoji: "❤️", label: "Love", key: "love" },
  { emoji: "😂", label: "Haha", key: "haha" },
  { emoji: "😮", label: "Wow", key: "wow" },
  { emoji: "😢", label: "Sad", key: "sad" },
  { emoji: "😡", label: "Angry", key: "angry" },
] as const;

export type ReactionKey = typeof REACTION_TYPES[number]["key"];

export const getEmojiForReaction = (key: string): string => {
  return REACTION_TYPES.find(r => r.key === key)?.emoji || "👍";
};

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

      const myReaction = user ? data?.find(r => r.user_id === user.id)?.reaction || null : null;

      // Count by reaction type
      const counts: Record<string, number> = {};
      data?.forEach(r => {
        counts[r.reaction] = (counts[r.reaction] || 0) + 1;
      });

      const totalCount = data?.length || 0;

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

      if (reaction === null || reaction === currentReaction) {
        // Remove reaction
        const { error } = await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else if (currentReaction) {
        // Update existing reaction
        const { error } = await supabase
          .from("post_reactions")
          .update({ reaction })
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Insert new reaction
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
        const newCounts = { ...old.counts };

        // Remove old
        if (currentReaction && newCounts[currentReaction]) {
          newCounts[currentReaction] = Math.max(0, newCounts[currentReaction] - 1);
          if (newCounts[currentReaction] === 0) delete newCounts[currentReaction];
        }

        const isRemoving = reaction === null || reaction === currentReaction;
        if (!isRemoving && reaction) {
          newCounts[reaction] = (newCounts[reaction] || 0) + 1;
        }

        const totalCount = Object.values(newCounts).reduce((s: number, c: any) => s + (c as number), 0);

        return {
          myReaction: isRemoving ? null : reaction,
          counts: newCounts,
          totalCount,
        };
      });

      // Also optimistically update posts list
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.id !== postId) return post;
          const isRemoving = reaction === null || reaction === currentReaction;
          const delta = isRemoving ? (currentReaction ? -1 : 0) : (currentReaction ? 0 : 1);
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

// Fetch all reactors for breakdown dialog
export const useReactionUsers = (postId: string, filterReaction?: string | null) => {
  return useQuery({
    queryKey: ["reaction-users", postId, filterReaction],
    queryFn: async () => {
      let query = supabase
        .from("post_reactions")
        .select("user_id, reaction")
        .eq("post_id", postId);

      if (filterReaction) {
        query = query.eq("reaction", filterReaction);
      }

      const { data, error } = await query;
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
