import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { SupabaseChatWindow } from "@/components/messages/SupabaseChatWindow";
import { CreateGroupDialog } from "@/components/groups/CreateGroupDialog";
import { ConversationActionsSheet } from "@/components/messages/ConversationActionsSheet";
import { StoryComposer } from "@/components/stories/StoryComposer";
import { NotesBar } from "@/components/messages/NotesBar";
import { NoteComposerModal } from "@/components/messages/NoteComposerModal";
import { NoteViewModal } from "@/components/messages/NoteViewModal";
import { MessengerTabBar, type MessengerTab } from "@/components/messages/MessengerTabBar";
import { CallsScreen } from "@/components/messages/CallsScreen";
import { PeopleScreen } from "@/components/messages/PeopleScreen";
import { SettingsScreen } from "@/components/messages/SettingsScreen";
import { useNotes, type UserNote } from "@/hooks/useNotes";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Users,
  UserCircle,
  Pin,
  Heart,
  Lock,
  Archive,
  Mic,
  Camera,
  SquarePen,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatPreviews } from "@/hooks/useChat";
import { usePresence, useSelfPresence, isUserOnline } from "@/hooks/usePresence";
import {
  useAllConversationFlags,
  setConversationFlags,
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
  const [tab, setTab] = useState<MessengerTab>("chats");
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{ friend: Profile; note: UserNote } | null>(null);
  const [chatDraft, setChatDraft] = useState<string | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const noteUserIds = useMemo(
    () => (user?.id ? [user.id, ...friendIds] : friendIds),
    [user?.id, friendIds]
  );
  const { data: notesMap } = useNotes(noteUserIds);
  const myNote = user?.id ? notesMap?.[user.id] : undefined;

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

  const handleSelectFriend = (friendId: string, profile: Profile, draft?: string) => {
    const flags = flagsMap[friendId] || {};
    if (flags.locked) {
      const ok = window.prompt("This chat is locked. Type 'unlock' to open:");
      if (ok?.trim().toLowerCase() !== "unlock") {
        toast.error("Chat remains locked");
        return;
      }
    }
    if (flags.markedUnread) {
      setConversationFlags(user!.id, friendId, { markedUnread: false });
    }
    setChatDraft(draft);
    setSelectedFriend(profile);
    setSearchParams({ friend: friendId });
  };

  const handleBack = () => {
    setSelectedFriend(null);
    setChatDraft(undefined);
    setSearchParams({});
  };

  const handleDeleteChat = async (friend: Profile) => {
    if (!user?.id) return;
    const ok = window.confirm(
      `Delete chat with ${friend.display_name || friend.username}? This clears messages on your side.`
    );
    if (!ok) return;
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

  const onlineIds = useMemo(
    () => friendIds.filter((id) => isUserOnline(presenceMap[id])),
    [friendIds, presenceMap]
  );

  const startVoiceSearch = () => {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice search isn't supported on this device");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: any) => setSearchQuery(e.results[0][0].transcript);
    rec.onerror = () => toast.error("Couldn't hear that");
    rec.start();
    toast("Listening…");
  };

  const renderChatsScreen = () => (
    <>
      {/* Glass header */}
      <header className="sticky top-0 z-20 bg-background/[.88] backdrop-blur-md border-b border-border/60">
        <div className="flex items-center gap-3 px-4 pt-5 pb-3">
          <button
            onClick={() => navigate("/")}
            className="h-9 w-9 -ml-1 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent/60 transition-colors md:hidden"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button onClick={() => navigate("/profile")} aria-label="Your profile">
            <Avatar className="h-9 w-9">
              <AvatarImage src={selfProfile?.avatar_url || ""} />
              <AvatarFallback className="bg-muted">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </button>
          <h1 className="flex-1 text-[26px] font-extrabold tracking-tight leading-none">
            Chats
          </h1>
          <button
            onClick={() => setStoryComposerOpen(true)}
            className="h-10 w-10 rounded-full bg-muted/70 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            aria-label="Camera"
          >
            <Camera className="h-[19px] w-[19px]" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => {
              setTab("chats");
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="h-10 w-10 rounded-full bg-muted/70 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            aria-label="New chat"
          >
            <SquarePen className="h-[19px] w-[19px]" strokeWidth={1.75} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative flex items-center rounded-xl bg-muted/60 h-11 px-3">
            <Search className="h-[18px] w-[18px] text-muted-foreground shrink-0" strokeWidth={1.75} />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent border-0 outline-none px-2.5 text-[14.5px] placeholder:text-muted-foreground"
            />
            <button
              onClick={startVoiceSearch}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
              aria-label="Voice search"
            >
              <Mic className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      {/* Notes bar */}
      <NotesBar
        self={selfProfile}
        myNote={myNote}
        friends={friends || []}
        notes={notesMap || {}}
        onCreateNote={() => setNoteComposerOpen(true)}
        onOpenNote={(f, note) => setNoteTarget({ friend: f as Profile, note })}
      />

      {archivedCount > 0 && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              "text-[11.5px] font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5",
              showArchived ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
            {showArchived ? "Viewing archived" : `Archived · ${archivedCount}`}
          </button>
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
                    flags.pinned && "bg-primary/5"
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
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
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
                        {flags.favourite && (
                          <Heart className="h-3 w-3 text-primary fill-primary shrink-0" />
                        )}
                        {flags.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                      </div>
                      {preview?.lastMessageTime && (
                        <span
                          className={cn(
                            "text-[11px] shrink-0",
                            hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
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
                        <span className="h-5 min-w-[20px] px-1.5 text-[11px] font-semibold rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
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
    </>
  );

  return (
    <MainLayout showHeader={false} showBottomNav={false}>
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <div className="flex flex-1 min-h-0">
          {/* Left column */}
          <div
            className={cn(
              "w-full md:w-96 border-r bg-background flex flex-col min-h-0",
              selectedFriend ? "hidden md:flex" : "flex"
            )}
          >
            {tab === "chats" && renderChatsScreen()}
            {tab === "calls" && <CallsScreen />}
            {tab === "people" && (
              <PeopleScreen
                friends={friends || []}
                onlineIds={onlineIds}
                onOpenChat={(f) => {
                  setTab("chats");
                  handleSelectFriend(f.id, f as Profile);
                }}
                onNewContact={() => navigate("/friends")}
                onNewCommunity={() => setShowCreateGroup(true)}
              />
            )}
            {tab === "settings" && (
              <SettingsScreen
                profile={selfProfile}
                onOpenProfile={() => navigate("/profile")}
                onExit={() => setTab("chats")}
              />
            )}
          </div>

          {/* Chat window */}
          <div className={cn("flex-1 min-h-0", selectedFriend ? "flex" : "hidden md:flex")}>
            {selectedFriend ? (
              <SupabaseChatWindow
                friendProfile={selectedFriend}
                onBack={handleBack}
                initialDraft={chatDraft}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/10">
                <div className="w-24 h-24 rounded-full bg-coral-gradient flex items-center justify-center mb-6 shadow-lg">
                  <Users className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Your Messages</h2>
                <p className="text-muted-foreground max-w-sm mb-6">
                  End-to-end protected. Select a chat to start, or create a new group.
                </p>
                <Button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-coral-gradient text-white hover:opacity-90"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Create Group Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateGroupDialog open={showCreateGroup} onOpenChange={setShowCreateGroup} />
      <StoryComposer open={storyComposerOpen} onOpenChange={setStoryComposerOpen} />

      <NoteComposerModal
        open={noteComposerOpen}
        onOpenChange={setNoteComposerOpen}
        avatarUrl={selfProfile?.avatar_url}
        name={selfProfile?.display_name || selfProfile?.username || "You"}
        existingNote={myNote?.content}
      />

      <NoteViewModal
        open={!!noteTarget}
        onOpenChange={(v) => !v && setNoteTarget(null)}
        friend={noteTarget?.friend}
        note={noteTarget?.note.content}
        onReply={(friendId, message) => {
          const friend = noteTarget?.friend;
          setNoteTarget(null);
          if (friend) handleSelectFriend(friendId, friend, message);
        }}
      />

      {!selectedFriend && (
        <MessengerTabBar active={tab} onChange={setTab} unreadCount={totalUnread} />
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
