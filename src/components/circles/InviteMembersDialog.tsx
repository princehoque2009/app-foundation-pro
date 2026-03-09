import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, Send, Check, Loader2, UserPlus } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId: string;
  circleName: string;
  userId: string;
  existingMemberIds: string[];
}

export const InviteMembersDialog = ({
  open,
  onOpenChange,
  circleId,
  circleName,
  userId,
  existingMemberIds,
}: InviteMembersDialogProps) => {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  // Search friends who are not already members
  const { data: friends, isLoading } = useQuery({
    queryKey: ["invite-friends-search", userId, search],
    enabled: open && !!userId,
    queryFn: async () => {
      // Get user's friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", userId);

      const friendIds = friendships?.map((f) => f.friend_id) || [];
      if (friendIds.length === 0) return [];

      // Filter out existing members
      const eligibleIds = friendIds.filter((id) => !existingMemberIds.includes(id));
      if (eligibleIds.length === 0) return [];

      let query = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .in("id", eligibleIds);

      if (search.trim()) {
        query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
      }

      const { data } = await query.limit(20);
      return data || [];
    },
  });

  // Check existing invitations
  const { data: existingInvites } = useQuery({
    queryKey: ["existing-circle-invites", circleId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("circle_invitations" as any)
        .select("invited_user_id")
        .eq("circle_id", circleId)
        .eq("status", "pending");
      return new Set((data || []).map((d: any) => d.invited_user_id));
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (invitedUserId: string) => {
      const { error } = await supabase
        .from("circle_invitations" as any)
        .insert({
          circle_id: circleId,
          invited_user_id: invitedUserId,
          invited_by: userId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["existing-circle-invites", circleId] });
      toast({ title: "Invitation sent!" });
    },
    onError: () => {
      toast({ title: "Failed to send invitation", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite to {circleName}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-full bg-muted/60 border-0 h-10"
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-1 -mx-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !friends || friends.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {search ? "No friends found" : "No friends to invite"}
            </p>
          ) : (
            friends.map((friend: any) => {
              const alreadyInvited = existingInvites?.has(friend.id);
              return (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {(friend.display_name || friend.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {friend.display_name || friend.username}
                      </span>
                      {friend.is_verified && <VerifiedBadge size="sm" />}
                    </div>
                    <span className="text-xs text-muted-foreground">@{friend.username}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={alreadyInvited ? "outline" : "default"}
                    disabled={alreadyInvited || inviteMutation.isPending}
                    onClick={() => inviteMutation.mutate(friend.id)}
                    className="rounded-full h-8 px-3 text-xs"
                  >
                    {alreadyInvited ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" /> Invited
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1" /> Invite
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
