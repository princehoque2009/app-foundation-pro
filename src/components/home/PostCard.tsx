import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { MessageCircle, Share2, Bookmark } from "lucide-react";

interface PostCardProps {
  id: string;
  author: { name: string; avatar?: string; username: string; isVerified?: boolean; userId?: string; profileTheme?: string | null; };
  content: string; image?: string; video?: string; mediaItems?: PostMedia[]; likes: number; comments: number; timestamp: string;
}

export const PostCard = ({ id, author, content, image, video, mediaItems, likes, comments, timestamp }: PostCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showReactionBreakdown, setShowReactionBreakdown] = useState(false);
  const navigate = useNavigate(); const queryClient = useQueryClient();
  const { data: userRoles } = useUserRoles({ userId: author.userId });
  const { effects: authorEffects } = useActiveEffects(author.userId);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const { data: reactionData } = usePostReactions(id);
  const toggleReaction = useToggleReaction(id);
  const { savePost, unsavePost } = useSavedPosts();
  const { data: isSaved } = useIsPostSaved(id);
  const recordView = useRecordPostView();
  useEffect(() => { recordView.mutate(id); }, [id]);
  const isLiked = !!reactionData?.myReaction; const myReaction = (reactionData?.myReaction as any) || null;
  const theme = (author.profileTheme as any) || 'default';
  const isGold = author.isVerified && theme === 'yellow';
  const isPlatinum = author.isVerified && theme === 'mono';
  const handleReact = (key: any) => { if (key && !myReaction) { setShowHeartAnimation(true); setTimeout(() => setShowHeartAnimation(false), 800); } toggleReaction.mutate({ reaction: key, currentReaction: myReaction }); };
  const handleDoubleTap = () => { if (!isLiked) { setShowHeartAnimation(true); setTimeout(() => setShowHeartAnimation(false), 800); toggleReaction.mutate({ reaction: "love" as any, currentReaction: myReaction }); } };
  const handleProfileClick = () => { if (author.userId) navigate(`/profile/${author.userId}`); };
  const handleDelete = async () => { if (!confirm("Are you sure you want to delete this post?")) return; try { const { error } = await supabase.from("posts").delete().eq("id", id); if (error) throw error; queryClient.invalidateQueries({ queryKey: ["posts"] }); queryClient.invalidateQueries({ queryKey: ["user-posts"] }); toast({ title: "Post deleted" }); } catch { toast({ title: "Error", variant: "destructive" }); } };
  const handleEdit = () => setShowEditDialog(true);
  const handleShare = async () => { const postUrl = `${window.location.origin}/post/${id}`; if (navigator.share) { try { await navigator.share({ title: 'Check out this post on Prangon', text: content, url: postUrl }); } catch {} } else { await navigator.clipboard.writeText(postUrl); toast({ title: "Link copied" }); } };
  const likeCount = reactionData?.totalCount || likes;
  return (
    <>
      <article className={cn(
        "group relative mb-5 rounded-[28px] border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-[1px] animate-fade-in overflow-hidden",
        !isGold && !isPlatinum && "border-border/60 hover:border-border/80",
        isGold && "border-amber-200/60 dark:border-amber-800/30 bg-card hover:border-amber-300/50",
        isPlatinum && "border-zinc-300/50 dark:border-zinc-700/50 bg-card hover:border-zinc-400/50"
      )}>
        <div className="flex items-center gap-3 p-4 pb-3">
          <div className="flex items-center gap-3 cursor-pointer group/avatar min-w-0 flex-1" onClick={handleProfileClick}>
            <div className="relative">
              <Avatar className={cn(
                "h-11 w-11 shrink-0 ring-1 transition-all duration-200 group-hover/avatar:scale-[1.03]",
                !isGold && !isPlatinum && "ring-border/50 group-hover/avatar:ring-border",
                isGold && "ring-2 ring-amber-400",
                isPlatinum && "ring-2 ring-zinc-300 dark:ring-zinc-600"
              )}>
                <AvatarImage src={author.avatar || undefined} alt={author.name} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground"><span className="text-xs font-medium">?</span></AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn(
                  "font-semibold text-[14.5px] leading-tight truncate transition-colors tracking-tight",
                  authorEffects.hasRainbowName ? "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent" : "",
                  !isGold && !isPlatinum && !authorEffects.hasRainbowName && "text-foreground",
                  isGold && "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 bg-clip-text text-transparent",
                  isPlatinum && "bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-300 dark:from-zinc-200 dark:via-white dark:to-zinc-400 bg-clip-text text-transparent"
                )}>{author.name}</span>
                {author.isVerified && <VerifiedBadge size="sm" />}
                {userRoles && userRoles.length > 0 && <UserRoleBadges roles={userRoles as any} size="sm" />}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <span className="truncate max-w-[110px]">@{author.username}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/40" />
                <span className="text-[11.5px]">{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          <PostMenu postId={id} postUserId={author.userId || ""} mediaUrl={image || video} mediaType={video ? "video" : "image"} onEdit={handleEdit} onDelete={handleDelete} onShare={handleShare} />
        </div>
        {content && <div className="px-4 pb-3"><p className="text-[15px] leading-[1.55] text-foreground/90 tracking-[-0.01em] whitespace-pre-wrap break-words"><RenderMentions text={content} /></p></div>}
        {mediaItems && mediaItems.length > 0 ? (
          <div className="relative bg-muted/30 cursor-pointer overflow-hidden select-none border-y border-border/40" onDoubleClick={handleDoubleTap} onContextMenu={(e) => e.preventDefault()}>
            <MediaCarousel media={mediaItems} onDoubleClick={handleDoubleTap} />
            <AnimatePresence>{showHeartAnimation && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"><span className="text-7xl drop-shadow-2xl">{getReactionMeta(myReaction || "love").emoji}</span></motion.div>}</AnimatePresence>
          </div>
        ) : (image || video) && (
          <div className="relative bg-muted/30 cursor-pointer overflow-hidden select-none border-y border-border/40" onDoubleClick={handleDoubleTap} onContextMenu={(e) => e.preventDefault()}>
            {image && <img src={image} alt="Post" className={cn("w-full object-cover max-h-[560px]", isImageLoaded ? "opacity-100" : "opacity-0 h-0")} loading="lazy" onLoad={() => setIsImageLoaded(true)} draggable={false} />}
            {video && <PrangonVideoPlayer src={video} className="w-full max-h-[560px]" compact />}
          </div>
        )}
        {likeCount > 0 && <div className="px-4 pt-3"><button onClick={() => setShowReactionBreakdown(true)} className="reaction-pill lg-press"><span className="flex -space-x-1">{Object.entries(reactionData?.counts || {}).filter(([_, c]) => (c as number) > 0).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 3).map(([key]) => <span key={key} className="text-[14px] leading-none">{getReactionMeta(key).emoji}</span>)}</span><span className="tabular-nums text-foreground/80">{likeCount}</span></button></div>}
        <div className="p-2.5 pt-3"><div className="flex items-center justify-between"><div className="flex items-center gap-1"><ReactionTrayButton currentReaction={myReaction} count={likeCount} onReact={handleReact} disabled={toggleReaction.isPending} /><Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full px-3 text-muted-foreground hover:text-foreground hover:bg-muted/80" onClick={() => setShowComments(true)}><MessageCircle className="h-[20px] w-[20px]" strokeWidth={1.75} />{comments > 0 && <span className="text-[13px] font-semibold tabular-nums">{comments}</span>}</Button><Button variant="ghost" size="sm" className="h-9 rounded-full px-3 text-muted-foreground hover:text-foreground hover:bg-muted/80" onClick={handleShare}><Share2 className="h-[19px] w-[19px]" strokeWidth={1.75} /></Button></div><Button variant="ghost" size="sm" className="h-9 w-9 rounded-full hover:bg-muted/80" onClick={() => { if (isSaved) unsavePost.mutate(id); else savePost.mutate(id); }}><Bookmark className={cn("h-[19px] w-[19px]", isSaved ? "fill-primary text-primary" : "text-muted-foreground")} strokeWidth={isSaved ? 2 : 1.75} /></Button></div></div>
      </article>
      <CommentsDialog postId={id} open={showComments} onOpenChange={setShowComments} />
      <EditPostDialog postId={id} currentCaption={content} currentMediaUrl={image || video} currentMediaType={video ? "video" : image ? "image" : undefined} open={showEditDialog} onOpenChange={setShowEditDialog} />
      <ReactionBreakdownDialog postId={id} open={showReactionBreakdown} onOpenChange={setShowReactionBreakdown} counts={reactionData?.counts || {}} totalCount={reactionData?.totalCount || 0} />
    </>
  );
};
