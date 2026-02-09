import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useWallet = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription for wallet balance updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`wallet-realtime-${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["wallet", user.id] });
        }
      )
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["wallet-transactions", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("wallets" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) {
        if (error.code === "PGRST116") {
          const { data: newWallet, error: createError } = await supabase
            .from("wallets" as any)
            .insert({ user_id: user.id, balance: 0 } as any)
            .select()
            .single();
          if (createError) throw createError;
          return newWallet as any;
        }
        throw error;
      }
      return data as any;
    },
    enabled: !!user?.id,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("wallet_transactions" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (params: {
      amount: number;
      prangs: number;
      paymentMethod: string;
      senderNumber: string;
      transactionId: string;
      screenshotUrl?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("wallet_transactions" as any).insert({
        user_id: user.id,
        type: "purchase",
        amount: params.prangs,
        status: "pending",
        reference: params.transactionId,
        sender_number: params.senderNumber,
        payment_method: params.paymentMethod,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast({ title: "Purchase request submitted!", description: "Your request is pending admin approval." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit purchase request.", variant: "destructive" });
    },
  });

  // Server-side gift via edge function
  const giftMutation = useMutation({
    mutationFn: async (params: { recipientId: string; amount: number }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("wallet-transaction", {
        body: { action: "gift", recipientId: params.recipientId, amount: params.amount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast({ title: "Gift sent!", description: "Prangs have been sent successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Gift failed", description: err.message || "Could not send gift.", variant: "destructive" });
    },
  });

  // Server-side daily claim
  const dailyClaimMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("wallet-transaction", {
        body: { action: "daily_claim" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast({ title: "Claimed!", description: `+${data?.amount || 10} Prangs added to your wallet.` });
    },
    onError: (err: any) => {
      toast({ title: "Claim failed", description: err.message, variant: "destructive" });
    },
  });

  // Server-side store purchase
  const storePurchaseMutation = useMutation({
    mutationFn: async (params: { itemId: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("wallet-transaction", {
        body: { action: "store_purchase", itemId: params.itemId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["store-purchases"] });
      toast({ title: "Purchase successful!", description: `You bought ${data?.item || "an item"}.` });
    },
    onError: (err: any) => {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    },
  });

  const hasActiveSubscription = wallet
    ? !!(wallet as any).subscription_expires_at && new Date((wallet as any).subscription_expires_at) > new Date()
    : false;

  const canClaimToday = wallet
    ? hasActiveSubscription && (wallet as any).last_daily_claim !== new Date().toISOString().split("T")[0]
    : false;

  const subscriptionExpiresAt = wallet ? (wallet as any).subscription_expires_at : null;

  return {
    wallet,
    walletLoading,
    transactions,
    transactionsLoading,
    purchasePrangs: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    giftPrangs: giftMutation.mutateAsync,
    isGifting: giftMutation.isPending,
    claimDaily: dailyClaimMutation.mutateAsync,
    isClaiming: dailyClaimMutation.isPending,
    purchaseStoreItem: storePurchaseMutation.mutateAsync,
    isPurchasingItem: storePurchaseMutation.isPending,
    hasActiveSubscription,
    canClaimToday,
    subscriptionExpiresAt,
  };
};
