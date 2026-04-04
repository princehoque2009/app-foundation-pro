import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConversations } from "@/hooks/useConversations";

export const MyFriends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createConversation } = useConversations();

  const { data: friendships } = useQuery({
    queryKey: ["friendships", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*, profiles!friendships_friend_id_fkey(*)")
        .eq("user_id", user?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (!friendships || friendships.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No followers yet. Start connecting with people!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {friendships.map((friendship) => {
        const friend = friendship.profiles;
        return (
          <Card key={friendship.id} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarImage src={friend.avatar_url || ""} />
                <AvatarFallback>
                  <UserCircle className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{friend.display_name || friend.username}</h3>
                <p className="text-sm text-muted-foreground">@{friend.username}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/profile/${friend.id}`)}
              >
                View Profile
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={async () => {
                  const conversationId = await createConversation.mutateAsync(friend.id);
                  navigate(`/messages?conversation=${conversationId}`);
                }}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Message
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
