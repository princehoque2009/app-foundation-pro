import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Share2, Bookmark, UserCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { usePostReactions, useToggleReaction } from "@/hooks/usePostReactions";
import { formatDistanceToNow } from "date-fns";
import { CommentsDialog } from "./CommentsDialog";
import { ReactionBreakdownDialog } from "./ReactionBreakdownDialog";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostMenu } from "./PostMenu";
import { EditPostDialog } from "./EditPostDialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { useSavedPosts, useIsPostSaved } from "@/hooks/useSavedPosts";
import { UserRoleBadges } from "@/components/ui/RoleBadge";
import { useUserRoles } from "@/hooks/useUserRoles";
import { MediaCarousel } from "./MediaCarousel";
import { PostMedia } from "@/hooks/usePosts";
import { useActiveEffects } from "@/hooks/useActiveEffects";
import { PrangonVideoPlayer } from "@/components/video/PrangonVideoPlayer";
import { RenderMentions } from "@/components/ui/RenderMentions";
import { useRecordPostView } from "@/hooks/usePostViews";
import { ReactionTrayButton } from "./ReactionTrayButton";
import { getReactionMeta } from "@/hooks/usePostReactions";

interface PostCardProps {
  id: string;
  author: {
    name: string;
    avatar?: string;
    username: string;
    isVerified?: boolean;
    userId?: string;
  };
  content: string;
  image?: string;
  video?: string;
  mediaItems?: PostMedia[];
  likes: number;
  comments: number;
  timestamp: string;
}

