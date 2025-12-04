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
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PostCardProps {
  id: string;
  author: {
    name: string;
    avatar?: string;
    username: string;
  };
  content: string;
  image?: string;
  video?: string;
  likes: number;
  comments: number;
  timestamp: string;
}

export const PostCard = ({ id, author, content, image, video, likes, comments, timestamp }: PostCardProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { data: likeData } = usePostLikes(id);
  const toggleLike = useToggleLike(id);
  
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
    toast({
      title: "Edit feature",
      description: "Post editing will be available soon!",
    });
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
    <Card className="border-0 shadow-sm mb-4 overflow-hidden animate-fade-in hover-lift">
      <CardContent className="p-0">
        {/* Post Header */}
        <div className="flex items-center justify-between p-4">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={handleProfileClick}
          >
            <Avatar className="h-10 w-10 ring-2 ring-primary/20 hover-scale">
              <AvatarImage src={author.avatar || undefined} alt={author.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <UserCircle className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm hover:text-primary transition-colors">{author.name}</p>
              <p className="text-xs text-muted-foreground">
                @{author.username} · {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
              </p>
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

        {/* Post Content */}
        {content && <p className="text-sm px-4 pb-3">{content}</p>}

        {/* Post Media */}
        {(image || video) && (
          <div 
            className="relative bg-muted cursor-pointer"
            onDoubleClick={handleDoubleTap}
          >
            {image && (
              <img 
                src={image} 
                alt="Post" 
                className="w-full object-cover max-h-[500px]" 
                loading="lazy"
              />
            )}
            {video && (
              <video 
                src={video} 
                controls 
                className="w-full max-h-[500px]"
                preload="metadata"
              />
            )}
            
            {/* Double tap heart animation */}
            {showHeartAnimation && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Heart className="h-24 w-24 text-white fill-white drop-shadow-lg animate-like" />
              </motion.div>
            )}
          </div>
        )}

        {/* Post Actions */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 h-9 px-3 rounded-full hover:bg-primary/10"
                onClick={handleLike}
                disabled={toggleLike.isPending}
              >
                <Heart
                  className={cn(
                    "h-6 w-6 transition-all",
                    isLiked && "fill-primary text-primary animate-like"
                  )}
                />
                <span className="text-sm font-medium">{likes}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 h-9 px-3 rounded-full hover:bg-primary/10"
                onClick={() => setShowComments(true)}
              >
                <MessageCircle className="h-6 w-6" />
                <span className="text-sm font-medium">{comments}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 px-3 rounded-full hover:bg-primary/10"
                onClick={handleShare}
              >
                <Share2 className="h-6 w-6" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-full hover:bg-primary/10"
              onClick={() => setIsSaved(!isSaved)}
            >
              <Bookmark className={cn("h-6 w-6 transition-all", isSaved && "fill-foreground")} />
            </Button>
          </div>
        </div>
        
        <CommentsDialog 
          postId={id} 
          open={showComments} 
          onOpenChange={setShowComments} 
        />
      </CardContent>
    </Card>
  );
};
