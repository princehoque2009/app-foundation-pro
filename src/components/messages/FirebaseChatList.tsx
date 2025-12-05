import React, { useEffect, useState } from "react";
import { useFirebaseMessaging } from "@/hooks/useFirebaseMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ChatListItem } from "@/services/messagingService";

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface FirebaseChatListProps {
  selectedFriendId: string | null;
  onSelectFriend: (friendId: string, profile: Profile) => void;
}

export const FirebaseChatList = ({
  selectedFriendId,
  onSelectFriend,
}: FirebaseChatListProps) => {
  const { user } = useAuth();
  const { chatList } = useFirebaseMessaging();
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  // Fetch profiles for all chats
  useEffect(() => {
    const fetchProfiles = async () => {
      if (chatList.length === 0) {
        setLoading(false);
        return;
      }

      const friendIds = chatList.map((chat) => chat.friendId);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", friendIds);

      if (!error && data) {
        const profileMap: Record<string, Profile> = {};
        data.forEach((profile) => {
          profileMap[profile.id] = profile;
        });
        setProfiles(profileMap);
      }
      
      setLoading(false);
    };

    fetchProfiles();
  }, [chatList]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chatList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <UserCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground font-medium">No conversations yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start chatting with your friends
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {chatList.map((chat) => {
          const profile = profiles[chat.friendId];
          if (!profile) return null;

          return (
            <button
              key={chat.chatId}
              onClick={() => onSelectFriend(chat.friendId, profile)}
              className={cn(
                "w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:bg-accent/50",
                selectedFriendId === chat.friendId && "bg-accent"
              )}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile.display_name?.[0] || profile.username[0]}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator would go here */}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold truncate">
                    {profile.display_name || profile.username}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(chat.lastMessageTime), {
                      addSuffix: false,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage || "No messages yet"}
                  </p>
                  {chat.unread > 0 && (
                    <Badge className="bg-primary text-primary-foreground h-5 min-w-5 flex items-center justify-center">
                      {chat.unread > 99 ? "99+" : chat.unread}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};
