import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useStore = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription for store purchases
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`store-realtime-${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "store_purchases", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["store-purchases", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const { data: storeItems, isLoading: storeLoading } = useQuery({
    queryKey: ["store-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_items" as any)
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ["store-purchases", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("store_purchases" as any)
        .select("*, store_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  /** Check if user has an active (non-expired) purchase of this item icon */
  const hasItem = (itemIcon: string): boolean => {
    return purchases?.some((p: any) => {
      const item = p.store_items || p.item;
      if (item?.icon !== itemIcon || p.status !== "active") return false;
      if (p.expires_at && new Date(p.expires_at) < new Date()) return false;
      return true;
    }) || false;
  };

  /** Get the expiry date for an active item, or null */
  const getItemExpiry = (itemIcon: string): string | null => {
    const purchase = purchases?.find((p: any) => {
      const item = p.store_items || p.item;
      return item?.icon === itemIcon && p.status === "active" && (!p.expires_at || new Date(p.expires_at) > new Date());
    });
    return purchase?.expires_at || null;
  };

  return { storeItems, storeLoading, purchases, purchasesLoading, hasItem, getItemExpiry };
};
