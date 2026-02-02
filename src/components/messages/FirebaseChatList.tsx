import React, { useEffect, useState } from "react";
import { useFirebaseMessaging } from "@/hooks/useFirebaseMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { UserCircle, Search, MessageSquarePlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ChatListItem } from "@/services/messagingService";
import { motion, AnimatePresence } from "framer-motion";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
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
  const [searchQuery, setSearchQuery] = useState("");

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
        .select("id, username, display_name, avatar_url, is_verified")
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

  // Filter chats by search query
  const filteredChats = chatList.filter((chat) => {
    const profile = profiles[chat.friendId];
    if (!profile) return false;
    const searchLower = searchQuery.toLowerCase();
    return (
      profile.username.toLowerCase().includes(searchLower) ||
      profile.display_name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-full bg-muted border-0"
          />
        </div>
      </div>

      {chatList.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MessageSquarePlus className="h-7 w-7 text-primary" />
          </div>
          <p className="font-medium text-foreground">No conversations yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start chatting with your friends
          </p>
        </div>
      ) : filteredChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No results found</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2">
            <AnimatePresence>
              {filteredChats.map((chat, index) => {
                const profile = profiles[chat.friendId];
                if (!profile) return null;

                return (
                  <motion.button
                    key={chat.chatId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onSelectFriend(chat.friendId, profile)}
                    className={cn(
                      "w-full p-3 rounded-2xl flex items-center gap-3 transition-all",
                      "hover:bg-accent/50 active:scale-[0.98]",
                      selectedFriendId === chat.friendId && "bg-accent"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-14 w-14 ring-2 ring-background">
                        <AvatarImage src={profile.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                          {profile.display_name?.[0] || profile.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator */}
                      {chat.unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className={cn(
                          "font-semibold truncate flex items-center gap-1.5",
                          chat.unread > 0 && "text-foreground"
                        )}>
                          {profile.display_name || profile.username}
                          {profile.is_verified && <VerifiedBadge size="sm" />}
                        </h3>
                        <span className={cn(
                          "text-xs shrink-0",
                          chat.unread > 0 ? "text-primary font-medium" : "text-muted-foreground"
                        )}>
                          {formatDistanceToNow(new Date(chat.lastMessageTime), {
                            addSuffix: false,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-sm truncate",
                          chat.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {chat.lastMessage || "No messages yet"}
                        </p>
                        {chat.unread > 0 && (
                          <Badge className="bg-primary text-primary-foreground h-5 min-w-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full shrink-0 ml-2">
                            {chat.unread > 99 ? "99+" : chat.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
