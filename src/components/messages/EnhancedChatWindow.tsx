import React, { useState, useRef, useEffect } from "react";
import { useFirebaseMessaging } from "@/hooks/useFirebaseMessaging";
import { useMessengerSettings } from "@/hooks/useMessengerSettings";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MessengerSettings } from "./MessengerSettings";
import { MessageReactions } from "./MessageReactions";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { 
  Send, 
  Image, 
  Paperclip, 
  Mic, 
  Phone, 
  Video, 
  MoreVertical,
  ArrowLeft,
  Check,
  CheckCheck,
  X,
  Reply,
  Smile,
  Settings,
  User,
  BellOff,
  Trash2,
  Flag,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Message } from "@/services/messagingService";

const EMOJI_LIST = ["😀", "😂", "❤️", "👍", "🔥", "😢", "😮", "🎉", "💯", "✨"];

interface EnhancedChatWindowProps {
  friendId: string;
  friendProfile: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  onBack?: () => void;
  onStartCall?: (type: "audio" | "video") => void;
}

export const EnhancedChatWindow = ({
  friendId,
  friendProfile,
  onBack,
  onStartCall,
}: EnhancedChatWindowProps) => {
  const { user } = useAuth();
  const { settings } = useMessengerSettings();
  const {
    messages,
    isTyping,
    friendStatus,
    loading,
    send,
    sendMedia,
    handleTyping,
    markSeen,
  } = useFirebaseMessaging(friendId);

  const [messageText, setMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, string[]>>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && settings.autoScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, settings.autoScroll]);

  // Mark messages as seen
  useEffect(() => {
    const unreadMessages = messages
      .filter((m) => m.senderId === friendId && !m.seen)
      .map((m) => m.id!)
      .filter(Boolean);

    if (unreadMessages.length > 0) {
      markSeen(unreadMessages);
    }
  }, [messages, friendId, markSeen]);

  const handleSend = async () => {
    if (!messageText.trim()) return;

    await send(messageText.trim(), replyingTo?.id);
    setMessageText("");
    setReplyingTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (settings.enterToSend && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    let mediaType: "image" | "video" | "audio" | "file" = "file";
    if (file.type.startsWith("image/")) mediaType = "image";
    else if (file.type.startsWith("video/")) mediaType = "video";
    else if (file.type.startsWith("audio/")) mediaType = "audio";

    try {
      await sendMedia(file, mediaType, replyingTo?.id);
      setReplyingTo(null);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessageReactions(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        [emoji]: [...(prev[messageId]?.[emoji] || []).filter(id => id !== user?.id), user?.id!]
      }
    }));
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    setMessageReactions(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        [emoji]: (prev[messageId]?.[emoji] || []).filter(id => id !== user?.id)
      }
    }));
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getReplyMessage = (replyToId?: string) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId);
  };

  const getBubbleClass = () => {
    switch (settings.bubbleStyle) {
      case "sharp": return "rounded-lg";
      case "minimal": return "rounded-md";
      default: return "rounded-2xl";
    }
  };

  const getFontSize = () => {
    switch (settings.fontSize) {
      case "small": return "text-sm";
      case "large": return "text-lg";
      default: return "text-base";
    }
  };

  const getBackgroundClass = () => {
    switch (settings.chatBackground) {
      case "gradient-1": return "bg-gradient-to-br from-primary/5 to-purple-500/5";
      case "gradient-2": return "bg-gradient-to-br from-blue-500/5 to-green-500/5";
      case "pattern-1": return "bg-muted/30";
      default: return "bg-background";
    }
  };

  return (
    <div className={cn("flex flex-col h-full", getBackgroundClass())}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b bg-card/95 backdrop-blur-md sticky top-0 z-20">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden -ml-1 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <button className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl hover:bg-muted/50 -mx-1 px-1 py-1 transition-colors">
          <div className="relative shrink-0">
            <div className="p-[2px] rounded-full bg-gradient-to-br from-[#FF6A5A] via-[#FF3D7F] to-[#FF8A5B]">
              <Avatar className="h-10 w-10 border-2 border-card">
                <AvatarImage src={friendProfile.avatar_url || ""} />
                <AvatarFallback className="bg-muted text-foreground text-sm">
                  {friendProfile.display_name?.[0] || friendProfile.username[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            {friendStatus.online && (
              <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[15px] flex items-center gap-1.5 truncate leading-tight">
              {friendProfile.display_name || friendProfile.username}
              {friendProfile.is_verified && <VerifiedBadge size="sm" />}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {isTyping
                ? "typing…"
                : friendStatus.online
                ? "Active now"
                : friendStatus.lastSeen
                ? `Active ${formatTime(friendStatus.lastSeen)}`
                : "Offline"}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onStartCall?.("audio")} className="h-9 w-9 rounded-full">
            <Phone className="h-[18px] w-[18px]" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onStartCall?.("video")} className="h-9 w-9 rounded-full">
            <Video className="h-[18px] w-[18px]" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <MoreVertical className="h-[18px] w-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem className="rounded-lg">
                <User className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <BellOff className="h-4 w-4 mr-2" />
                Mute Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Chat
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg text-destructive focus:text-destructive">
                <Flag className="h-4 w-4 mr-2" />
                Report Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-4" ref={scrollRef}>
        <div className="space-y-1 max-w-3xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF6A5A] via-[#FF3D7F] to-[#FF8A5B] flex items-center justify-center shadow-lg">
                <Send className="h-9 w-9 text-white" />
              </div>
              <p className="font-semibold text-foreground">Say hi 👋</p>
              <p className="text-sm mt-1">Start your conversation with {friendProfile.display_name || friendProfile.username}</p>
            </div>
          ) : (
            messages.map((message, idx) => {
              const isOwn = message.senderId === user?.id;
              const replyMessage = getReplyMessage(message.replyTo);
              const prev = messages[idx - 1];
              const next = messages[idx + 1];
              const sameSenderAsPrev = prev?.senderId === message.senderId && message.timestamp - (prev?.timestamp || 0) < 5 * 60 * 1000;
              const sameSenderAsNext = next?.senderId === message.senderId && (next?.timestamp || 0) - message.timestamp < 5 * 60 * 1000;
              const isFirstInGroup = !sameSenderAsPrev;
              const isLastInGroup = !sameSenderAsNext;

              // Tail-style rounded corners depending on grouping
              const bubbleRadius = isOwn
                ? cn(
                    "rounded-2xl",
                    !isFirstInGroup && "rounded-tr-md",
                    !isLastInGroup && "rounded-br-md"
                  )
                : cn(
                    "rounded-2xl",
                    !isFirstInGroup && "rounded-tl-md",
                    !isLastInGroup && "rounded-bl-md"
                  );

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 group",
                    isOwn ? "justify-end" : "justify-start",
                    isLastInGroup ? "mb-2" : "mb-0.5"
                  )}
                >
                  {!isOwn && (
                    <div className="w-7 shrink-0 self-end">
                      {isLastInGroup && (
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={friendProfile.avatar_url || ""} />
                          <AvatarFallback className="text-[10px] bg-muted">
                            {friendProfile.username[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}

                  <div className={cn("max-w-[78%] sm:max-w-[65%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                    {/* Reply preview */}
                    {replyMessage && (
                      <div
                        className={cn(
                          "text-[11px] px-3 py-1.5 mb-0.5 rounded-2xl bg-muted/70 border-l-2 max-w-full",
                          isOwn ? "border-[#FF3D7F]" : "border-muted-foreground/40"
                        )}
                      >
                        <p className="font-medium text-[10px] text-muted-foreground mb-0.5">
                          Replying to
                        </p>
                        <p className="truncate opacity-80">
                          {replyMessage.text || "Media"}
                        </p>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={cn(
                        "px-3.5 py-2 transition-all break-words",
                        bubbleRadius,
                        getFontSize(),
                        isOwn
                          ? "bg-gradient-to-br from-[#FF6A5A] via-[#FF3D7F] to-[#FF8A5B] text-white shadow-sm"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {/* Media */}
                      {message.mediaUrl && (
                        <div className={cn(message.text && "mb-2")}>
                          {message.mediaType === "image" && (
                            <img
                              src={message.mediaUrl}
                              alt="Shared image"
                              className="rounded-xl max-w-full max-h-72 object-cover -mx-1.5 -mt-1"
                              draggable={false}
                            />
                          )}
                          {message.mediaType === "video" && (
                            <video
                              src={message.mediaUrl}
                              controls
                              className="rounded-xl max-w-full max-h-72 -mx-1.5 -mt-1"
                            />
                          )}
                          {message.mediaType === "audio" && (
                            <audio src={message.mediaUrl} controls className="w-full" />
                          )}
                          {message.mediaType === "file" && (
                            <a
                              href={message.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm underline"
                            >
                              <Paperclip className="h-4 w-4" />
                              Download file
                            </a>
                          )}
                        </div>
                      )}

                      {/* Text */}
                      {message.text && <p className="whitespace-pre-wrap leading-snug">{message.text}</p>}
                    </div>

                    {/* Timestamp + status — only on last in group */}
                    {isLastInGroup && (
                      <div
                        className={cn(
                          "flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isOwn && settings.readReceipts && (
                          message.seen ? (
                            <CheckCheck className="h-3 w-3 text-[#FF3D7F]" />
                          ) : message.delivered ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )
                        )}
                      </div>
                    )}

                    {/* Reactions & quick actions */}
                    <div className={cn("flex items-center gap-1", isOwn && "flex-row-reverse")}>
                      <MessageReactions
                        messageId={message.id!}
                        reactions={messageReactions[message.id!]}
                        currentUserId={user?.id || ""}
                        onReact={handleReaction}
                        onRemoveReaction={handleRemoveReaction}
                        compact
                      />

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => setReplyingTo(message)}
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                        {message.text && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => copyMessage(message.text!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {isTyping && settings.typingIndicator && (
            <div className="flex items-end gap-2 mt-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={friendProfile.avatar_url || ""} />
                <AvatarFallback className="text-[10px] bg-muted">
                  {friendProfile.username[0]}
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur-md border-t">
          <div className="w-1 h-9 rounded-full bg-gradient-to-b from-[#FF6A5A] to-[#FF3D7F]" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[11px] text-[#FF3D7F]">Replying to message</p>
            <p className="truncate text-xs text-muted-foreground">
              {replyingTo.text || "Media"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setReplyingTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2.5 border-t bg-card/95 backdrop-blur-md sticky bottom-0">
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip"
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="shrink-0 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </Button>

          <div className="flex-1 flex items-center gap-1 bg-muted/70 rounded-full pl-4 pr-1 py-1">
            <Input
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                if (settings.typingIndicator) handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder={isUploading ? "Uploading…" : "Message…"}
              className="flex-1 bg-transparent border-0 px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px]"
              disabled={isUploading}
            />

            <Popover open={showEmoji} onOpenChange={setShowEmoji}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                  <Smile className="h-[18px] w-[18px]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 rounded-2xl" side="top" align="end">
                <div className="flex gap-1 flex-wrap max-w-[220px]">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setMessageText(prev => prev + emoji);
                        setShowEmoji(false);
                      }}
                      className="text-xl p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {messageText.trim() ? (
            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || isUploading}
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-[#FF6A5A] via-[#FF3D7F] to-[#FF8A5B] hover:opacity-90 text-white shadow-md border-0"
            >
              <Send className="h-[18px] w-[18px]" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-[18px] w-[18px]" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
