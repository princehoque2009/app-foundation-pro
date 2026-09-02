import { MoreVertical, Edit, Trash2, Flag, Share2, Pin, PinOff, Archive, BarChart3, Link2, Download, EyeOff, BellOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToggleArchive } from "@/hooks/usePostInteractions";


interface PostMenuProps {
  postId: string;
  postUserId: string;
  isPinned?: boolean;
  mediaUrl?: string;
  mediaType?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}

export const PostMenu = ({ postId, postUserId, isPinned = false, mediaUrl, mediaType, onEdit, onDelete, onShare }: PostMenuProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.id === postUserId;
  const toggleArchive = useToggleArchive(postId);


  const handleReport = () => {
    toast({
      title: "Post reported",
      description: "Thanks for helping keep our community safe. We'll review this post.",
    });
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      const postUrl = `${window.location.origin}/post/${postId}`;
      navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link copied!",
        description: "Post link copied to clipboard",
      });
    }
  };

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(postUrl);
    toast({
      title: "Link copied!",
      description: "Post link copied to clipboard",
    });
  };

  const handlePin = async () => {
    if (!user?.id) return;

    try {
      if (isPinned) {
        // Unpin the post
        const { error } = await supabase
          .from("pinned_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);

        if (error) throw error;

        toast({
          title: "Post unpinned",
          description: "This post has been removed from your profile pins.",
        });
      } else {
        // Check how many posts are already pinned
        const { count } = await supabase
          .from("pinned_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if ((count || 0) >= 3) {
          toast({
            title: "Pin limit reached",
            description: "You can only pin up to 3 posts. Unpin one to add another.",
            variant: "destructive",
          });
          return;
        }

        // Pin the post
        const { error } = await supabase
          .from("pinned_posts")
          .insert({
            user_id: user.id,
            post_id: postId,
            display_order: (count || 0),
          });

        if (error) throw error;

        toast({
          title: "Post pinned",
          description: "This post has been pinned to your profile.",
        });
      }

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["pinned-posts", user.id] });
      queryClient.invalidateQueries({ queryKey: ["user-posts", user.id] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update pin status",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async () => {
    try {
      await toggleArchive.mutateAsync(false);
      toast({
        title: "Post archived",
        description: "This post has been moved to your archive.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to archive post",
        variant: "destructive",
      });
    }
  };


  const handleViewInsights = () => {
    toast({
      title: "Coming soon",
      description: "Post insights will be available in a future update.",
    });
  };

  const handleDownload = async () => {
    if (!mediaUrl) {
      toast({ title: "No media", description: "This post has no downloadable media." });
      return;
    }
    try {
      toast({ title: "Downloading…", description: "Your file will be ready shortly." });
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const ext = mediaType === "video" ? "mp4" : "jpg";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prangon-${postId.slice(0, 8)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded!", description: "Media saved successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to download media.", variant: "destructive" });
    }
  };

  const handleHide = () => {
    toast({
      title: "Post hidden",
      description: "You won't see this post anymore.",
    });
  };

  const handleMute = () => {
    toast({
      title: "User muted",
      description: "You won't see posts from this user.",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-accent transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 animate-slide-up">
        {isOwner ? (
          <>
            <DropdownMenuItem onClick={handlePin} className="cursor-pointer gap-2">
              {isPinned ? (
                <>
                  <PinOff className="h-4 w-4" />
                  Unpin from profile
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4" />
                  Pin to profile
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive} className="cursor-pointer gap-2">
              <Archive className="h-4 w-4" />
              Archive post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleViewInsights} className="cursor-pointer gap-2">
              <BarChart3 className="h-4 w-4" />
              View insights
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit} className="cursor-pointer gap-2">
              <Edit className="h-4 w-4" />
              Edit post
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onDelete} 
              className="cursor-pointer text-destructive focus:text-destructive gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete post
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer gap-2">
          <Link2 className="h-4 w-4" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare} className="cursor-pointer gap-2">
          <Share2 className="h-4 w-4" />
          Share post
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload} className="cursor-pointer gap-2">
          <Download className="h-4 w-4" />
          Download
        </DropdownMenuItem>
        
        {!isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleHide} className="cursor-pointer gap-2">
              <EyeOff className="h-4 w-4" />
              Hide post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleMute} className="cursor-pointer gap-2">
              <BellOff className="h-4 w-4" />
              Mute user
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleReport} 
              className="cursor-pointer text-orange-600 focus:text-orange-600 gap-2"
            >
              <Flag className="h-4 w-4" />
              Report post
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
