import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, useDirectConversation } from "@/hooks/useChat";
import { usePresence, formatLastSeen, setTypingStatus, isUserOnline } from "@/hooks/usePresence";
import { useMessageReactions, REACTION_OPTIONS } from "@/hooks/useMessageReactions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ArrowLeft, Send, Image as ImageIcon, Smile, Loader2, Check, CheckCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ChatInfoPanel } from "./ChatInfoPanel";
import { FullscreenMediaViewer, type ViewerItem } from "./FullscreenMediaViewer";

const EMOJIS = ["😀", "😂", "❤️", "👍", "🔥", "🎉", "😢", "😮", "💯", "✨", "🙌", "👏"];

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
  const { messages, loading, sendText, sendMedia } = useChat(conversationId);
  const presence = usePresence([friendProfile.id]);
  const status = presence[friendProfile.id];
  const online = isUserOnline(status);

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStartId, setViewerStartId] = useState<string | undefined>();
  const [clearedAt, setClearedAt] = useState<string | null>(() =>
    conversationId && user?.id ? localStorage.getItem(`chat_cleared_${conversationId}_${user.id}`) : null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Re-read cleared timestamp when chat changes
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    setClearedAt(localStorage.getItem(`chat_cleared_${conversationId}_${user.id}`));
  }, [conversationId, user?.id]);

  // Filter out cleared messages
  const visibleMessages = useMemo(() => {
    if (!clearedAt) return messages;
    const t = new Date(clearedAt).getTime();
    return messages.filter((m) => new Date(m.created_at).getTime() > t);
  }, [messages, clearedAt]);

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
    if (!text.trim()) return;
    const value = text;
    setText("");
    await sendText(value);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await sendMedia(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
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
              {friendProfile.display_name || friendProfile.username}
            </h3>
            {friendProfile.is_verified && <VerifiedBadge size="sm" />}
          </div>
          <p className={cn("text-xs truncate", isFriendTyping ? "text-primary font-medium" : online ? "text-green-500 font-medium" : "text-muted-foreground")}>
            {isFriendTyping ? "typing…" : formatLastSeen(status)}
          </p>
        </button>
        <Button variant="ghost" size="icon" onClick={() => setInfoOpen(true)} className="shrink-0">
          <Info className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 space-y-1.5 min-h-full">
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
              const prev = visibleMessages[i - 1];
              const next = visibleMessages[i + 1];
              const sameAsPrev = prev?.sender_id === m.sender_id &&
                new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
              const sameAsNext = next?.sender_id === m.sender_id &&
                new Date(next.created_at).getTime() - new Date(m.created_at).getTime() < 5 * 60_000;
              const isLast = !sameAsNext;

              const radius = isOwn
                ? cn("rounded-2xl", sameAsPrev && "rounded-tr-md", sameAsNext && "rounded-br-md")
                : cn("rounded-2xl", sameAsPrev && "rounded-tl-md", sameAsNext && "rounded-bl-md");

              const reactions = reactionsByMsg[m.id] || [];
              const grouped: Record<string, number> = {};
              reactions.forEach((r) => { grouped[r.reaction] = (grouped[r.reaction] || 0) + 1; });
              const myReaction = reactions.find((r) => r.user_id === user?.id)?.reaction;

              return (
                <div
                  key={m.id}
                  className={cn("flex w-full group", isOwn ? "justify-end" : "justify-start")}
                >
                  <div className={cn("max-w-[78%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                    <div className={cn("flex items-end gap-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
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
                          <audio src={m.media_url} controls className="mb-0.5" />
                        )}
                        {m.content && (
                          <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                            {m.reply_to_story_id && (
                              <div className={cn(
                                "text-[11px] mb-1 px-2 py-1 rounded-full border",
                                isOwn ? "border-primary/30 text-muted-foreground" : "border-border text-muted-foreground"
                              )}>
                                ↪ Replied to a story
                              </div>
                            )}
                            <div
                              className={cn(
                                "px-3.5 py-2 text-[15px] leading-snug break-words",
                                radius,
                                isOwn
                                  ? "bg-coral-gradient text-white"
                                  : "bg-muted text-foreground"
                              )}
                            >
                              {m.content}
                            </div>
                          </div>
                        )}
                      </div>

                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-7 w-7 rounded-full bg-muted hover:bg-accent flex items-center justify-center"
                            aria-label="React"
                          >
                            <Smile className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-auto p-1.5 rounded-full">
                          <div className="flex gap-0.5">
                            {REACTION_OPTIONS.map((e) => (
                              <button
                                key={e}
                                onClick={() => react(m.id, e)}
                                className={cn(
                                  "text-xl p-1.5 rounded-full hover:bg-muted transition",
                                  myReaction === e && "bg-coral-gradient/20"
                                )}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
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
        <div className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5">
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
            accept="image/*,video/*,audio/*"
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
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full shrink-0"
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>

      <ChatInfoPanel
        open={infoOpen}
        onOpenChange={setInfoOpen}
        friend={friendProfile}
        conversationId={conversationId}
        status={status}
        onCleared={() => {
          if (conversationId && user?.id) {
            setClearedAt(localStorage.getItem(`chat_cleared_${conversationId}_${user.id}`));
          }
        }}
      />

      <FullscreenMediaViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        items={mediaItems}
        startId={viewerStartId}
      />
    </div>
  );
};