export const PostCard = ({ id, author, content, image, video, mediaItems, likes, comments, timestamp }: PostCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showReactionBreakdown, setShowReactionBreakdown] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: userRoles } = useUserRoles({ userId: author.userId });
  const { effects: authorEffects } = useActiveEffects(author.userId);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const { data: reactionData } = usePostReactions(id);
  const toggleReaction = useToggleReaction(id);
  const { savePost, unsavePost } = useSavedPosts();
  const { data: isSaved } = useIsPostSaved(id);
  const recordView = useRecordPostView();

  useEffect(() => {
    recordView.mutate(id);
  }, [id]);

  const isLiked = !!reactionData?.myReaction;
  const myReaction = (reactionData?.myReaction as any) || null;

  const handleReact = (key: any) => {
    if (key && !myReaction) {
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 800);
    }
    toggleReaction.mutate({ reaction: key, currentReaction: myReaction });
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 800);
      toggleReaction.mutate({ reaction: "love" as any, currentReaction: myReaction });
    }
  };

  const handleProfileClick = () => {
    if (author.userId) navigate(`/profile/${author.userId}`);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      toast({ title: "Post deleted", description: "Your post has been deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete post.", variant: "destructive" });
    }
  };

  const handleEdit = () => setShowEditDialog(true);

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Check out this post on Prangon', text: content, url: postUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(postUrl);
      toast({ title: "Link copied", description: "Post link copied to clipboard" });
    }
  };

  const likeCount = reactionData?.totalCount || likes;

  return (
    <>
      <article className="mb-8 pb-7 border-b border-border/60 animate-fade-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-3 cursor-pointer group min-w-0 flex-1" onClick={handleProfileClick}>
            <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border transition-transform group-hover:scale-105">
              <AvatarImage src={author.avatar || undefined} alt={author.name} />
              <AvatarFallback className="bg-muted text-muted-foreground"><UserCircle className="h-6 w-6" /></AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className={cn("font-bold text-[14.5px] leading-tight truncate group-hover:text-primary transition-colors", authorEffects.hasRainbowName ? "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent" : "text-foreground")}>{author.name}</span>
              {author.isVerified && <VerifiedBadge size="sm" />}
              {authorEffects.hasCustomBadge && <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-[8px] text-white font-bold">★</span>}
              <span className="text-[12px] text-muted-foreground/80 truncate">@{author.username}</span>
              <span className="text-muted-foreground/50 text-[12px]">·</span>
              <span className="text-[12px] text-muted-foreground/80">{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</span>
              {userRoles && userRoles.length > 0 && <UserRoleBadges roles={userRoles as any} size="sm" />}
            </div>
          </div>
          <PostMenu postId={id} postUserId={author.userId || ""} mediaUrl={image || video} mediaType={video ? "video" : "image"} onEdit={handleEdit} onDelete={handleDelete} onShare={handleShare} />
        </div>

        {content && <p className="text-[15px] leading-relaxed text-foreground select-none mb-3"><RenderMentions text={content} /></p>}

        {mediaItems && mediaItems.length > 0 ? (
          <div className="relative bg-muted/40 cursor-pointer overflow-hidden select-none rounded-xl border border-border" onDoubleClick={handleDoubleTap} onContextMenu={(e) => e.preventDefault()}>
            <MediaCarousel media={mediaItems} onDoubleClick={handleDoubleTap} />
            <AnimatePresence>{showHeartAnimation && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"><span className="text-7xl drop-shadow-2xl">{getReactionMeta(myReaction || "love").emoji}</span></motion.div>}</AnimatePresence>
          </div>
        ) : (image || video) && (
          <div className="relative bg-muted/40 cursor-pointer overflow-hidden select-none rounded-xl border border-border" onDoubleClick={handleDoubleTap} onContextMenu={(e) => e.preventDefault()}>
            {image && <><!isImageLoaded && <div className="w-full h-80 shimmer" /><img src={image} alt="Post" className={cn("w-full object-cover max-h-[520px] transition-opacity duration-300 pointer-events-none", isImageLoaded ? "opacity-100" : "opacity-0 h-0")} loading="lazy" onLoad={() => setIsImageLoaded(true)} draggable={false} /></>}
            {video && <PrangonVideoPlayer src={video} className="w-full max-h-[520px]" compact />}
            <AnimatePresence>{showHeartAnimation && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-7xl drop-shadow-2xl">{getReactionMeta(myReaction || "love").emoji}</span></motion.div>}</AnimatePresence>
          </div>
        )}

        {likeCount > 0 && <div className="pt-3"><button onClick={() => setShowReactionBreakdown(true)} className="inline-flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 text-xs font-semibold hover:opacity-80 transition-opacity"><span className="flex -space-x-1">{Object.entries(reactionData?.counts || {}).filter(([_, c]) => (c as number) > 0).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 3).map(([key]) => <span key={key} className="text-sm leading-none">{getReactionMeta(key).emoji}</span>)}</span><span className="tabular-nums text-foreground/80">{likeCount}</span></button></div>}

        <div className="pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <ReactionTrayButton currentReaction={myReaction} count={likeCount} onReact={handleReact} disabled={toggleReaction.isPending} />
              <Button variant="ghost" size="sm" className="gap-1.5 h-9 px-2.5 rounded-full hover:bg-muted/60 transition-all" onClick={() => setShowComments(true)}><MessageCircle className="h-[22px] w-[22px]" strokeWidth={1.75} />{comments > 0 && <span className="text-[13px] font-semibold tabular-nums">{comments}</span>}</Button>
              <Button variant="ghost" size="sm" className="h-9 px-2.5 rounded-full hover:bg-muted/60 transition-all" onClick={handleShare}><Share2 className="h-[20px] w-[20px]" strokeWidth={1.75} /></Button>
            </div>
            <Button variant="ghost" size="sm" className="h-9 px-2.5 rounded-full hover:bg-muted/60 transition-all" onClick={() => { if (isSaved) unsavePost.mutate(id); else savePost.mutate(id); }} disabled={savePost.isPending || unsavePost.isPending}><Bookmark className={cn("h-[20px] w-[20px] transition-all", isSaved && "fill-primary text-primary")} strokeWidth={1.75} /></Button>
          </div>
        </div>
      </article>

      <CommentsDialog postId={id} open={showComments} onOpenChange={setShowComments} />
      <EditPostDialog postId={id} currentCaption={content} currentMediaUrl={image || video} currentMediaType={video ? "video" : image ? "image" : undefined} open={showEditDialog} onOpenChange={setShowEditDialog} />
      <ReactionBreakdownDialog postId={id} open={showReactionBreakdown} onOpenChange={setShowReactionBreakdown} counts={reactionData?.counts || {}} totalCount={reactionData?.totalCount || 0} />
    </>
  );
};
