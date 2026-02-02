import React, { useState, useRef, useEffect } from "react";
import { useFirebaseMessaging } from "@/hooks/useFirebaseMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Camera,
  Plus,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { Message } from "@/services/messagingService";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageReactions } from "./MessageReactions";

interface FirebaseChatWindowProps {
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

export const FirebaseChatWindow = ({
  friendId,
  friendProfile,
  onBack,
  onStartCall,
}: FirebaseChatWindowProps) => {
  const { user } = useAuth();
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
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    if (e.key === "Enter" && !e.shiftKey) {
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
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const formatMessageDate = (timestamp: number) => {
    const date = new Date(timestamp);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getReplyMessage = (replyToId?: string) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId);
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.timestamp);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Modern redesign */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur-sm">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden h-9 w-9 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <div className="relative">
          <Avatar className="h-11 w-11 ring-2 ring-background">
            <AvatarImage src={friendProfile.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {friendProfile.display_name?.[0] || friendProfile.username[0]}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {friendStatus.online && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-card"
              />
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] flex items-center gap-1.5 truncate">
            {friendProfile.display_name || friendProfile.username}
            {friendProfile.is_verified && <VerifiedBadge size="sm" />}
          </h3>
          <p className="text-xs text-muted-foreground">
            {friendStatus.online
              ? isTyping
                ? "typing..."
                : "Active now"
              : friendStatus.lastSeen
              ? `Active ${formatTime(friendStatus.lastSeen)}`
              : "Offline"}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStartCall?.("audio")}
            className="h-9 w-9 rounded-full text-foreground hover:text-primary hover:bg-primary/10"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStartCall?.("video")}
            className="h-9 w-9 rounded-full text-foreground hover:text-primary hover:bg-primary/10"
          >
            <Video className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2">
                <Search className="h-4 w-4" />
                Search in chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">Mute notifications</DropdownMenuItem>
              <DropdownMenuItem className="gap-2">Block user</DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-destructive">Delete chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages - Redesigned bubbles */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Send className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium text-foreground">Start a conversation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Send a message to {friendProfile.display_name || friendProfile.username}
              </p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full">
                    {date}
                  </span>
                </div>

                {dateMessages.map((message, index) => {
                  const isOwn = message.senderId === user?.id;
                  const replyMessage = getReplyMessage(message.replyTo);
                  const showAvatar = !isOwn && (index === 0 || dateMessages[index - 1]?.senderId !== message.senderId);

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-2 group mb-1",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isOwn && (
                        <div className="w-8">
                          {showAvatar && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={friendProfile.avatar_url || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {friendProfile.username[0]}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div className={cn("max-w-[75%] flex flex-col", isOwn && "items-end")}>
                        {/* Reply preview */}
                        {replyMessage && (
                          <div
                            className={cn(
                              "text-xs px-3 py-1.5 rounded-t-xl border-l-2 mb-0.5 max-w-[90%]",
                              isOwn
                                ? "bg-primary/5 border-primary/50 mr-1"
                                : "bg-muted/50 border-muted-foreground/30 ml-1"
                            )}
                          >
                            <p className="font-medium text-[10px] text-muted-foreground mb-0.5">
                              Reply
                            </p>
                            <p className="truncate text-muted-foreground">
                              {replyMessage.text || "📎 Media"}
                            </p>
                          </div>
                        )}

                        {/* Message bubble */}
                        <div
                          className={cn(
                            "px-4 py-2.5 relative",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                              : "bg-muted rounded-2xl rounded-bl-md"
                          )}
                        >
                          {/* Media */}
                          {message.mediaUrl && (
                            <div className="mb-2 -mx-1 -mt-1">
                              {message.mediaType === "image" && (
                                <img
                                  src={message.mediaUrl}
                                  alt="Shared"
                                  className="rounded-xl max-w-full max-h-64 object-cover"
                                />
                              )}
                              {message.mediaType === "video" && (
                                <video
                                  src={message.mediaUrl}
                                  controls
                                  className="rounded-xl max-w-full max-h-64"
                                />
                              )}
                              {message.mediaType === "audio" && (
                                <audio src={message.mediaUrl} controls className="w-full max-w-[200px]" />
                              )}
                              {message.mediaType === "file" && (
                                <a
                                  href={message.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "flex items-center gap-2 text-sm underline",
                                    isOwn ? "text-primary-foreground/90" : "text-foreground"
                                  )}
                                >
                                  <Paperclip className="h-4 w-4" />
                                  Download file
                                </a>
                              )}
                            </div>
                          )}

                          {/* Text */}
                          {message.text && (
                            <p className="break-words text-[15px] leading-relaxed">{message.text}</p>
                          )}

                          {/* Time and status */}
                          <div
                            className={cn(
                              "flex items-center gap-1 mt-1 text-[10px]",
                              isOwn ? "justify-end text-primary-foreground/60" : "text-muted-foreground"
                            )}
                          >
                            <span>
                              {format(new Date(message.timestamp), "h:mm a")}
                            </span>
                            {isOwn && (
                              message.seen ? (
                                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                              ) : message.delivered ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )
                            )}
                          </div>
                        </div>

                        {/* Reply action */}
                        <div className={cn(
                          "flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                          isOwn ? "flex-row-reverse" : ""
                        )}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => setReplyingTo(message)}
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))
          )}

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={friendProfile.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {friendProfile.username[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Reply preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-t overflow-hidden"
          >
            <div className="w-1 h-10 bg-primary rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs text-primary">Replying</p>
              <p className="truncate text-sm text-muted-foreground">
                {replyingTo.text || "📎 Media"}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setReplyingTo(null)}>
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input - Modern design */}
      <div className="px-3 py-3 border-t bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*"
          />
          
          {/* Attachment button */}
          <DropdownMenu open={showAttachMenu} onOpenChange={setShowAttachMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
                disabled={isUploading}
              >
                <Plus className={cn("h-5 w-5 transition-transform", showAttachMenu && "rotate-45")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-40">
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()} className="gap-2">
                <Camera className="h-4 w-4" />
                Photo/Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Paperclip className="h-4 w-4" />
                Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Message input */}
          <div className="flex-1 relative">
            <Input
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder={isUploading ? "Uploading..." : "Message..."}
              className="pr-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
              disabled={isUploading}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
            >
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || isUploading}
            size="icon"
            className="h-10 w-10 rounded-full shrink-0 bg-primary hover:bg-primary/90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
