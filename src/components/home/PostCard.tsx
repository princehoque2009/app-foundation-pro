import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Share2, Bookmark, UserCircle } from "lucide-react";
import { useState } from "react";
import { useToggleLike, usePostLikes } from "@/hooks/usePostInteractions";
import { formatDistanceToNow } from "date-fns";
import { CommentsDialog } from "./CommentsDialog";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { GiftPrangsPostDialog } from "@/components/wallet/GiftPrangsPostDialog";
import { PrangsIcon } from "@/components/wallet/PrangsIcon";

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
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Fetch user roles for role badge
  const { data: userRoles } = useUserRoles({ userId: author.userId });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  const { data: likeData } = usePostLikes(id);
  const toggleLike = useToggleLike(id);
  const { savePost, unsavePost } = useSavedPosts();
  const { data: isSaved } = useIsPostSaved(id);
  
  const isLiked = likeData?.isLiked || false;

  const { data: userProfile } = useQuery({
    queryKey: ["user-by-username", author.username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", author.username)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const handleLike = () => {
    if (!isLiked) {
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
    toggleLike.mutate(isLiked);
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
  };

  const handleProfileClick = () => {
    if (userProfile?.id) {
      navigate(`/profile/${userProfile.id}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post on Prangon',
          text: content,
          url: postUrl,
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link copied",
        description: "Post link copied to clipboard",
      });
    }
  };

  return (
    <>
      <Card className="border-0 shadow-sm hover:shadow-md mb-4 overflow-hidden animate-fade-in transition-all duration-300 rounded-2xl bg-card">
        <CardContent className="p-0">
          {/* Post Header */}
          <div className="flex items-center justify-between p-4">
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={handleProfileClick}
            >
              <div className="relative">
                <div className="p-[2px] rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60">
                  <Avatar className="h-10 w-10 border-2 border-background transition-transform group-hover:scale-105">
                    <AvatarImage src={author.avatar || undefined} alt={author.name} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <UserCircle className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight flex items-center gap-1">
                    {author.name}
                    {author.isVerified && <VerifiedBadge size="sm" />}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground leading-tight">
                    {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                  </p>
                  {userRoles && userRoles.length > 0 && (
                    <UserRoleBadges roles={userRoles as any} size="sm" />
                  )}
                </div>
              </div>
            </div>
            <PostMenu 
              postId={id} 
              postUserId={userProfile?.id || ""} 
              onEdit={handleEdit}
              onDelete={handleDelete}
              onShare={handleShare}
            />
          </div>

          {/* Post Content - with content protection */}
          {content && (
            <p className="text-sm px-4 pb-3 leading-relaxed text-foreground select-none pointer-events-none">{content}</p>
          )}

          {/* Post Media - Multi-media carousel or single media */}
          {mediaItems && mediaItems.length > 0 ? (
            <div 
              className="relative bg-muted/50 cursor-pointer overflow-hidden select-none"
              onDoubleClick={handleDoubleTap}
              onContextMenu={(e) => e.preventDefault()}
            >
              <MediaCarousel 
                media={mediaItems} 
                onDoubleClick={handleDoubleTap}
              />
              
              {/* Double tap heart animation */}
              <AnimatePresence>
                {showHeartAnimation && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                  >
                    <Heart className="h-24 w-24 text-primary fill-primary drop-shadow-2xl" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (image || video) && (
            <div 
              className="relative bg-muted/50 cursor-pointer overflow-hidden select-none"
              onDoubleClick={handleDoubleTap}
              onContextMenu={(e) => e.preventDefault()}
            >
              {image && (
                <>
                  {!isImageLoaded && (
                    <div className="w-full h-80 shimmer" />
                  )}
                  <img 
                    src={image} 
                    alt="Post" 
                    className={cn(
                      "w-full object-cover max-h-[500px] transition-opacity duration-300 pointer-events-none",
                      isImageLoaded ? "opacity-100" : "opacity-0 h-0"
                    )}
                    loading="lazy"
                    onLoad={() => setIsImageLoaded(true)}
                    draggable={false}
                  />
                </>
              )}
              {video && (
                <video 
                  src={video} 
                  controls 
                  className="w-full max-h-[500px]"
                  preload="metadata"
                  controlsList="nodownload"
                />
              )}
              
              {/* Double tap heart animation */}
              <AnimatePresence>
                {showHeartAnimation && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <Heart className="h-24 w-24 text-primary fill-primary drop-shadow-2xl" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Post Actions */}
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-10 px-3 rounded-full hover:bg-primary/10 transition-all"
                  onClick={handleLike}
                  disabled={toggleLike.isPending}
                >
                  <Heart
                    className={cn(
                      "h-6 w-6 transition-all",
                      isLiked && "fill-primary text-primary animate-like"
                    )}
                  />
                  <span className={cn(
                    "text-sm font-semibold tabular-nums",
                    isLiked && "text-primary"
                  )}>
                    {likes}
                  </span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1.5 h-10 px-3 rounded-full hover:bg-primary/10 transition-all"
                  onClick={() => setShowComments(true)}
                >
                  <MessageCircle className="h-6 w-6" />
                  <span className="text-sm font-semibold tabular-nums">{comments}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-10 px-3 rounded-full hover:bg-primary/10 transition-all"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 rounded-full hover:bg-primary/10 transition-all"
                  onClick={() => setShowGiftDialog(true)}
                  title="Gift Prangs"
                >
                  <PrangsIcon size="xs" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 rounded-full hover:bg-primary/10 transition-all"
                  onClick={() => {
                    if (isSaved) {
                      unsavePost.mutate(id);
                    } else {
                      savePost.mutate(id);
                    }
                  }}
                  disabled={savePost.isPending || unsavePost.isPending}
                >
                  <Bookmark className={cn(
                    "h-5 w-5 transition-all",
                    isSaved && "fill-primary text-primary"
                  )} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <CommentsDialog 
        postId={id} 
        open={showComments} 
        onOpenChange={setShowComments} 
      />

      <EditPostDialog
        postId={id}
        currentCaption={content}
        currentMediaUrl={image || video}
        currentMediaType={video ? "video" : image ? "image" : undefined}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <GiftPrangsPostDialog
        open={showGiftDialog}
        onOpenChange={setShowGiftDialog}
        recipientId={author.userId || userProfile?.id || ""}
        recipientName={author.name}
      />
    </>
  );
};
