import { useState } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArchivedPosts } from "@/hooks/usePostInteractions";
import { PostOptionsMenu } from "./PostOptionsMenu";
import { Loader2, AlertCircle } from "lucide-react";

interface ArchivedPostsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ArchivedPostsModal = ({ open, onOpenChange }: ArchivedPostsModalProps) => {
  const { data: archivedPosts, isLoading, error } = useArchivedPosts();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archived Posts
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Failed to load archived posts</span>
          </div>
        ) : !archivedPosts || archivedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Archive className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">No archived posts yet</p>
            <p className="text-sm">Posts you archive will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {archivedPosts.map((post: any) => (
                <div
                  key={post.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {post.profiles?.avatar_url && (
                          <img
                            src={post.profiles.avatar_url}
                            alt={post.profiles.display_name || post.profiles.username}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">
                            {post.profiles?.display_name || post.profiles?.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        {post.content && (
                          <p className="text-sm line-clamp-3 break-words">{post.content}</p>
                        )}
                        {post.image_url && (
                          <div className="mt-2 rounded-md overflow-hidden max-h-48 bg-muted">
                            <img
                              src={post.image_url}
                              alt="Post"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <PostOptionsMenu
                        postId={post.id}
                        isOwner={true}
                        isArchived={true}
                        onDeleteSuccess={() => {
                          // Post will be removed from the list automatically via query invalidation
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
