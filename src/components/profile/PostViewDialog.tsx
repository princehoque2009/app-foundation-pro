import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PostCard } from "@/components/home/PostCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostViewDialogProps {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PostViewDialog = ({ postId, open, onOpenChange }: PostViewDialogProps) => {
  const { data: post, isLoading } = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      if (!postId) return null;
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(*)")
        .eq("id", postId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!postId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-background/80 backdrop-blur-sm border-b">
          <h2 className="font-semibold">Post</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : post ? (
          <PostCard
            id={post.id}
            author={{
              name: post.profiles.display_name || post.profiles.username,
              avatar: post.profiles.avatar_url || "",
              username: post.profiles.username,
            }}
            content={post.caption || ""}
            image={post.media_type === "image" ? post.media_url || "" : undefined}
            video={post.media_type === "video" ? post.media_url || "" : undefined}
            likes={post.likes_count || 0}
            comments={post.comments_count || 0}
            timestamp={post.created_at}
          />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Post not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
