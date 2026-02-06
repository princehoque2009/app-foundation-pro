import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrangsIcon } from "@/components/wallet/PrangsIcon";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const AdminWalletRequests = () => {
  const queryClient = useQueryClient();

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ["admin-wallet-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions" as any)
        .select("*")
        .eq("type", "purchase")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: allRequests } = useQuery({
    queryKey: ["admin-wallet-all-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions" as any)
        .select("*")
        .eq("type", "purchase")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch profiles for user display
  const userIds = [...new Set([
    ...(pendingRequests || []).map((r: any) => r.user_id),
    ...(allRequests || []).map((r: any) => r.user_id),
  ])];

  const { data: profiles } = useQuery({
    queryKey: ["admin-wallet-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);
      const map: Record<string, any> = {};
      data?.forEach((p) => (map[p.id] = p));
      return map;
    },
    enabled: userIds.length > 0,
  });

  const approveMutation = useMutation({
    mutationFn: async (tx: any) => {
      // Update transaction status
      await supabase
        .from("wallet_transactions" as any)
        .update({ status: "approved" } as any)
        .eq("id", tx.id);

      // Credit wallet
      const { data: wallet } = await supabase
        .from("wallets" as any)
        .select("*")
        .eq("user_id", tx.user_id)
        .single();

      if (wallet) {
        await supabase
          .from("wallets" as any)
          .update({
            balance: (wallet as any).balance + tx.amount,
            total_received: ((wallet as any).total_received || 0) + tx.amount,
          } as any)
          .eq("user_id", tx.user_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-all-requests"] });
      toast({ title: "Approved!", description: "Prangs credited to user's wallet." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (txId: string) => {
      await supabase
        .from("wallet_transactions" as any)
        .update({ status: "rejected" } as any)
        .eq("id", txId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-all-requests"] });
      toast({ title: "Rejected", description: "Purchase request rejected." });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PrangsIcon size="md" />
          Wallet & Purchase Requests
        </h2>
        <p className="text-sm text-muted-foreground">Approve or reject Prangs purchase requests</p>
      </div>

      {/* Pending Requests */}
      <div>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          Pending Requests ({pendingRequests?.length || 0})
        </h3>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : pendingRequests && pendingRequests.length > 0 ? (
          <div className="space-y-3">
            {pendingRequests.map((tx: any) => {
              const profile = profiles?.[tx.user_id];
              return (
                <Card key={tx.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {profile?.display_name || profile?.username || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PrangsIcon size="xs" />
                        <span className="font-bold">{tx.amount} Prangs</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Method: {tx.payment_method} · Sender: {tx.sender_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        TxID: {tx.reference}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(tx)}
                        disabled={approveMutation.isPending}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(tx.id)}
                        disabled={rejectMutation.isPending}
                        className="gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No pending requests
          </Card>
        )}
      </div>

      {/* All Requests */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Recent Purchase History</h3>
        <Card className="overflow-hidden">
          {allRequests && allRequests.length > 0 ? (
            allRequests.map((tx: any) => {
              const profile = profiles?.[tx.user_id];
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {profile?.display_name || profile?.username || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "MMM d · h:mm a")} · {tx.payment_method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PrangsIcon size="xs" />
                    <span className="font-bold text-sm">{tx.amount}</span>
                    <Badge
                      variant={
                        tx.status === "approved" ? "default" :
                        tx.status === "rejected" ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm">No purchase history</div>
          )}
        </Card>
      </div>
    </div>
  );
};
