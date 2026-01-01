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
      <div className="flex items-center gap-3 p-4 border-b bg-card/80 backdrop-blur-sm">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <div className="relative">
          <Avatar className="h-10 w-10 ring-2 ring-background">
            <AvatarImage src={friendProfile.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {friendProfile.display_name?.[0] || friendProfile.username[0]}
            </AvatarFallback>
          </Avatar>
          {friendStatus.online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold flex items-center gap-1.5 truncate">
            {friendProfile.display_name || friendProfile.username}
            {friendProfile.is_verified && <VerifiedBadge size="sm" />}
          </h3>
          <p className="text-xs text-muted-foreground">
            {friendStatus.online
              ? isTyping
                ? "typing..."
                : "Online"
              : friendStatus.lastSeen
              ? `Last seen ${formatTime(friendStatus.lastSeen)}`
              : "Offline"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStartCall?.("audio")}
            className="text-primary hover:bg-primary/10"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStartCall?.("video")}
            className="text-primary hover:bg-primary/10"
          >
            <Video className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellOff className="h-4 w-4 mr-2" />
                Mute Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Chat
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Flag className="h-4 w-4 mr-2" />
                Report Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <MessengerSettings />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="h-8 w-8 text-primary" />
              </div>
              <p className="font-medium">No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === user?.id;
              const replyMessage = getReplyMessage(message.replyTo);

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 group",
                    isOwn ? "justify-end" : "justify-start"
                  )}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={friendProfile.avatar_url || ""} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {friendProfile.username[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={cn("max-w-[75%] space-y-1", isOwn && "order-1")}>
                    {/* Reply preview */}
                    {replyMessage && (
                      <div
                        className={cn(
                          "text-xs p-2 border-l-2 bg-muted/50",
                          getBubbleClass(),
                          isOwn ? "border-primary" : "border-muted-foreground"
                        )}
                      >
                        <p className="font-medium text-[10px] text-muted-foreground">
                          Replying to
                        </p>
                        <p className="truncate opacity-70">
                          {replyMessage.text || "Media"}
                        </p>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={cn(
                        "p-3 shadow-sm transition-all",
                        getBubbleClass(),
                        getFontSize(),
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border"
                      )}
                    >
                      {/* Media */}
                      {message.mediaUrl && (
                        <div className="mb-2">
                          {message.mediaType === "image" && (
                            <img
                              src={message.mediaUrl}
                              alt="Shared image"
                              className="rounded-lg max-w-full max-h-64 object-cover"
                            />
                          )}
                          {message.mediaType === "video" && (
                            <video
                              src={message.mediaUrl}
                              controls
                              className="rounded-lg max-w-full max-h-64"
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
                      {message.text && <p className="break-words whitespace-pre-wrap">{message.text}</p>}

                      {/* Time and status */}
                      <div
                        className={cn(
                          "flex items-center gap-1.5 mt-1.5 text-[10px]",
                          isOwn ? "justify-end text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isOwn && settings.readReceipts && (
                          message.seen ? (
                            <CheckCheck className="h-3 w-3 text-blue-400" />
                          ) : message.delivered ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )
                        )}
                      </div>
                    </div>

                    {/* Reactions & Actions */}
                    <div className="flex items-center gap-1">
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
                          className="h-6 w-6"
                          onClick={() => setReplyingTo(message)}
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                        {message.text && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
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
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={friendProfile.avatar_url || ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {friendProfile.username[0]}
                </AvatarFallback>
              </Avatar>
              <div className={cn("bg-card border px-4 py-3", getBubbleClass())}>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm border-t">
          <div className="w-1 h-10 bg-primary rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs text-primary">Replying to</p>
            <p className="truncate text-sm text-muted-foreground">
              {replyingTo.text || "Media"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip"
          />

          {/* Emoji picker */}
          <Popover open={showEmoji} onOpenChange={setShowEmoji}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top" align="start">
              <div className="flex gap-1 flex-wrap max-w-[200px]">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setMessageText(prev => prev + emoji);
                      setShowEmoji(false);
                    }}
                    className="text-xl p-1 rounded hover:bg-muted transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Input
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              if (settings.typingIndicator) handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder={isUploading ? "Uploading..." : "Type a message..."}
            className="flex-1 bg-muted/50 border-0 rounded-full px-4"
            disabled={isUploading}
          />

          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || isUploading}
            size="icon"
            className="shrink-0 rounded-full bg-primary hover:bg-primary/90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
