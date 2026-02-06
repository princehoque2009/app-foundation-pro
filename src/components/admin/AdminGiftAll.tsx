import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrangsIcon } from "@/components/wallet/PrangsIcon";
import { toast } from "@/hooks/use-toast";
import { Gift, Users, User, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const AdminGiftAll = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [giftAllAmount, setGiftAllAmount] = useState("");
  const [individualAmount, setIndividualAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Search users
  const { data: searchResults } = useQuery({
    queryKey: ["admin-search-users-gift", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(5);
      return data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Gift all users
  const giftAllMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get all user wallets
      const { data: wallets, error: walletsError } = await supabase
        .from("wallets" as any)
        .select("user_id, balance, total_received")
        .neq("user_id", user.id);

      if (walletsError) throw walletsError;

      // Credit each wallet and create transactions
      for (const w of (wallets as any[]) || []) {
        await supabase
          .from("wallets" as any)
          .update({
            balance: (w.balance || 0) + amount,
            total_received: (w.total_received || 0) + amount,
          } as any)
          .eq("user_id", w.user_id);

        await supabase.from("wallet_transactions" as any).insert({
          user_id: w.user_id,
          type: "admin_credit",
          amount,
          status: "completed",
          related_user_id: user.id,
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast({ title: "Gifted!", description: `Prangs gifted to all users successfully.` });
      setGiftAllAmount("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to gift Prangs.", variant: "destructive" });
    },
  });

  // Gift individual user
  const giftIndividualMutation = useMutation({
    mutationFn: async ({ recipientId, amount }: { recipientId: string; amount: number }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: recipientWallet } = await supabase
        .from("wallets" as any)
        .select("*")
        .eq("user_id", recipientId)
        .single();

      if (recipientWallet) {
        await supabase
          .from("wallets" as any)
          .update({
            balance: (recipientWallet as any).balance + amount,
            total_received: ((recipientWallet as any).total_received || 0) + amount,
          } as any)
          .eq("user_id", recipientId);
      }

      await supabase.from("wallet_transactions" as any).insert({
        user_id: recipientId,
        type: "admin_credit",
        amount,
        status: "completed",
        related_user_id: user.id,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast({ title: "Gifted!", description: "Prangs sent to user successfully." });
      setIndividualAmount("");
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to gift Prangs.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Gift All Users */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Gift All Users</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Distribute Prangs to every active user at once.
        </p>
        <div className="flex gap-3">
          <Input
            type="number"
            placeholder="Amount per user"
            value={giftAllAmount}
            onChange={(e) => setGiftAllAmount(e.target.value)}
            min={1}
          />
          <Button
            onClick={() => {
              const val = parseInt(giftAllAmount);
              if (!val || val <= 0) return;
              if (!confirm(`Gift ${val} Prangs to ALL users?`)) return;
              giftAllMutation.mutate(val);
            }}
            disabled={!giftAllAmount || parseInt(giftAllAmount) <= 0 || giftAllMutation.isPending}
            className="gap-2 whitespace-nowrap"
          >
            <Gift className="h-4 w-4" />
            {giftAllMutation.isPending ? "Sending..." : "Gift All"}
          </Button>
        </div>
      </Card>

      {/* Gift Individual User */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Gift Individual User</h3>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedUser(null); }}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {searchResults && searchResults.length > 0 && !selectedUser && (
            <div className="border border-border rounded-lg overflow-hidden">
              {searchResults.map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setSearchQuery(""); }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{u.display_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <Card className="p-3 flex items-center justify-between bg-muted/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback>{selectedUser.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{selectedUser.display_name || selectedUser.username}</p>
                  <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>Change</Button>
            </Card>
          )}

          {selectedUser && (
            <div className="flex gap-3">
              <Input
                type="number"
                placeholder="Amount"
                value={individualAmount}
                onChange={(e) => setIndividualAmount(e.target.value)}
                min={1}
              />
              <Button
                onClick={() => {
                  const val = parseInt(individualAmount);
                  if (!val || val <= 0) return;
                  giftIndividualMutation.mutate({ recipientId: selectedUser.id, amount: val });
                }}
                disabled={!individualAmount || parseInt(individualAmount) <= 0 || giftIndividualMutation.isPending}
                className="gap-2 whitespace-nowrap"
              >
                <PrangsIcon size="xs" />
                {giftIndividualMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
