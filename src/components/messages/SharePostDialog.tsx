import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFirebaseMessaging } from "@/hooks/useFirebaseMessaging";
import { toast } from "@/hooks/use-toast";
import { Search, Send, UserCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SharePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postContent?: string;
  postImage?: string;
  postAuthor?: string;
}

export const SharePostDialog = ({
  open,
  onOpenChange,
  postId,
  postContent,
  postImage,
  postAuthor,
}: SharePostDialogProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Fetch friends
  const { data: friends } = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          friend:profiles!friendships_friend_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("user_id", user?.id);

      if (error) throw error;
      return data?.map((f) => f.friend) || [];
    },
    enabled: !!user?.id && open,
  });

  const filteredFriends = friends?.filter(
    (f) =>
      f?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSend = async () => {
    if (selectedFriends.length === 0) return;

    setSending(true);
    
    // Create a shareable post message
    const postUrl = `${window.location.origin}/post/${postId}`;
    const shareMessage = `📌 Shared a post${postAuthor ? ` from @${postAuthor}` : ""}\n\n${postContent ? `"${postContent.substring(0, 100)}${postContent.length > 100 ? "..." : ""}"` : ""}\n\n🔗 ${postUrl}`;

    try {
      // Send to each selected friend using Firebase
      for (const friendId of selectedFriends) {
        const { sendMessage, createChatIfNotExists } = await import("@/services/messagingService");
        const chatId = await createChatIfNotExists(user!.id, friendId);
        await sendMessage(chatId, user!.id, friendId, shareMessage);
      }

      toast({
        title: "Post shared",
        description: `Sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? "s" : ""}`,
      });
      
      setSelectedFriends([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error sharing post:", error);
      toast({
        title: "Error",
        description: "Failed to share post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
        </DialogHeader>

        {/* Post Preview */}
        {(postContent || postImage) && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            {postImage && (
              <img
                src={postImage}
                alt="Post preview"
                className="w-full h-24 object-cover rounded-lg mb-2"
              />
            )}
            {postContent && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {postContent}
              </p>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Friends List */}
        <ScrollArea className="max-h-60">
          <div className="space-y-1">
            {filteredFriends?.map((friend) => (
              <button
                key={friend?.id}
                onClick={() => friend?.id && toggleFriend(friend.id)}
                className={cn(
                  "w-full p-3 rounded-lg flex items-center gap-3 transition-all",
                  selectedFriends.includes(friend?.id || "")
                    ? "bg-primary/10 border border-primary"
                    : "hover:bg-muted"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={friend?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {friend?.display_name?.[0] || friend?.username?.[0] || (
                      <UserCircle className="h-5 w-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">
                    {friend?.display_name || friend?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{friend?.username}
                  </p>
                </div>
                {selectedFriends.includes(friend?.id || "") && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}

            {filteredFriends?.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">
                No friends found
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={selectedFriends.length === 0 || sending}
          className="w-full"
        >
          {sending ? (
            "Sending..."
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send to {selectedFriends.length || ""} Friend
              {selectedFriends.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
