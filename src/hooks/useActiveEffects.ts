import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserEffects {
  hasRainbowName: boolean;
  hasNeonFrame: boolean;
  hasPremiumFrame: boolean;
  hasCustomBadge: boolean;
  hasSpotlight: boolean;
  hasPostBoost24: boolean;
  hasPostBoost7d: boolean;
  hasVerifiedBadge: boolean;
}

const emptyEffects: UserEffects = {
  hasRainbowName: false,
  hasNeonFrame: false,
  hasPremiumFrame: false,
  hasCustomBadge: false,
  hasSpotlight: false,
  hasPostBoost24: false,
  hasPostBoost7d: false,
  hasVerifiedBadge: false,
};

/** Fetches active (non-expired) store effects for a given user */
export const useActiveEffects = (userId?: string) => {
  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`effects-${userId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "store_purchases", filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["active-effects", userId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  const { data: effects = emptyEffects, isLoading } = useQuery({
    queryKey: ["active-effects", userId],
    queryFn: async (): Promise<UserEffects> => {
      if (!userId) return emptyEffects;
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("store_purchases" as any)
        .select("*, store_items!inner(icon)")
        .eq("user_id", userId)
        .eq("status", "active");
      if (error) throw error;

      // Filter out expired on client side too
      const active = (data || []).filter((p: any) => !p.expires_at || new Date(p.expires_at) > new Date());
      const icons = new Set(active.map((p: any) => p.store_items?.icon));

      return {
        hasRainbowName: icons.has("rainbow"),
        hasNeonFrame: icons.has("frame_neon"),
        hasPremiumFrame: icons.has("frame_gold"),
        hasCustomBadge: icons.has("custom_badge"),
        hasSpotlight: icons.has("spotlight"),
        hasPostBoost24: icons.has("boost_24"),
        hasPostBoost7d: icons.has("boost_7d"),
        hasVerifiedBadge: icons.has("verified"),
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  return { effects, isLoading };
};

/** Hook for own effects (shortcut) */
export const useMyEffects = () => {
  const { user } = useAuth();
  return useActiveEffects(user?.id);
};
