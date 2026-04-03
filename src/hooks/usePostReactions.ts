import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Simplified to heart-only (Instagram style)
export const REACTION_TYPES = [
  { emoji: "❤️", label: "Like", key: "like" },
] as const;

export type ReactionKey = "like";

export const getEmojiForReaction = (_key: string): string => "❤️";

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
      const totalCount = data?.length || 0;

      return { myReaction, counts: { like: totalCount }, totalCount };
    },
  });
};

export const useToggleReaction = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reaction, currentReaction }: { reaction: ReactionKey | null; currentReaction: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (reaction === null || currentReaction) {
        // Remove reaction (unlike)
        const { error } = await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Insert heart reaction
        const { error } = await supabase
          .from("post_reactions")
          .insert({ post_id: postId, user_id: user.id, reaction: "like" });
        if (error) throw error;
      }
    },
    onMutate: async ({ reaction, currentReaction }) => {
      await queryClient.cancelQueries({ queryKey: ["post-reactions", postId] });
      const prev = queryClient.getQueryData(["post-reactions", postId]);

      queryClient.setQueryData(["post-reactions", postId], (old: any) => {
        if (!old) return old;
        const isRemoving = reaction === null || !!currentReaction;
        const newTotal = isRemoving
          ? Math.max(0, old.totalCount - 1)
          : old.totalCount + 1;

        return {
          myReaction: isRemoving ? null : "like",
          counts: { like: newTotal },
          totalCount: newTotal,
        };
      });

      // Optimistically update posts list
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.id !== postId) return post;
          const isRemoving = reaction === null || !!currentReaction;
          const delta = isRemoving ? -1 : 1;
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

// Fetch all likers for breakdown dialog
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
