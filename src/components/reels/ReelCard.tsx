import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, Music2, Plus, MoreVertical } from "lucide-react";
import { useToggleLike, usePostLikes } from "@/hooks/usePostInteractions";
import { useState, memo } from "react";
import { CommentsDialog } from "../home/CommentsDialog";
import { PostMenu } from "../home/PostMenu";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PrangonVideoPlayer } from "@/components/video/PrangonVideoPlayer";
import { RenderMentions } from "@/components/ui/RenderMentions";
import { cn } from "@/lib/utils";

interface ReelCardProps {
  id: string;
  authorId?: string;
  author: {
    name: string;
    avatar?: string;
    username: string;
  };
  caption?: string;
  videoUrl: string;
  likes: number;
  comments: number;
  timestamp: string;
  isInView: boolean;
  /** false = keep the slot height but unmount the player */
  mounted?: boolean;
  onInteract?: () => void;
}

const RailButton = ({
  label,
  count,
  onClick,
  active,
  children,
}: {
  label: string;
  count?: number;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col items-center gap-1">
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "lg-glass-strong lg-press lg-focus flex h-12 w-12 items-center justify-center rounded-full text-white",
        active && "text-primary"
      )}
    >
      {children}
    </button>
    {count !== undefined && (
      <span className="reel-text-shadow text-[11px] font-semibold text-white">{count}</span>
    )}
  </div>
);

export const ReelCard = memo(
  ({
    id,
    authorId,
    author,
    caption,
    videoUrl,
    likes,
    comments,
    timestamp,
    isInView,
    mounted = true,
    onInteract,
  }: ReelCardProps) => {
    const [showComments, setShowComments] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: likeData } = usePostLikes(id);
    const toggleLike = useToggleLike(id);
    const isLiked = likeData?.isLiked || false;

    const { data: isFollowing } = useQuery({
      queryKey: ["is-following", user?.id, authorId],
      queryFn: async () => {
        const { data } = await supabase
          .from("friendships")
          .select("id")
          .eq("user_id", user!.id)
          .eq("friend_id", authorId!)
          .maybeSingle();
        return !!data;
      },
      enabled: !!user?.id && !!authorId && user.id !== authorId,
    });

    const showFollowBadge = !!authorId && user?.id !== authorId && isFollowing === false;

    const handleLike = () => toggleLike.mutate(isLiked);

    const handleDelete = async () => {
      if (!confirm("Are you sure you want to delete this reel?")) return;
      try {
        const { error } = await supabase.from("posts").delete().eq("id", id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        toast({ title: "Reel deleted" });
      } catch {
        toast({ title: "Error", description: "Failed to delete reel.", variant: "destructive" });
      }
    };

    const handleEdit = () => {
      toast({ title: "Edit feature", description: "Reel editing will be available soon!" });
    };

    return (
      <div
        className="relative w-full snap-start snap-always bg-black"
        style={{ height: "100dvh" }}
        onPointerDown={onInteract}
      >
        {mounted && (
          <PrangonVideoPlayer
            src={videoUrl}
            autoPlay={isInView}
            isInView={isInView}
            loop
            className="absolute inset-0 h-full w-full !rounded-none"
            compact
            onDoubleTapLike={() => {
              if (!isLiked) handleLike();
            }}
          />
        )}

        {/* Bottom scrim — plain gradient, not glass */}
        <div className="reel-scrim pointer-events-none absolute inset-x-0 bottom-0 h-64 z-[5]" />

        {/* Info block */}
        <div className="absolute bottom-28 left-4 right-24 z-[15] text-white">
          <button
            onClick={() => navigate(`/profile/${author.username}`)}
            className="reel-text-shadow text-[15px] font-semibold lg-focus rounded-md"
          >
            @{author.username}
          </button>
          {caption && (
            <p
              className={cn(
                "reel-text-shadow mt-1.5 text-[14px] font-normal leading-snug",
                !expanded && "line-clamp-2"
              )}
            >
              <RenderMentions text={caption} />
              {!expanded && caption.length > 80 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="ml-1 font-semibold opacity-80"
                >
                  more
                </button>
              )}
            </p>
          )}
          <div className="reel-text-shadow mt-2 flex items-center gap-1.5 text-[13px] font-normal text-white/80">
            <Music2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Original audio · {author.name}</span>
          </div>
        </div>

        {/* Right action rail */}
        <div className="absolute bottom-28 right-3 z-[15] flex flex-col items-center gap-4">
          <div className="relative">
            <button
              onClick={() => navigate(`/profile/${author.username}`)}
              aria-label={`View ${author.name}'s profile`}
              className="lg-glass-strong lg-press lg-focus flex h-12 w-12 items-center justify-center rounded-full p-0.5"
            >
              <Avatar className="h-full w-full">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </button>
            {showFollowBadge && (
              <span className="absolute -bottom-1 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-black/40">
                <Plus className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
          </div>

          <RailButton label="Like" count={likes} onClick={handleLike} active={isLiked}>
            <Heart className={cn("h-6 w-6", isLiked && "fill-primary text-primary animate-like")} />
          </RailButton>

          <RailButton label="Comments" count={comments} onClick={() => setShowComments(true)}>
            <MessageCircle className="h-6 w-6" />
          </RailButton>

          <RailButton label="Share">
            <Share2 className="h-6 w-6" />
          </RailButton>

          <RailButton label="Save" onClick={() => setIsSaved(!isSaved)}>
            <Bookmark className={cn("h-6 w-6", isSaved && "fill-white")} />
          </RailButton>

          <div className="lg-glass-strong flex h-12 w-12 items-center justify-center rounded-full text-white">
            <PostMenu
              postId={id}
              postUserId={author.username}
              mediaUrl={videoUrl}
              mediaType="video"
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          <div className="lg-glass-strong flex h-11 w-11 items-center justify-center overflow-hidden rounded-full">
            <Avatar className="h-8 w-8 animate-[spin_6s_linear_infinite] motion-reduce:animate-none">
              <AvatarImage src={author.avatar} alt="" />
              <AvatarFallback className="bg-primary/70 text-[10px] text-primary-foreground">
                <Music2 className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <CommentsDialog postId={id} open={showComments} onOpenChange={setShowComments} />
      </div>
    );
  }
);

ReelCard.displayName = "ReelCard";
