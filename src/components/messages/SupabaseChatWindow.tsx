import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, useDirectConversation } from "@/hooks/useChat";
import { usePresence, formatLastSeen, setTypingStatus, isUserOnline } from "@/hooks/usePresence";
import { useMessageReactions, REACTION_OPTIONS } from "@/hooks/useMessageReactions";
import { useHiddenMessages } from "@/hooks/useHiddenMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ArrowLeft, Send, Image as ImageIcon, Smile, Loader2, Check, CheckCheck, Info, Phone, Video, PhoneMissed, Pin, X, Reply as ReplyIcon, Plus, MapPin, FileText, Timer, Lock, Star, Camera, Search as SearchIcon, Trash2, Forward as ForwardIcon, Copy as CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ChatInfoPanel } from "./ChatInfoPanel";
import { FullscreenMediaViewer, type ViewerItem } from "./FullscreenMediaViewer";
import { VoiceRecorder } from "./VoiceRecorder";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";
import { MessageActionsSheet } from "./MessageActionsSheet";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import { ChatCustomizeDialog } from "./ChatCustomizeDialog";
import { LinkPreview, extractFirstUrl } from "./LinkPreview";
import { useCall } from "@/contexts/CallContext";
import { useChatPreferences, usePinnedMessage, themeGradient, DEFAULT_QUICK_REACTIONS } from "@/hooks/useChatPreferences";
import { useDisappearingMode, useStarredMessages } from "@/hooks/useDisappearingMode";
import { toast } from "sonner";
import type { ChatMessage } from "@/hooks/useChat";

const EMOJIS = ["😀", "😂", "❤️", "👍", "🔥", "🎉", "😢", "😮", "💯", "✨", "🙌", "👏"];
const lastTapMap = new Map<string, number>();

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
}

interface SupabaseChatWindowProps {
  friendProfile: Profile;
  onBack?: () => void;
}

const formatBubbleTime = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
};

