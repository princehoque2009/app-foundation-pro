import { Archive, ArchiveRestore, Trash2, Loader2, AlertCircle, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArchivedPosts, useToggleArchive } from "@/hooks/usePostInteractions";
import { useDeletePost } from "@/hooks/usePostActions";
import { toast } from "@/hooks/use-toast";

interface ArchivedPostsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ArchivedPostRow = ({ post }: { post: any }) => {
  const toggleArchive = useToggleArchive(post.id);
  const deletePost = useDeletePost();

  const handleRestore = async () => {
    try {
      await toggleArchive.mutateAsync(true);
      toast({ title: "Added back to profile", description: "This post is visible on your profile again." });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to restore post", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post permanently? This cannot be undone.")) return;
    try {
      await deletePost.mutateAsync(post.id);
      toast({ title: "Post deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete post", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-2xl border p-3 flex gap-3 items-start">
      <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
        {post.media_url && post.media_type !== "video" ? (
          <img src={post.media_url} alt={post.caption || "Archived post"} className="h-full w-full object-cover" loading="lazy" />
        ) : post.media_url ? (
          <video src={post.media_url} className="h-full w-full object-cover" muted playsInline />
        ) : (
          <FileText className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-2 break-words">{post.caption || "No caption"}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(post.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            size="sm"
            className="rounded-full h-8 gap-1.5 text-xs"
            onClick={handleRestore}
            disabled={toggleArchive.isPending}
          >
            <ArchiveRestore className="h-3.5 w-3.5" />
            Add to profile
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deletePost.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ArchivedPostsModal = ({ open, onOpenChange }: ArchivedPostsModalProps) => {
  const { data: archivedPosts, isLoading, error } = useArchivedPosts();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archive
          </DialogTitle>
          <DialogDescription>
            Only you can see these. Restore any post to put it back on your profile grid.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-10 text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Failed to load archived posts</span>
          </div>
        ) : !archivedPosts || archivedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Archive className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-base font-medium text-foreground">Nothing archived</p>
            <p className="text-sm">Posts you archive will show up here</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[55vh] pr-3">
            <div className="space-y-3">
              {archivedPosts.map((post: any) => (
                <ArchivedPostRow key={post.id} post={post} />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
