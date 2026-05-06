import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { SupabaseChatWindow } from "@/components/messages/SupabaseChatWindow";
import { MessengerSettings } from "@/components/messages/MessengerSettings";
import { CreateGroupDialog } from "@/components/groups/CreateGroupDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Search, Users, UserCircle, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatPreviews } from "@/hooks/useChat";
import { usePresence, useSelfPresence, isUserOnline } from "@/hooks/usePresence";

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

  // Keep my own presence updated
  useSelfPresence();

  // Pull friend selection from URL
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

  const friendIds = useMemo(() => (friends || []).map((f) => f.id), [friends]);
  const previews = useChatPreviews(friendIds);
  const presenceMap = usePresence(friendIds);

  const sortedFriends = useMemo(() => {
    if (!friends) return [];
    return [...friends].sort((a, b) => {
      const pa = previews[a.id];
      const pb = previews[b.id];
      const ua = pa?.unreadCount || 0;
      const ub = pb?.unreadCount || 0;
      if (ua !== ub) return ub - ua;
      return (pb?.lastMessageTime || 0) - (pa?.lastMessageTime || 0);
    });
  }, [friends, previews]);

  const filteredFriends = sortedFriends.filter(
    (f) =>
      f?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectFriend = (friendId: string, profile: Profile) => {
    setSelectedFriend(profile);
    setSearchParams({ friend: friendId });
  };

  const handleBack = () => {
    setSelectedFriend(null);
    setSearchParams({});
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex">
        {/* Chat list */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r bg-card flex flex-col",
            selectedFriend ? "hidden md:flex" : "flex"
          )}
        >
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-primary" />
                Messages
              </h1>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setShowCreateGroup(true)} className="h-9 w-9">
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

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full p-2.5 rounded-2xl flex items-center gap-3 transition-all hover:bg-accent/60"
              >
                <div className="h-12 w-12 rounded-full bg-coral-gradient flex items-center justify-center shadow-sm">
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
                  const preview = previews[friend.id];
                  const isOnline = isUserOnline(presenceMap[friend.id]);
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
                          <h3
                            className={cn(
                              "truncate text-[15px] leading-tight",
                              hasUnread ? "font-semibold text-foreground" : "font-medium"
                            )}
                          >
                            {friend.display_name || friend.username}
                          </h3>
                          {preview?.lastMessageTime && (
                            <span
                              className={cn(
                                "text-[11px] shrink-0",
                                hasUnread ? "text-coral-accent font-semibold" : "text-muted-foreground"
                              )}
                            >
                              {formatTime(preview.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className={cn(
                              "text-[13px] truncate",
                              hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                            )}
                          >
                            {preview?.lastMessage || `@${friend.username}`}
                          </p>
                          {hasUnread && (
                            <span className="h-5 min-w-[20px] px-1.5 text-[11px] font-semibold rounded-full bg-coral-gradient text-white flex items-center justify-center shrink-0">
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
                  <p className="text-xs text-muted-foreground mt-1">Follow people to start chatting</p>
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-muted-foreground">No results found</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat window */}
        <div className={cn("flex-1", selectedFriend ? "flex" : "hidden md:flex")}>
          {selectedFriend ? (
            <SupabaseChatWindow friendProfile={selectedFriend} onBack={handleBack} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/10">
              <div className="w-24 h-24 rounded-full bg-coral-gradient flex items-center justify-center mb-6 shadow-lg">
                <MessageCircle className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Your Messages</h2>
              <p className="text-muted-foreground max-w-sm mb-6">
                Select a friend from the list to start chatting, or create a new group
              </p>
              <Button onClick={() => setShowCreateGroup(true)} className="bg-coral-gradient text-white hover:opacity-90">
                <Users className="h-4 w-4 mr-2" />
                Create Group Chat
              </Button>
            </div>
          )}
        </div>
      </div>

      <CreateGroupDialog open={showCreateGroup} onOpenChange={setShowCreateGroup} />
    </MainLayout>
  );
};

export default Messages;
