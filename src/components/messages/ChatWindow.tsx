import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, UserCircle, Image as ImageIcon, Video } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(10000, "Message too long"),
});

interface ChatWindowProps {
  conversationId: string;
  otherUser: any;
}

export const ChatWindow = ({ conversationId, otherUser }: ChatWindowProps) => {
  const { user } = useAuth();
  const { messages, sendMessage, uploadMedia } = useMessages(conversationId);
  const [messageText, setMessageText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim()) return;

    // Validate message
    const validation = messageSchema.safeParse({ content: messageText });
    if (!validation.success) {
      toast({
        title: "Invalid message",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    await sendMessage.mutateAsync({
      content: messageText,
    });

    setMessageText("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image or video file",
        variant: "destructive",
      });
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const mediaUrl = await uploadMedia(file);
      await sendMessage.mutateAsync({
        mediaUrl,
        mediaType: isImage ? "image" : "video",
      });

      toast({
        title: "Media uploaded",
        description: "Your file has been sent",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload media file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Meta Style */}
      <div className="px-4 py-3 border-b flex items-center gap-3 bg-card/50 backdrop-blur-sm">
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser?.avatar_url || ""} />
          <AvatarFallback className="bg-muted">
            <UserCircle className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">
            {otherUser?.display_name || otherUser?.username}
          </h2>
          <p className="text-xs text-muted-foreground">Active now</p>
        </div>
      </div>

      {/* Messages - Meta Style */}
      <ScrollArea className="flex-1 px-4 py-3 bg-background">
        <div className="space-y-2 max-w-3xl mx-auto">
          {messages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
            const showTimestamp = index === messages.length - 1 || 
              messages[index + 1].sender_id !== message.sender_id ||
              new Date(messages[index + 1].created_at).getTime() - new Date(message.created_at).getTime() > 60000;
            
            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2 items-end animate-fade-in",
                  isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                {!isOwn && (
                  <Avatar className={cn("h-7 w-7 flex-shrink-0", !showAvatar && "invisible")}>
                    <AvatarImage src={message.sender?.avatar_url || ""} />
                    <AvatarFallback className="bg-muted">
                      <UserCircle className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "rounded-3xl px-4 py-2 max-w-[280px] sm:max-w-md",
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/80"
                    )}
                  >
                    {message.media_url && (
                      <div className={cn(message.content ? "mb-2" : "")}>
                        {message.media_type === "image" ? (
                          <img
                            src={message.media_url}
                            alt="Shared image"
                            className="rounded-2xl max-w-full h-auto"
                            loading="lazy"
                          />
                        ) : (
                          <video
                            src={message.media_url}
                            controls
                            className="rounded-2xl max-w-full"
                          />
                        )}
                      </div>
                    )}
                    {message.content && (
                      <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </div>
                  
                  {showTimestamp && (
                    <span className="text-[11px] text-muted-foreground px-3 mt-0.5">
                      {format(new Date(message.created_at), "h:mm a")}
                      {isOwn && message.is_read && " · Read"}
                    </span>
                  )}
                </div>

                {isOwn && <div className="w-7" />}
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input - Meta Style */}
      <div className="p-3 border-t bg-card/50 backdrop-blur-sm">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full flex-shrink-0 text-primary hover:bg-primary/10"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Aa"
              className="rounded-full bg-muted/50 border-0 px-4 py-2 h-9 focus-visible:ring-1 focus-visible:ring-primary/30 text-[15px]"
              disabled={isUploading}
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || sendMessage.isPending || isUploading}
            size="icon"
            className="h-9 w-9 rounded-full flex-shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {isUploading && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <p className="text-xs text-muted-foreground">Uploading...</p>
          </div>
        )}
      </div>
    </div>
  );
};
