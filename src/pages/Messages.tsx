import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { EnhancedChatWindow } from "@/components/messages/EnhancedChatWindow";
import { MessengerSettings } from "@/components/messages/MessengerSettings";
import { CallInterface } from "@/components/calling/CallInterface";
import { CreateGroupDialog } from "@/components/groups/CreateGroupDialog";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Search, Users, UserCircle, Plus, Settings, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ref, onValue, off } from "firebase/database";
import { rtdb } from "@/lib/firebase";

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
}

interface ChatPreview {
  friendId: string;
  profile: Profile;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  isOnline?: boolean;
}

const Messages = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [chatPreviews, setChatPreviews] = useState<Record<string, { lastMessage?: string; lastMessageTime?: number; unreadCount: number }>>({});
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const { initiateCall, incomingCall } = useWebRTC();

  // Get friend ID from URL params
  useEffect(() => {
    const friendId = searchParams.get("friend");
    if (friendId) {
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .eq("id", friendId)
        .single()
        .then(({ data }) => {
          if (data) setSelectedFriend(data);
        });
    }
  }, [searchParams]);

  // Fetch friends list
  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          friend:profiles!friendships_friend_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .eq("user_id", user?.id);

      if (error) throw error;
      return data?.map((f) => f.friend).filter(Boolean) as Profile[];
    },
    enabled: !!user?.id,
  });

  // Listen for chat previews and unread counts from Firebase
  useEffect(() => {
    if (!user?.id || !friends || friends.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    friends.forEach((friend) => {
      if (!friend?.id) return;

      const chatId = [user.id, friend.id].sort().join("_");
      
      // Listen for last message
      const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
      const messagesHandler = onValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
          const messages = snapshot.val();
          const messageList = Object.entries(messages)
            .map(([id, msg]: [string, any]) => ({ id, ...msg }))
            .sort((a, b) => b.timestamp - a.timestamp);
          
          const lastMsg = messageList[0];
          const unreadCount = messageList.filter(
            (m) => m.senderId === friend.id && !m.seen
          ).length;

          setChatPreviews((prev) => ({
            ...prev,
            [friend.id]: {
              lastMessage: lastMsg?.text || (lastMsg?.mediaType ? `Sent ${lastMsg.mediaType}` : undefined),
              lastMessageTime: lastMsg?.timestamp,
              unreadCount,
            },
          }));
        }
      });

      unsubscribes.push(() => off(messagesRef, "value", messagesHandler));

      // Listen for online status
      const statusRef = ref(rtdb, `status/${friend.id}`);
      const statusHandler = onValue(statusRef, (snapshot) => {
        if (snapshot.exists()) {
          const status = snapshot.val();
          setOnlineStatus((prev) => ({
            ...prev,
            [friend.id]: status.online === true,
          }));
        }
      });

      unsubscribes.push(() => off(statusRef, "value", statusHandler));
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user?.id, friends]);

  // Sort friends: unread first, then by last message time
  const sortedFriends = useMemo(() => {
    if (!friends) return [];
    
    return [...friends].sort((a, b) => {
      const previewA = chatPreviews[a.id];
      const previewB = chatPreviews[b.id];
      
      // Unread messages first
      const unreadA = previewA?.unreadCount || 0;
      const unreadB = previewB?.unreadCount || 0;
      if (unreadA !== unreadB) return unreadB - unreadA;
      
      // Then by last message time
      const timeA = previewA?.lastMessageTime || 0;
      const timeB = previewB?.lastMessageTime || 0;
      return timeB - timeA;
    });
  }, [friends, chatPreviews]);

  const handleSelectFriend = (friendId: string, profile: Profile) => {
    setSelectedFriend(profile);
    setSearchParams({ friend: friendId });
  };

  const handleBack = () => {
    setSelectedFriend(null);
    setSearchParams({});
  };

  const handleStartCall = (type: "audio" | "video") => {
    if (selectedFriend) {
      initiateCall(selectedFriend.id, type);
    }
  };

  // Get profile for incoming call
  const [incomingCallerProfile, setIncomingCallerProfile] = useState<Profile | null>(null);
  
  useEffect(() => {
    if (incomingCall) {
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .eq("id", incomingCall.callerId)
        .single()
        .then(({ data }) => {
          if (data) setIncomingCallerProfile(data);
        });
    }
  }, [incomingCall]);

  // Filter friends by search
  const filteredFriends = sortedFriends.filter(
    (f) =>
      f?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <MainLayout>
      {/* Call interface */}
      <CallInterface profile={selectedFriend || incomingCallerProfile || undefined} />

      <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex">
        {/* Chat list - hide on mobile when chat is open */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r bg-card flex flex-col",
            selectedFriend ? "hidden md:flex" : "flex"
          )}
        >
          {/* Header */}
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-primary" />
                Messages
              </h1>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCreateGroup(true)}
                  className="h-9 w-9"
                >
                  <Users className="h-5 w-5" />
                </Button>
                <MessengerSettings 
                  trigger={
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Settings className="h-5 w-5" />
                    </Button>
                  }
                />
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-0 rounded-full"
              />
            </div>
          </div>

          {/* Friends / Chat list */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {/* New Group Button */}
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full p-2.5 rounded-2xl flex items-center gap-3 transition-all hover:bg-accent/60"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#FF6A5A] via-[#FF3D7F] to-[#FF8A5B] flex items-center justify-center shadow-sm">
                  <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-[15px]">New Group</h3>
                  <p className="text-xs text-muted-foreground">Start a group conversation</p>
                </div>
              </button>

              {friendsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                ))
              ) : filteredFriends.length > 0 ? (
                filteredFriends.map((friend) => {
                  const preview = chatPreviews[friend.id];
                  const isOnline = onlineStatus[friend.id];
                  const hasUnread = preview?.unreadCount && preview.unreadCount > 0;

                  return (
                    <button
                      key={friend.id}
                      onClick={() => handleSelectFriend(friend.id, friend)}
                      className={cn(
                        "w-full p-2.5 rounded-2xl flex items-center gap-3 transition-all hover:bg-accent/60",
                        selectedFriend?.id === friend.id && "bg-accent"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.avatar_url || ""} />
                          <AvatarFallback className="bg-muted text-foreground">
                            {friend.display_name?.[0] || friend.username?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={cn(
                            "truncate text-[15px] leading-tight",
                            hasUnread ? "font-semibold text-foreground" : "font-medium"
                          )}>
                            {friend.display_name || friend.username}
                          </h3>
                          {preview?.lastMessageTime && (
                            <span className={cn(
                              "text-[11px] shrink-0",
                              hasUnread ? "text-[#FF3D7F] font-semibold" : "text-muted-foreground"
                            )}>
                              {formatTime(preview.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={cn(
                            "text-[13px] truncate",
                            hasUnread
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          )}>
                            {preview?.lastMessage || `@${friend.username}`}
                          </p>
                          {hasUnread && (
                            <span className="h-5 min-w-[20px] px-1.5 text-[11px] font-semibold rounded-full bg-gradient-to-br from-[#FF6A5A] to-[#FF3D7F] text-white flex items-center justify-center shrink-0">
                              {preview.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : friends && friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                    <UserCircle className="h-9 w-9 text-muted-foreground/60" />
                  </div>
                  <p className="font-semibold">No conversations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Follow people to start chatting
                  </p>
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No results found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat window */}
        <div className={cn("flex-1", selectedFriend ? "flex" : "hidden md:flex")}>
          {selectedFriend ? (
            <EnhancedChatWindow
              friendId={selectedFriend.id}
              friendProfile={selectedFriend}
              onBack={handleBack}
              onStartCall={handleStartCall}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/10">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <MessageCircle className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Your Messages</h2>
              <p className="text-muted-foreground max-w-sm mb-6">
                Select a friend from the list to start chatting, or create a new group
              </p>
              <Button onClick={() => setShowCreateGroup(true)}>
                <Users className="h-4 w-4 mr-2" />
                Create Group Chat
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Dialog */}
      <CreateGroupDialog 
        open={showCreateGroup} 
        onOpenChange={setShowCreateGroup} 
      />
    </MainLayout>
  );
};

export default Messages;
