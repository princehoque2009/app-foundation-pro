import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToggleArchive } from "@/hooks/usePostInteractions";
import { useDeletePost } from "@/hooks/usePostActions";
import { toast } from "@/hooks/use-toast";

interface PostOptionsMenuProps {
  postId: string;
  isOwner: boolean;
  isArchived?: boolean;
  onDeleteSuccess?: () => void;
}

export const PostOptionsMenu = ({
  postId,
  isOwner,
  isArchived = false,
  onDeleteSuccess,
}: PostOptionsMenuProps) => {
  const toggleArchive = useToggleArchive(postId);
  const deletePost = useDeletePost();

  const handleArchive = async () => {
    try {
      await toggleArchive.mutateAsync(isArchived);
      toast({
        title: isArchived ? "Post restored" : "Post archived",
        description: isArchived
          ? "Your post is now visible on your profile."
          : "Your post has been hidden from your profile.",
      });
    } catch (error) {
      console.error("Archive error:", error);
      toast({
        title: "Error",
        description: "Failed to archive post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    try {
      await deletePost.mutateAsync(postId);
      toast({
        title: "Post deleted",
        description: "Your post has been permanently deleted.",
      });
      onDeleteSuccess?.();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="text-xl">⋯</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isArchived ? (
          <>
            <DropdownMenuItem onClick={handleArchive} disabled={toggleArchive.isPending}>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              <span>Show on Profile</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={handleArchive} disabled={toggleArchive.isPending}>
              <Archive className="mr-2 h-4 w-4" />
              <span>Archive Post</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={deletePost.isPending}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete Post</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
