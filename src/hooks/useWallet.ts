import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useWallet = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
        // Auto-create wallet if it doesn't exist
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

  const giftMutation = useMutation({
    mutationFn: async (params: { recipientId: string; amount: number }) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!wallet || (wallet as any).balance < params.amount) {
        throw new Error("Insufficient balance");
      }

      // Deduct from sender
      const { error: deductError } = await supabase
        .from("wallets" as any)
        .update({
          balance: (wallet as any).balance - params.amount,
          total_sent: ((wallet as any).total_sent || 0) + params.amount,
        } as any)
        .eq("user_id", user.id);
      if (deductError) throw deductError;

      // Add to receiver
      const { data: recipientWallet } = await supabase
        .from("wallets" as any)
        .select("*")
        .eq("user_id", params.recipientId)
        .single();

      if (recipientWallet) {
        await supabase
          .from("wallets" as any)
          .update({
            balance: (recipientWallet as any).balance + params.amount,
            total_received: ((recipientWallet as any).total_received || 0) + params.amount,
          } as any)
          .eq("user_id", params.recipientId);
      }

      // Create sender transaction
      await supabase.from("wallet_transactions" as any).insert({
        user_id: user.id,
        type: "gift_sent",
        amount: params.amount,
        status: "completed",
        related_user_id: params.recipientId,
      } as any);

      // Create receiver transaction
      await supabase.from("wallet_transactions" as any).insert({
        user_id: params.recipientId,
        type: "gift_received",
        amount: params.amount,
        status: "completed",
        related_user_id: user.id,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast({ title: "Gift sent!", description: "Prangs have been sent successfully." });
    },
    onError: (err: any) => {
      toast({
        title: "Gift failed",
        description: err.message || "Could not send gift.",
        variant: "destructive",
      });
    },
  });

  return {
    wallet,
    walletLoading,
    transactions,
    transactionsLoading,
    purchasePrangs: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    giftPrangs: giftMutation.mutateAsync,
    isGifting: giftMutation.isPending,
  };
};
