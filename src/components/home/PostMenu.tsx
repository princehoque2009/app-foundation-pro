import { MoreVertical, Edit, Trash2, Flag, Share2 } from "lucide-react";
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
      <DropdownMenuContent align="end" className="w-48 animate-slide-up">
        {isOwner ? (
          <>
            <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              Edit post
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onDelete} 
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete post
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
          <Share2 className="mr-2 h-4 w-4" />
          Share post
        </DropdownMenuItem>
        {!isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleReport} 
              className="cursor-pointer text-orange-600 focus:text-orange-600"
            >
              <Flag className="mr-2 h-4 w-4" />
              Report post
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
