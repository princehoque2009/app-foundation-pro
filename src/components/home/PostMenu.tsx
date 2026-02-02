import { MoreVertical, Edit, Trash2, Flag, Share2, Pin, Archive, BarChart3, Link2, Download, EyeOff, BellOff, Copy } from "lucide-react";
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

interface PostMenuProps {
  postId: string;
  postUserId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}

export const PostMenu = ({ postId, postUserId, onEdit, onDelete, onShare }: PostMenuProps) => {
  const { user } = useAuth();
  const isOwner = user?.id === postUserId;

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
      // Copy post link to clipboard
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

  const handlePin = () => {
    toast({
      title: "Post pinned",
      description: "This post has been pinned to your profile.",
    });
  };

  const handleArchive = () => {
    toast({
      title: "Post archived",
      description: "This post has been moved to your archive.",
    });
  };

  const handleViewInsights = () => {
    toast({
      title: "Coming soon",
      description: "Post insights will be available in a future update.",
    });
  };

  const handleDownload = () => {
    toast({
      title: "Coming soon",
      description: "Download feature will be available soon.",
    });
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
              <Pin className="h-4 w-4" />
              Pin to profile
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
