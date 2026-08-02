import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { SupabaseChatWindow } from "@/components/messages/SupabaseChatWindow";
import { MessengerSettings } from "@/components/messages/MessengerSettings";
import { CreateGroupDialog } from "@/components/groups/CreateGroupDialog";
import { ConversationActionsSheet } from "@/components/messages/ConversationActionsSheet";
import { NewMenuSheet } from "@/components/messages/NewMenuSheet";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Users,
  UserCircle,
  Plus,
  Settings,
  ArrowLeft,
  Pin,
  Heart,
  Lock,
  Archive,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatPreviews } from "@/hooks/useChat";
import { usePresence, useSelfPresence, isUserOnline } from "@/hooks/usePresence";
import {
  useAllConversationFlags,
  setConversationFlags,
  type ConversationFlags,
} from "@/hooks/useConversationFlags";
import { toast } from "sonner";

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<Profile | null>(null);
  const [messengerTab, setMessengerTab] = useState<"chats" | "feed" | "me">("chats");

  useSelfPresence();

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
    } else {
      setSelectedFriend(null);
    }
  }, [searchParams]);

  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          friend:profiles!friendships_friend_id_fkey (
            id, username, display_name, avatar_url, is_verified
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
  const flagsMap = useAllConversationFlags(user?.id, friendIds);

  const sortedFriends = useMemo(() => {
    if (!friends) return [];
    return [...friends].sort((a, b) => {
      const fa = flagsMap[a.id] || {};
      const fb = flagsMap[b.id] || {};
      if (!!fb.pinned !== !!fa.pinned) return fb.pinned ? 1 : -1;
      const pa = previews[a.id];
      const pb = previews[b.id];
      const ua = (pa?.unreadCount || 0) + (fa.markedUnread ? 1 : 0);
      const ub = (pb?.unreadCount || 0) + (fb.markedUnread ? 1 : 0);
      if (ua !== ub) return ub - ua;
      return (pb?.lastMessageTime || 0) - (pa?.lastMessageTime || 0);
    });
  }, [friends, previews, flagsMap]);

  const visibleFriends = sortedFriends.filter((f) => {
    const flags = flagsMap[f.id] || {};
    const archived = !!flags.archived;
    if (showArchived ? !archived : archived) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.username?.toLowerCase().includes(q) ||
      f.display_name?.toLowerCase().includes(q)
    );
  });

  const archivedCount = useMemo(
    () => sortedFriends.filter((f) => flagsMap[f.id]?.archived).length,
    [sortedFriends, flagsMap]
  );
  const favouritesPresent = useMemo(
    () => sortedFriends.some((f) => flagsMap[f.id]?.favourite),
    [sortedFriends, flagsMap]
  );

  const handleSelectFriend = (friendId: string, profile: Profile) => {
    const flags = flagsMap[friendId] || {};
    if (flags.locked) {
      // Soft "unlock" prompt
      const ok = window.prompt("This chat is locked. Type 'unlock' to open:");
      if (ok?.trim().toLowerCase() !== "unlock") {
        toast.error("Chat remains locked");
        return;
      }
    }
    if (flags.markedUnread) {
      setConversationFlags(user!.id, friendId, { markedUnread: false });
    }
    setSelectedFriend(profile);
    setSearchParams({ friend: friendId });
  };

  const handleBack = () => {
    setSelectedFriend(null);
    setSearchParams({});
  };

  const handleDeleteChat = async (friend: Profile) => {
    if (!user?.id) return;
    const ok = window.confirm(`Delete chat with ${friend.display_name || friend.username}? This clears messages on your side.`);
    if (!ok) return;
    // Soft-delete: hide locally and clear cleared-at marker; messages remain in DB.
    setConversationFlags(user.id, friend.id, { archived: true });
    const conv = previews[friend.id]?.conversationId;
    if (conv) {
      localStorage.setItem(`chat_cleared_${conv}_${user.id}`, new Date().toISOString());
    }
    toast.success("Chat cleared");
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

  // Long-press handler
  const pressTimers = useRef<Record<string, number>>({});
  const onPressStart = (friend: Profile) => {
    pressTimers.current[friend.id] = window.setTimeout(() => {
      setActionsTarget(friend);
      if (navigator.vibrate) navigator.vibrate(15);
    }, 450);
  };
  const onPressEnd = (friend: Profile) => {
    if (pressTimers.current[friend.id]) {
      clearTimeout(pressTimers.current[friend.id]);
      delete pressTimers.current[friend.id];
    }
  };

  const totalUnread = useMemo(
    () =>
      Object.values(previews).reduce(
        (sum: number, p: any) => sum + (p?.unreadCount || 0),
        0
      ),
    [previews]
  );

  const { data: selfProfile } = useQuery({
    queryKey: ["self-profile-mini", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const firstName =
    selfProfile?.display_name?.split(" ")[0] ||
    selfProfile?.username ||
    "there";

  return (
    <MainLayout showHeader={false} showBottomNav={false}>
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <div className="flex flex-1 min-h-0">
          {/* Chat list */}
          <div
            className={cn(
              "w-full md:w-96 border-r bg-background flex flex-col min-h-0",
              selectedFriend ? "hidden md:flex" : "flex"
            )}
          >
            {/* Greeting header */}
            <div className={cn("px-5 pt-6 pb-4", selectedFriend && "hidden md:block")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-foreground truncate">
                    Hi {firstName}
                  </h1>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {String(totalUnread).padStart(2, "0")} unread{" "}
                    {totalUnread === 1 ? "message" : "messages"}
                  </p>
                </div>
                <button
                  onClick={() => navigate("/profile")}
                  className="relative h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0"
                  aria-label="Profile"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selfProfile?.avatar_url || ""} />
                    <AvatarFallback className="bg-muted">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  {totalUnread > 0 && (
                    <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                  )}
                </button>
              </div>
            </div>

            {/* Stories row */}
            <div className="px-5 pb-4">
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => navigate("/create")}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div className="h-14 w-14 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center text-muted-foreground">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Add Story</span>
                </button>
                {(friends || []).slice(0, 12).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => navigate(`/profile/${f.id}`)}
                    className="flex flex-col items-center gap-1.5 shrink-0"
                  >
                    <div className="h-14 w-14 rounded-full p-[2px] bg-gradient-to-tr from-primary via-primary/60 to-primary/30">
                      <Avatar className="h-full w-full ring-2 ring-background">
                        <AvatarImage src={f.avatar_url || ""} />
                        <AvatarFallback className="bg-muted text-foreground text-xs">
                          {(f.display_name || f.username || "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[64px]">
                      {(f.display_name || f.username || "").split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chats section header */}
            <div className="px-5 pb-2 flex items-center justify-between">
              <h2 className="text-[20px] font-bold tracking-tight">Chats</h2>
              <div className="flex items-center gap-1">
                {archivedCount > 0 && (
                  <button
                    onClick={() => setShowArchived((v) => !v)}
                    className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1",
                      showArchived ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Archive className="h-3 w-3" /> {archivedCount}
                  </button>
                )}
                <MessengerSettings
                  trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
                      <Settings className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
            </div>

            {/* Optional search (compact) */}
            {(friends?.length || 0) > 6 && (
              <div className="px-5 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-muted/60 border-0 rounded-full h-9 text-sm"
                  />
                </div>
              </div>
            )}


            <ScrollArea className="flex-1">
              <div className="px-3 pb-32 space-y-1">


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
                ) : visibleFriends.length > 0 ? (
                  visibleFriends.map((friend) => {
                    const preview = previews[friend.id];
                    const isOnline = isUserOnline(presenceMap[friend.id]);
                    const flags = flagsMap[friend.id] || {};
                    const hasUnread =
                      (preview?.unreadCount && preview.unreadCount > 0) || !!flags.markedUnread;

                    return (
                      <button
                        key={friend.id}
                        onClick={() => handleSelectFriend(friend.id, friend)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setActionsTarget(friend);
                        }}
                        onTouchStart={() => onPressStart(friend)}
                        onTouchEnd={() => onPressEnd(friend)}
                        onTouchMove={() => onPressEnd(friend)}
                        onMouseDown={() => onPressStart(friend)}
                        onMouseUp={() => onPressEnd(friend)}
                        onMouseLeave={() => onPressEnd(friend)}
                        className={cn(
                          "w-full p-2.5 rounded-2xl flex items-center gap-3 transition-all hover:bg-accent/60 select-none",
                          selectedFriend?.id === friend.id && "bg-accent",
                          flags.pinned && "bg-coral-accent/5"
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
                          {flags.locked && (
                            <span className="absolute -top-0.5 -left-0.5 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center">
                              <Lock className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <h3
                                className={cn(
                                  "truncate text-[15px] leading-tight",
                                  hasUnread ? "font-semibold text-foreground" : "font-medium"
                                )}
                              >
                                {friend.display_name || friend.username}
                              </h3>
                              {flags.favourite && <Heart className="h-3 w-3 text-coral-accent fill-coral-accent shrink-0" />}
                              {flags.pinned && <Pin className="h-3 w-3 text-coral-accent shrink-0" />}
                            </div>
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
                              {flags.locked
                                ? "🔒 Locked chat"
                                : preview?.lastMessage || `@${friend.username}`}
                            </p>
                            {hasUnread && (
                              <span className="h-5 min-w-[20px] px-1.5 text-[11px] font-semibold rounded-full bg-coral-gradient text-white flex items-center justify-center shrink-0">
                                {preview?.unreadCount || "•"}
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
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    {showArchived ? "No archived chats" : "No results found"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat window */}
          <div className={cn("flex-1 min-h-0", selectedFriend ? "flex" : "hidden md:flex")}>
            {selectedFriend ? (
              <SupabaseChatWindow friendProfile={selectedFriend} onBack={handleBack} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/10">
                <div className="w-24 h-24 rounded-full bg-coral-gradient flex items-center justify-center mb-6 shadow-lg">
                  <Users className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Your Messages</h2>
                <p className="text-muted-foreground max-w-sm mb-6">
                  End-to-end protected. Select a chat to start, or create a new group.
                </p>
                <Button onClick={() => setShowCreateGroup(true)} className="bg-coral-gradient text-white hover:opacity-90">
                  <Users className="h-4 w-4 mr-2" />
                  Create Group Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateGroupDialog open={showCreateGroup} onOpenChange={setShowCreateGroup} />

      {!selectedFriend && (
        <NewMenuSheet
          onNewChat={() => {
            const el = document.querySelector<HTMLInputElement>('input[placeholder="Search chats..."]');
            el?.focus();
          }}
          onNewContact={() => navigate("/friends")}
          onNewCommunity={() => setShowCreateGroup(true)}
        />
      )}


      <ConversationActionsSheet
        open={!!actionsTarget}
        onOpenChange={(v) => !v && setActionsTarget(null)}
        name={actionsTarget?.display_name || actionsTarget?.username || ""}
        flags={actionsTarget ? flagsMap[actionsTarget.id] || {} : {}}
        onUpdate={(patch) => {
          if (actionsTarget && user?.id) {
            setConversationFlags(user.id, actionsTarget.id, patch);
          }
        }}
        onDeleteChat={() => actionsTarget && handleDeleteChat(actionsTarget)}
      />
    </MainLayout>
  );
};

export default Messages;
