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
  Reply
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Message } from "@/services/messagingService";

interface FirebaseChatWindowProps {
  friendId: string;
  friendProfile: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getReplyMessage = (replyToId?: string) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={friendProfile.avatar_url || ""} />
            <AvatarFallback>
              {friendProfile.display_name?.[0] || friendProfile.username[0]}
            </AvatarFallback>
          </Avatar>
          {friendStatus.online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-online-pulse" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-semibold">
            {friendProfile.display_name || friendProfile.username}
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
            className="text-primary"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStartCall?.("video")}
            className="text-primary"
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet</p>
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
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={friendProfile.avatar_url || ""} />
                      <AvatarFallback>
                        {friendProfile.username[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={cn("max-w-[70%]", isOwn && "order-1")}>
                    {/* Reply preview */}
                    {replyMessage && (
                      <div
                        className={cn(
                          "text-xs p-2 rounded-t-lg border-l-2 mb-1",
                          isOwn
                            ? "bg-primary/10 border-primary"
                            : "bg-muted border-muted-foreground"
                        )}
                      >
                        <p className="font-medium text-[10px] text-muted-foreground">
                          Replying to
                        </p>
                        <p className="truncate">
                          {replyMessage.text || "Media"}
                        </p>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={cn(
                        "p-3 rounded-2xl animate-send-message",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
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
                      {message.text && <p className="break-words">{message.text}</p>}

                      {/* Time and status */}
                      <div
                        className={cn(
                          "flex items-center gap-1 mt-1 text-[10px]",
                          isOwn ? "justify-end text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isOwn && (
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

                    {/* Reply button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setReplyingTo(message)}
                    >
                      <Reply className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={friendProfile.avatar_url || ""} />
                <AvatarFallback>{friendProfile.username[0]}</AvatarFallback>
              </Avatar>
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t">
          <div className="flex-1 text-sm">
            <p className="font-medium text-xs text-primary">Replying to</p>
            <p className="truncate text-muted-foreground">
              {replyingTo.text || "Media"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex items-center gap-2">
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
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Input
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder={isUploading ? "Uploading..." : "Type a message..."}
            className="flex-1 bg-muted border-0"
            disabled={isUploading}
          />

          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || isUploading}
            size="icon"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
