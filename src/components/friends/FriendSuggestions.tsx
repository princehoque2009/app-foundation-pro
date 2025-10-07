import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { UserCircle, UserPlus } from "lucide-react";

export const FriendSuggestions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: suggestions } = useQuery({
    queryKey: ["friend-suggestions", user?.id],
    queryFn: async () => {
      // Get profiles excluding current user, existing friends, and pending requests
      const { data: existingFriends } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user?.id);

      const friendIds = existingFriends?.map(f => f.friend_id) || [];

      const { data: pendingRequests } = await supabase
        .from("friend_requests")
        .select("to_user_id, from_user_id")
        .or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`);

      const requestUserIds = [
        ...(pendingRequests?.map(r => r.to_user_id) || []),
        ...(pendingRequests?.map(r => r.from_user_id) || []),
      ];

      const excludedIds = [...friendIds, ...requestUserIds, user?.id].filter(Boolean);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .not("id", "in", `(${excludedIds.join(",")})`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (toUserId: string) => {
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          from_user_id: user?.id,
          to_user_id: toUserId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests-sent"] });
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully.",
      });
    },
  });

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No suggestions available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {suggestions.map((profile) => (
        <Card key={profile.id} className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar>
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback>
                <UserCircle className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{profile.display_name || profile.username}</h3>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => sendRequestMutation.mutate(profile.id)}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add Friend
          </Button>
        </Card>
      ))}
    </div>
  );
};
