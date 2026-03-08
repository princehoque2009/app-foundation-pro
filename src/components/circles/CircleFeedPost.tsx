import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Heart, MessageCircle, Share2, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { CircleCommentsDialog } from "./CircleCommentsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CircleFeedPostProps {
  post: any;
  circle: any;
  userId?: string;
  isAdmin: boolean;
  onDelete: (postId: string) => void;
  posterProfile?: { avatar_url?: string; display_name?: string; username?: string } | null;
  onOpenCircle?: (circle: any) => void;
}

export const CircleFeedPost = ({ post, circle, userId, isAdmin, onDelete, posterProfile, onOpenCircle }: CircleFeedPostProps) => {
  const canDelete = isAdmin || post.user_id === userId;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check if current user liked this post
  const { data: userLike } = useQuery({
    queryKey: ["circle-post-like", post.id, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("circle_post_likes" as any)
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const liked = !!userLike;
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const isLiked = optimisticLiked !== null ? optimisticLiked : liked;
  const likeCount = optimisticCount !== null ? optimisticCount : (post.likes_count || 0);

  // Comments count from DB
  const { data: commentsCount } = useQuery({
    queryKey: ["circle-post-comments-count", post.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("circle_post_comments" as any)
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);
      return count || 0;
    },
  });

  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : "";

  const posterName = posterProfile?.display_name || posterProfile?.username || "Member";

  const handleLike = async () => {
    if (!userId) return;
    const currentlyLiked = isLiked;
    const currentCount = likeCount;

    // Optimistic update
    setOptimisticLiked(!currentlyLiked);
    setOptimisticCount(currentlyLiked ? currentCount - 1 : currentCount + 1);

    try {
      if (currentlyLiked) {
        await supabase
          .from("circle_post_likes" as any)
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("circle_post_likes" as any)
          .insert({ post_id: post.id, user_id: userId });
      }
      queryClient.invalidateQueries({ queryKey: ["circle-post-like", post.id, userId] });
      queryClient.invalidateQueries({ queryKey: ["circle-posts", circle.id] });
    } catch {
      // Revert on error
      setOptimisticLiked(currentlyLiked);
      setOptimisticCount(currentCount);
    }
  };

  // Reset optimistic state when server data updates
  useEffect(() => {
    setOptimisticLiked(null);
    setOptimisticCount(null);
  }, [userLike, post.likes_count]);

  const handleProfileClick = () => {
    if (post.user_id) navigate(`/profile/${post.user_id}`);
  };

  const handleCircleClick = () => {
    if (onOpenCircle) onOpenCircle(circle);
  };

  return (
    <>
      <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 p-4 pb-2">
          <Avatar className="h-10 w-10 shrink-0 cursor-pointer" onClick={handleProfileClick}>
            <AvatarImage src={posterProfile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {posterName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <button onClick={handleProfileClick} className="text-sm font-semibold text-foreground hover:underline truncate">
                {posterName}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              posted in{" "}
              <button onClick={handleCircleClick} className="font-semibold text-foreground hover:underline">
                {circle.name}
              </button>
              {" · "}{timeAgo}
            </p>
          </div>
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-muted/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        {post.caption && (
          <div className="px-4 pb-2">
            <p className="text-sm text-foreground leading-relaxed">{post.caption}</p>
          </div>
        )}

        {/* Media */}
        {post.media_url && (
          <div className="px-4 pb-2 relative">
            {post.media_type === "video" ? (
              <video
                src={post.media_url}
                className="w-full rounded-2xl object-cover max-h-96"
                controls
                preload="metadata"
                playsInline
              />
            ) : (
              <>
                {!imgLoaded && <Skeleton className="w-full rounded-2xl aspect-video" />}
                <img
                  src={post.media_url}
                  className={`w-full rounded-2xl object-cover max-h-96 ${imgLoaded ? "" : "hidden"}`}
                  alt=""
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  onLoad={() => setImgLoaded(true)}
                />
              </>
            )}
          </div>
        )}

        {/* Stats row */}
        {(likeCount > 0 || (commentsCount || 0) > 0) && (
          <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-muted-foreground">
            <span>{likeCount > 0 ? `${likeCount} ${likeCount === 1 ? "like" : "likes"}` : ""}</span>
            <span>{(commentsCount || 0) > 0 ? `${commentsCount} comments` : ""}</span>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-border/40 mx-4" />

        {/* Actions */}
        <div className="flex items-center justify-around py-1">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 py-2.5 px-4 rounded-lg hover:bg-muted/60 transition-all min-h-[44px] text-xs font-medium ${
              isLiked ? "text-[#FF5A5F]" : "text-muted-foreground"
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} /> Like
          </button>
          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 py-2.5 px-4 rounded-lg hover:bg-muted/60 transition-colors min-h-[44px] text-muted-foreground text-xs font-medium"
          >
            <MessageCircle className="h-4 w-4" /> Comment
          </button>
          <button className="flex items-center gap-1.5 py-2.5 px-4 rounded-lg hover:bg-muted/60 transition-colors min-h-[44px] text-muted-foreground text-xs font-medium">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>

      <CircleCommentsDialog
        postId={post.id}
        circleId={post.group_id}
        open={showComments}
        onOpenChange={setShowComments}
      />
    </>
  );
};
