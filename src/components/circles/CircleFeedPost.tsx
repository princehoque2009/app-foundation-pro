import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Heart, MessageCircle, Share2, Trash2, Pin, Flag, Copy, Eye, EyeOff, UserMinus, Link2, Bookmark } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { CircleCommentsDialog } from "./CircleCommentsDialog";
import { CircleRoleBadge } from "./CircleRoleBadge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface CircleFeedPostProps {
  post: any;
  circle: any;
  userId?: string;
  isAdmin: boolean;
  onDelete: (postId: string) => void;
  posterProfile?: { avatar_url?: string; display_name?: string; username?: string; is_verified?: boolean } | null;
  onOpenCircle?: (circle: any) => void;
  onPin?: () => void;
}

export const CircleFeedPost = ({ post, circle, userId, isAdmin, onDelete, posterProfile, onOpenCircle, onPin }: CircleFeedPostProps) => {
  const canDelete = isAdmin || post.user_id === userId;
  const isOwner = post.user_id === userId;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get circle role for this poster
  const { data: posterCircleRole } = useQuery({
    queryKey: ["circle-member-role", circle.id, post.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_group_members")
        .select("role")
        .eq("group_id", circle.id)
        .eq("user_id", post.user_id)
        .maybeSingle();
      return data?.role || "member";
    },
    staleTime: 5 * 60 * 1000,
  });

  const isCircleAdmin = circle.created_by === post.user_id;
  const displayCircleRole = isCircleAdmin ? "admin" : posterCircleRole === "moderator" ? "moderator" : null;

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
      setOptimisticLiked(currentlyLiked);
      setOptimisticCount(currentCount);
    }
  };

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/community/${circle.id}`);
    toast({ title: "Link copied!" });
  };

  const handleReport = () => {
    toast({ title: "Post reported", description: "Thanks for keeping the community safe." });
  };

  const handleSavePost = async () => {
    if (!userId) return;
    toast({ title: "Post saved to bookmarks" });
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
              {posterProfile?.is_verified && <VerifiedBadge size="sm" />}
              {displayCircleRole && <CircleRoleBadge role={displayCircleRole} />}
            </div>
            <p className="text-[11px] text-muted-foreground">
              posted in{" "}
              <button onClick={handleCircleClick} className="font-semibold text-foreground hover:underline">
                {circle.name}
              </button>
              {" · "}{timeAgo}
            </p>
          </div>

          {/* Three-dot menu - always visible */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-muted/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              {/* Owner/Admin actions */}
              {onPin && canDelete && (
                <DropdownMenuItem onClick={onPin} className="gap-2">
                  <Pin className="h-4 w-4" />
                  {post.is_pinned ? "Unpin Post" : "Pin Post"}
                </DropdownMenuItem>
              )}

              {/* Save / Bookmark */}
              <DropdownMenuItem onClick={handleSavePost} className="gap-2">
                <Bookmark className="h-4 w-4" /> Save Post
              </DropdownMenuItem>

              {/* Copy Link */}
              <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
                <Link2 className="h-4 w-4" /> Copy Link
              </DropdownMenuItem>

              {/* View circle */}
              <DropdownMenuItem onClick={handleCircleClick} className="gap-2">
                <Eye className="h-4 w-4" /> View Circle
              </DropdownMenuItem>

              {/* View poster profile */}
              {!isOwner && (
                <DropdownMenuItem onClick={handleProfileClick} className="gap-2">
                  <Eye className="h-4 w-4" /> View Profile
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Report - only for non-owners */}
              {!isOwner && (
                <DropdownMenuItem onClick={handleReport} className="gap-2 text-amber-600">
                  <Flag className="h-4 w-4" /> Report Post
                </DropdownMenuItem>
              )}

              {/* Delete */}
              {canDelete && (
                <DropdownMenuItem onClick={() => onDelete(post.id)} className="gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" /> Delete Post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 py-2.5 px-4 rounded-lg hover:bg-muted/60 transition-colors min-h-[44px] text-muted-foreground text-xs font-medium"
          >
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
