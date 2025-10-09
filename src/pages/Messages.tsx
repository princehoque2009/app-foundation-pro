import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ChatWindow } from "@/components/messages/ChatWindow";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/useConversations";
import { useSearchParams } from "react-router-dom";

const Messages = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get("conversation")
  );
  const { createConversation } = useConversations();

  // Fetch friends list
  const { data: friends } = useQuery({
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

  const { data: selectedConversation } = useQuery({
    queryKey: ["conversation", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;

        const { data, error }: any = await supabase
          .from("conversation_participants" as any)
          .select("profiles (*)")
          .eq("conversation_id", selectedConversationId)
          .neq("user_id", userData.user.id)
          .maybeSingle();

        if (error) throw error;
        return data?.profiles || null;
      } catch (error) {
        console.error("Error fetching conversation:", error);
        return null;
      }
    },
    enabled: !!selectedConversationId,
  });

  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (conversationId) {
      setSelectedConversationId(conversationId);
    }
  }, [searchParams]);

  const handleFriendClick = async (friendId: string) => {
    const conversationId = await createConversation.mutateAsync(friendId);
    setSelectedConversationId(conversationId);
    setSearchParams({ conversation: conversationId });
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)] max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 h-full border rounded-lg overflow-hidden bg-card">
          {/* Friends List */}
          <div className="border-r">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">Friends</h2>
            </div>
            <ScrollArea className="h-full">
              <div className="space-y-2 p-4">
                {friends && friends.length > 0 ? (
                  friends.map((friendship) => {
                    const friend = friendship.profiles;
                    return (
                      <button
                        key={friendship.id}
                        onClick={() => handleFriendClick(friend.id)}
                        className={cn(
                          "w-full p-3 rounded-lg hover:bg-accent transition-colors text-left flex items-center gap-3",
                          selectedConversation?.id === friend.id && "bg-accent"
                        )}
                      >
                        <Avatar>
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback>
                            <UserCircle className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {friend.display_name || friend.username}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            @{friend.username}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No friends yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Add friends to start chatting
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Window */}
          <div className="md:col-span-2">
            {selectedConversationId && selectedConversation ? (
              <ChatWindow
                conversationId={selectedConversationId}
                otherUser={selectedConversation}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a friend to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
