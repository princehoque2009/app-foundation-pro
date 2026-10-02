import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchChronologicalFeed,
  fetchPersonalizedFeed,
  recordContentFeedback,
  recordFeedEvent,
} from "@/services/feedService";
import type { FeedPage, FeedbackType, FeedEventType } from "@/types/feed";

export const FEED_QUERY_KEY = ["personalized-feed"];

export type FeedMode = "foryou" | "latest" | "friends";

export const usePersonalizedFeed = (mode: FeedMode = "foryou", limit = 12) => {
  const { user } = useAuth();

  return useInfiniteQuery<FeedPage>({
    queryKey: [...FEED_QUERY_KEY, mode, user?.id ?? "anon", limit],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | null;
      if (mode === "foryou") return fetchPersonalizedFeed(cursor, limit);
      if (mode === "latest") return fetchChronologicalFeed(cursor, limit);
      const { data } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user!.id)
        .limit(2000);
      const ids = (data ?? []).map((r: any) => r.friend_id);
      return fetchChronologicalFeed(cursor, limit, ids);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 60_000,
    enabled: !!user?.id,
  });
};

export const useFeedEvent = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      postId?: string | null;
      authorId?: string | null;
      eventType: FeedEventType;
      value?: number;
    }) => {
      if (!user?.id) return;
      await recordFeedEvent({ userId: user.id, ...params });
    },
  });
};

const FEEDBACK_COPY: Record<FeedbackType, { title: string; description: string }> = {
  not_interested: {
    title: "Got it",
    description: "You'll see less like this in your feed.",
  },
  hide: { title: "Post hidden", description: "You won't see this post again." },
  mute: { title: "Account muted", description: "Their posts won't show in your feed." },
  block: { title: "Account blocked", description: "You won't see their content anymore." },
};

export const useContentFeedback = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      postId?: string | null;
      authorId?: string | null;
      feedbackType: FeedbackType;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      await recordContentFeedback({ userId: user.id, ...params });
      return params.feedbackType;
    },
    onSuccess: (feedbackType) => {
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
      toast(FEEDBACK_COPY[feedbackType]);
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't save that",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
