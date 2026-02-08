import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useStore = () => {
  const { user } = useAuth();

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
        .eq("status", "active");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  const hasItem = (itemIcon: string): boolean => {
    return purchases?.some((p: any) => {
      const item = p.store_items || p.item;
      return item?.icon === itemIcon && p.status === "active";
    }) || false;
  };

  return { storeItems, storeLoading, purchases, purchasesLoading, hasItem };
};