export const SupabaseChatWindow = ({ friendProfile, onBack }: SupabaseChatWindowProps) => {
  const { user } = useAuth();
  const { conversationId, loading: convoLoading } = useDirectConversation(friendProfile.id);
  const { messages, loading, sendText, sendMedia, deleteMessage, editMessage, forwardMessage } = useChat(conversationId);
  const presence = usePresence([friendProfile.id]);
  const status = presence[friendProfile.id];
  const online = isUserOnline(status);
  const { startAudioCall, startVideoCall, setCallProfile } = useCall();
  const { prefs } = useChatPreferences(conversationId);
  const { pinnedId, pin } = usePinnedMessage(conversationId);
  const { seconds: disappearSecs, setDisappearing } = useDisappearingMode(conversationId);
  const { isStarred, toggleStar } = useStarredMessages(user?.id);
  const { hide: hideMsg, hideMany, isHidden } = useHiddenMessages(user?.id);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const displayName = prefs.nickname?.trim() || friendProfile.display_name || friendProfile.username;
  const ownBubbleStyle = { background: themeGradient(prefs.theme) };
  const quickReactions = prefs.quick_reactions?.length ? prefs.quick_reactions : DEFAULT_QUICK_REACTIONS;

  // Keep call UI synced with current friend profile
  useEffect(() => {
    setCallProfile(friendProfile);
  }, [friendProfile.id]);

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStartId, setViewerStartId] = useState<string | undefined>();
  const [actionsTarget, setActionsTarget] = useState<ChatMessage | null>(null);
  const [forwardTarget, setForwardTarget] = useState<ChatMessage | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clearedAt, setClearedAt] = useState<string | null>(() =>
    conversationId && user?.id ? localStorage.getItem(`chat_cleared_${conversationId}_${user.id}`) : null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const swipeStart = useRef<{ x: number; y: number; id: string } | null>(null);

  // Re-read cleared timestamp when chat changes
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    setClearedAt(localStorage.getItem(`chat_cleared_${conversationId}_${user.id}`));
    setSelectionMode(false);
    setSelectedIds(new Set());
    setSearchOpen(false);
    setSearchQuery("");
  }, [conversationId, user?.id]);

  // Filter out cleared messages
  const visibleMessages = useMemo(() => {
    let arr = messages;
    if (clearedAt) {
      const t = new Date(clearedAt).getTime();
      arr = arr.filter((m) => new Date(m.created_at).getTime() > t);
    }
    if (disappearSecs > 0) {
      const cutoff = Date.now() - disappearSecs * 1000;
      arr = arr.filter((m) => new Date(m.created_at).getTime() >= cutoff);
    }
    arr = arr.filter((m) => !isHidden(m.id));
    return arr;
  }, [messages, clearedAt, disappearSecs, isHidden]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(visibleMessages.filter((m) => (m.content || "").toLowerCase().includes(q)).map((m) => m.id));
  }, [visibleMessages, searchQuery]);

  // Tick every minute so disappearing messages re-evaluate
  const [, setTick] = useState(0);
  useEffect(() => {
    if (disappearSecs <= 0) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, [disappearSecs]);

  const messageIds = useMemo(() => visibleMessages.map((m) => m.id), [visibleMessages]);
  const { byMsg: reactionsByMsg, react } = useMessageReactions(messageIds);

  const mediaItems: ViewerItem[] = useMemo(
    () =>
      visibleMessages
        .filter((m) => m.media_url && (m.media_type === "image" || m.media_type === "video"))
        .map((m) => ({ id: m.id, url: m.media_url!, type: m.media_type as "image" | "video" })),
    [visibleMessages]
  );

  const openViewer = (id: string) => {
    setViewerStartId(id);
    setViewerOpen(true);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages.length]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    const unread = visibleMessages.filter((m) => m.sender_id !== user.id && !m.is_read);
    if (unread.length === 0) return;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase
        .from("messages" as any)
        .update({ is_read: true })
        .in("id", unread.map((m) => m.id));
    })();
  }, [visibleMessages, conversationId, user?.id]);

  // Typing indicator: debounced
  const handleTyping = (val: string) => {
    setText(val);
    if (!user?.id || !conversationId) return;
    setTypingStatus(user.id, conversationId);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      setTypingStatus(user.id, null);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (user?.id) setTypingStatus(user.id, null);
    };
  }, [conversationId, user?.id]);

  const isFriendTyping = status?.typing_in_conversation && status.typing_in_conversation === conversationId;

  const handleSend = async () => {
    if (editingId) {
      const t = editingText.trim();
      if (t) await editMessage(editingId, t);
      setEditingId(null);
      setEditingText("");
      setText("");
      return;
    }
    if (!text.trim()) return;
    const value = text;
    const rid = replyTo?.id;
    setText("");
    setReplyTo(null);
    await sendText(value, rid);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const rid = replyTo?.id;
    setReplyTo(null);
    try {
      await sendMedia(file, rid);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const startLongPress = (m: ChatMessage) => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      setActionsTarget(m);
      if (navigator.vibrate) navigator.vibrate(20);
    }, 450);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const startSelection = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };
  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };
  const bulkDeleteForMe = () => {
    hideMany(Array.from(selectedIds));
    toast.success(`Deleted ${selectedIds.size} for you`);
    clearSelection();
  };
  const bulkCopy = () => {
    const parts = visibleMessages
      .filter((m) => selectedIds.has(m.id) && m.content)
      .map((m) => m.content as string);
    if (parts.length) {
      navigator.clipboard.writeText(parts.join("\n"));
      toast.success("Copied");
    }
    clearSelection();
  };

  const beginEdit = (m: ChatMessage) => {
    setEditingId(m.id);
    setEditingText(m.content || "");
    setText(m.content || "");
    setReplyTo(null);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
    setText("");
  };

  // Swipe-to-reply handlers
  const onBubbleTouchStart = (m: ChatMessage, e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY, id: m.id };
    startLongPress(m);
  };
  const onBubbleTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - swipeStart.current.x;
    const dy = t.clientY - swipeStart.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) cancelLongPress();
  };
  const onBubbleTouchEnd = (m: ChatMessage, e: React.TouchEvent) => {
    cancelLongPress();
    if (!swipeStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeStart.current.x;
    const dy = t.clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(dx) > 55 && Math.abs(dy) < 40 && !m.is_deleted && m.message_type !== "call_log") {
      setReplyTo(m);
      if (navigator.vibrate) navigator.vibrate(15);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0 overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 px-3 py-2.5 flex items-center gap-3 border-b bg-card/80 backdrop-blur-md">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative shrink-0">
          <div className="rounded-full p-[2px] bg-coral-gradient">
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarImage src={friendProfile.avatar_url || ""} />
              <AvatarFallback>{friendProfile.display_name?.[0] || friendProfile.username?.[0]}</AvatarFallback>
            </Avatar>
          </div>
          {online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
          )}
        </div>
        <button
          onClick={() => setInfoOpen(true)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-1">
            <h3 className="font-semibold text-[15px] truncate">
              {displayName}
            </h3>
            {friendProfile.is_verified && <VerifiedBadge size="sm" />}
            <Lock className="h-3 w-3 text-emerald-500 shrink-0" aria-label="End-to-end encrypted" />
            {disappearSecs > 0 && <Timer className="h-3 w-3 text-coral-accent shrink-0" aria-label="Disappearing messages on" />}
          </div>
          <p className={cn("text-xs truncate", isFriendTyping ? "text-primary font-medium" : online ? "text-green-500 font-medium" : "text-muted-foreground")}>
            {isFriendTyping ? "typing…" : formatLastSeen(status)}
          </p>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchOpen((v) => !v)}
          className="shrink-0"
          aria-label="Search in conversation"
        >
          <SearchIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startAudioCall(friendProfile.id, conversationId)}
          className="shrink-0"
          aria-label="Audio call"
        >
          <Phone className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startVideoCall(friendProfile.id, conversationId)}
          className="shrink-0"
          aria-label="Video call"
        >
          <Video className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setInfoOpen(true)} className="shrink-0">
          <Info className="h-5 w-5" />
        </Button>
      </div>

      {/* In-chat search bar */}
      {searchOpen && (
        <div className="px-3 py-2 border-b bg-card flex items-center gap-2">
          <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in conversation…"
            className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
          {searchQuery && (
            <span className="text-[11px] text-muted-foreground shrink-0">{searchMatches.size} match{searchMatches.size === 1 ? "" : "es"}</span>
          )}
          <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="text-muted-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Selection toolbar */}
      {selectionMode && (
        <div className="px-3 py-2 border-b bg-primary/10 flex items-center gap-2">
          <button onClick={clearSelection} className="p-1 rounded-full hover:bg-muted" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium flex-1">{selectedIds.size} selected</span>
          <Button variant="ghost" size="icon" onClick={bulkCopy} disabled={!selectedIds.size} aria-label="Copy">
            <CopyIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const first = visibleMessages.find((m) => selectedIds.has(m.id));
              if (first) { setForwardTarget(first); }
            }}
            disabled={!selectedIds.size}
            aria-label="Forward"
          >
            <ForwardIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={bulkDeleteForMe} disabled={!selectedIds.size} className="text-destructive" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Pinned message banner */}
      {pinnedId && (() => {
        const pm = visibleMessages.find((x) => x.id === pinnedId);
        if (!pm) return null;
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20 text-xs">
            <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
            <button
              onClick={() => {
                const el = document.getElementById(`msg-${pm.id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                el?.classList.add("ring-2", "ring-primary");
                setTimeout(() => el?.classList.remove("ring-2", "ring-primary"), 1500);
              }}
              className="flex-1 min-w-0 text-left truncate font-medium"
            >
              <span className="text-primary mr-1">Pinned:</span>
              {pm.content || (pm.media_type ? `Sent ${pm.media_type}` : "Message")}
            </button>
            <button onClick={() => pin(null)} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Unpin">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })()}

      {/* Messages */}
      <ScrollArea className="flex-1 min-w-0">
        <div ref={scrollRef} className="p-3 sm:p-4 space-y-1.5 min-h-full min-w-0">

          {(loading || convoLoading) && visibleMessages.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <div className="rounded-full p-[3px] bg-coral-gradient mb-4">
                <Avatar className="h-20 w-20 border-4 border-background">
                  <AvatarImage src={friendProfile.avatar_url || ""} />
                  <AvatarFallback className="text-xl">
                    {friendProfile.display_name?.[0] || friendProfile.username?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="font-semibold">{friendProfile.display_name || friendProfile.username}</p>
              <p className="text-sm text-muted-foreground mt-1">Say hi 👋 — your messages appear here.</p>
            </div>
          ) : (
            visibleMessages.map((m, i) => {
              const isOwn = m.sender_id === user?.id;

              // Call log system bubble
              if (m.message_type === "call_log") {
                const isVideo = m.call_type === "video";
                const Icon = m.call_status === "missed" || m.call_status === "declined" ? PhoneMissed : isVideo ? Video : Phone;
                const label =
                  m.call_status === "missed" ? (isOwn ? `Unanswered ${isVideo ? "video " : ""}call` : `Missed ${isVideo ? "video " : ""}call`) :
                  m.call_status === "declined" ? `${isVideo ? "Video c" : "C"}all declined` :
                  m.call_status === "started" ? `${isOwn ? "You started" : "Started"} a ${isVideo ? "video " : ""}call` :
                  `${isVideo ? "Video c" : "C"}all ended`;
                const dur = m.call_duration ? ` · ${Math.floor(m.call_duration / 60)}:${String(m.call_duration % 60).padStart(2, "0")}` : "";
                const isError = m.call_status === "missed" || m.call_status === "declined";
                return (
                  <div key={m.id} className="flex justify-center my-2">
                    <button
                      onClick={() => isVideo ? startVideoCall(friendProfile.id, conversationId) : startAudioCall(friendProfile.id, conversationId)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-card hover:bg-accent transition",
                        isError ? "text-destructive border-destructive/30" : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{label}{dur}</span>
                      <span className="opacity-60">· {format(new Date(m.created_at), "h:mm a")}</span>
                    </button>
                  </div>
                );
              }

              // Deleted message placeholder
              if (m.is_deleted) {
                return (
                  <div key={m.id} className={cn("flex w-full", isOwn ? "justify-end" : "justify-start")}>
                    <div className="px-3.5 py-2 text-[13px] italic text-muted-foreground bg-muted/50 rounded-2xl max-w-[80%]">
                      Message deleted
                    </div>
                  </div>
                );
              }

              const prev = visibleMessages[i - 1];
              const next = visibleMessages[i + 1];
              const sameAsPrev = prev?.sender_id === m.sender_id && prev?.message_type !== "call_log" &&
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
              const sameAsNext = next?.sender_id === m.sender_id && next?.message_type !== "call_log" &&
                new Date(next.created_at).getTime() - new Date(m.created_at).getTime() < 5 * 60_000;
              const isLast = !sameAsNext;

              const radius = isOwn
                ? cn("rounded-2xl", sameAsPrev && "rounded-tr-md", sameAsNext && "rounded-br-md")
                : cn("rounded-2xl", sameAsPrev && "rounded-tl-md", sameAsNext && "rounded-bl-md");

              const reactions = reactionsByMsg[m.id] || [];
              const grouped: Record<string, number> = {};
              reactions.forEach((r) => { grouped[r.reaction] = (grouped[r.reaction] || 0) + 1; });
              const myReaction = reactions.find((r) => r.user_id === user?.id)?.reaction;

              const replyTarget = m.reply_to_id ? visibleMessages.find((x) => x.id === m.reply_to_id) : null;

              // Double-tap to heart (persisted via module-level map)
              const handleDoubleTap = () => {
                const now = Date.now();
                const last = lastTapMap.get(m.id) || 0;
                if (now - last < 300) {
                  react(m.id, "❤️");
                  lastTapMap.set(m.id, 0);
                } else {
                  lastTapMap.set(m.id, now);
                }
              };

              return (
                <div
                  key={m.id}
                  id={`msg-${m.id}`}
                  onTouchStart={() => startLongPress(m)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                  onContextMenu={(e) => { e.preventDefault(); setActionsTarget(m); }}
                  className={cn("flex w-full group rounded-xl transition-shadow", isOwn ? "justify-end" : "justify-start", pinnedId === m.id && "ring-1 ring-primary/40")}
                >
                  <div className={cn("max-w-[85%] sm:max-w-[78%] min-w-0 flex flex-col", isOwn ? "items-end" : "items-start")}>
                    {replyTarget && (
                      <button
                        onClick={() => {
                          const el = document.getElementById(`msg-${replyTarget.id}`);
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        className={cn(
                          "max-w-full mb-1 text-left px-3 py-1.5 rounded-2xl text-[12px] border-l-2 bg-muted/60 truncate",
                          isOwn ? "border-primary" : "border-muted-foreground/40"
                        )}
                      >
                        <span className="font-medium opacity-80">
                          {replyTarget.sender_id === user?.id ? "You" : (friendProfile.display_name || friendProfile.username)}
                        </span>
                        <span className="opacity-70 ml-2 truncate">
                          {replyTarget.content || (replyTarget.media_type ? `${replyTarget.media_type}` : "message")}
                        </span>
                      </button>
                    )}
                    <div className={cn("flex items-end gap-1 min-w-0", isOwn ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn("flex flex-col min-w-0", isOwn ? "items-end" : "items-start")}>
                        {m.media_url && m.media_type === "image" && (
                          <button onClick={() => openViewer(m.id)}>
                            <img
                              src={m.media_url}
                              alt=""
                              className={cn("max-h-72 object-cover cursor-zoom-in", radius, "mb-0.5")}
                            />
                          </button>
                        )}
                        {m.media_url && m.media_type === "video" && (
                          <video
                            src={m.media_url}
                            controls
                            onClick={() => openViewer(m.id)}
                            className={cn("max-h-72 cursor-zoom-in", radius, "mb-0.5")}
                          />
                        )}
                        {m.media_url && m.media_type === "audio" && (
                          <div
                            className={cn("mb-0.5 rounded-full overflow-hidden", !isOwn && "")}
                            style={isOwn ? ownBubbleStyle : undefined}
                          >
                            <VoiceMessagePlayer src={m.media_url} isOwn={isOwn} />
                          </div>
                        )}
                        {m.content && (
                          <div className={cn("flex flex-col min-w-0", isOwn ? "items-end" : "items-start")}>
                            {m.reply_to_story_id && (
                              <div className={cn(
                                "text-[11px] mb-1 px-2 py-1 rounded-full border",
                                isOwn ? "border-primary/30 text-muted-foreground" : "border-border text-muted-foreground"
                              )}>
                                ↪ Replied to a story
                              </div>
                            )}
                            <div
                              onClick={handleDoubleTap}
                              className={cn(
                                "px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap break-words overflow-wrap-anywhere select-none cursor-pointer shadow-sm",
                                radius,
                                isOwn ? "text-white" : "bg-muted text-foreground"
                              )}
                              style={{ wordBreak: "break-word", overflowWrap: "anywhere", ...(isOwn ? ownBubbleStyle : {}) }}
                            >
                              {m.content}
                              {(() => {
                                const url = extractFirstUrl(m.content);
                                return url ? <LinkPreview url={url} dark={isOwn} /> : null;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>


                      <button
                        onClick={() => setActionsTarget(m)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-7 w-7 rounded-full bg-muted hover:bg-accent flex items-center justify-center"
                        aria-label="Message actions"
                      >
                        <Smile className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {Object.keys(grouped).length > 0 && (
                      <div className={cn(
                        "flex gap-1 -mt-1.5 mb-0.5 z-10",
                        isOwn ? "mr-1 self-end" : "ml-1 self-start"
                      )}>
                        {Object.entries(grouped).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => react(m.id, emoji)}
                            className={cn(
                              "px-1.5 py-0.5 rounded-full bg-card border text-xs flex items-center gap-0.5 shadow-sm",
                              myReaction === emoji && "border-primary"
                            )}
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="text-muted-foreground">{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    {isLast && (
                      <span className="text-[10px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                        {formatBubbleTime(m.created_at)}
                        {isOwn && (m.is_read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3" />)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {isFriendTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2.5 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:240ms]" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t p-3 bg-card">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-2xl bg-muted/60 border-l-2 border-primary">
            <ReplyIcon className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-primary">
                Replying to {replyTo.sender_id === user?.id ? "yourself" : (friendProfile.display_name || friendProfile.username)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {replyTo.content || (replyTo.media_type ? `${replyTo.media_type}` : "message")}
              </p>
            </div>
            <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="relative flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5 min-w-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-auto p-2">
              <div className="grid grid-cols-6 gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setText((t) => t + e)}
                    className="text-xl p-1.5 rounded-md hover:bg-muted"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Input
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message…"
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            onChange={handleFile}
            className="hidden"
          />

          {text.trim() ? (
            <Button
              onClick={handleSend}
              size="icon"
              className="h-9 w-9 rounded-full shrink-0 bg-coral-gradient hover:opacity-90 text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0" disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-56 p-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-coral-accent/15 text-coral-accent flex items-center justify-center">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Photo / Video</p>
                      <p className="text-[11px] text-muted-foreground">From your device</p>
                    </div>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Document</p>
                      <p className="text-[11px] text-muted-foreground">PDFs, docs, files</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (!navigator.geolocation) { toast.error("Location not supported"); return; }
                      const t = toast.loading("Getting location…");
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          toast.dismiss(t);
                          const { latitude, longitude } = pos.coords;
                          await sendText(`📍 My location: https://maps.google.com/?q=${latitude},${longitude}`);
                          toast.success("Location shared");
                        },
                        () => { toast.dismiss(t); toast.error("Couldn't get location"); },
                        { enableHighAccuracy: true, timeout: 8000 }
                      );
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-sm text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-[11px] text-muted-foreground">Share current location</p>
                    </div>
                  </button>
                </PopoverContent>
              </Popover>
              <VoiceRecorder
                onSend={async (blob) => {
                  const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
                  await sendMedia(file);
                }}
              />
            </>
          )}

        </div>
      </div>

      <ChatInfoPanel
        open={infoOpen}
        onOpenChange={setInfoOpen}
        friend={friendProfile}
        conversationId={conversationId}
        status={status}
        disappearingSeconds={disappearSecs}
        onChangeDisappearing={setDisappearing}
        onCleared={() => {
          if (conversationId && user?.id) {
            setClearedAt(localStorage.getItem(`chat_cleared_${conversationId}_${user.id}`));
          }
        }}
        onCustomize={() => { setInfoOpen(false); setTimeout(() => setCustomizeOpen(true), 150); }}
        pinnedPreview={(() => {
          if (!pinnedId) return null;
          const pm = visibleMessages.find((x) => x.id === pinnedId);
          if (!pm) return null;
          return { id: pm.id, label: pm.content || (pm.media_type ? `Sent ${pm.media_type}` : "Message") };
        })()}
        onUnpin={() => pin(null)}
        onJumpToPinned={() => {
          const el = document.getElementById(`msg-${pinnedId}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      <FullscreenMediaViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        items={mediaItems}
        startId={viewerStartId}
      />

      <ChatCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        conversationId={conversationId}
        friendLabel={friendProfile.display_name || friendProfile.username}
      />

      <MessageActionsSheet
        open={!!actionsTarget}
        onOpenChange={(v) => !v && setActionsTarget(null)}
        message={actionsTarget}
        isOwn={actionsTarget?.sender_id === user?.id}
        isPinned={!!actionsTarget && pinnedId === actionsTarget.id}
        isStarred={!!actionsTarget && isStarred(actionsTarget.id)}
        quickReactions={quickReactions}
        onReact={(emoji) => actionsTarget && react(actionsTarget.id, emoji)}
        onToggleStar={() => actionsTarget && toggleStar(actionsTarget.id)}
        onReply={() => actionsTarget && setReplyTo(actionsTarget)}
        onForward={() => actionsTarget && setForwardTarget(actionsTarget)}
        onPin={() => actionsTarget && pin(pinnedId === actionsTarget.id ? null : actionsTarget.id)}
        onCopy={() => {
          if (actionsTarget?.content) {
            navigator.clipboard.writeText(actionsTarget.content);
            toast.success("Copied");
          }
        }}
        onDelete={() => actionsTarget && deleteMessage(actionsTarget.id)}
        onReport={async () => {
          if (!actionsTarget || !user?.id) return;
          const { supabase } = await import("@/integrations/supabase/client");
          await supabase.from("reports").insert({
            reporter_id: user.id,
            reported_user_id: actionsTarget.sender_id,
            report_type: "message",
            description: `Reported message ${actionsTarget.id}`,
          });
          toast.success("Reported");
        }}
      />

      <ForwardMessageDialog
        open={!!forwardTarget}
        onOpenChange={(v) => !v && setForwardTarget(null)}
        message={forwardTarget}
        forward={forwardMessage}
      />
    </div>
  );
};
