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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar>
          <AvatarImage src={otherUser?.avatar_url || ""} />
          <AvatarFallback>
            <UserCircle className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">
            {otherUser?.display_name || otherUser?.username}
          </h2>
          <p className="text-xs text-muted-foreground">@{otherUser?.username}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={cn("flex gap-2", isOwn && "flex-row-reverse")}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender?.avatar_url || ""} />
                  <AvatarFallback>
                    <UserCircle className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "max-w-[70%] space-y-1",
                    isOwn && "items-end"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 animate-fade-in",
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.media_url && (
                      <div className="mb-2">
                        {message.media_type === "image" ? (
                          <img
                            src={message.media_url}
                            alt="Message media"
                            className="rounded-lg max-w-full"
                            loading="lazy"
                          />
                        ) : (
                          <video
                            src={message.media_url}
                            controls
                            className="rounded-lg max-w-full"
                          />
                        )}
                      </div>
                    )}
                    {message.content && <p className="break-words">{message.content}</p>}
                  </div>
                  <div className={cn("flex items-center gap-2 px-2", isOwn && "justify-end")}>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "h:mm a")}
                    </span>
                    {isOwn && message.is_read && (
                      <span className="text-xs text-primary">✓✓</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
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
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isUploading}
          />
          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || sendMessage.isPending || isUploading}
            size="icon"
            className="hover-scale"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        {isUploading && (
          <p className="text-xs text-muted-foreground mt-2">Uploading media...</p>
        )}
      </div>
    </div>
  );
};
