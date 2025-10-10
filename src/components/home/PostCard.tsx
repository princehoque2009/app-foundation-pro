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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { data: likeData } = usePostLikes(id);
  const toggleLike = useToggleLike(id);
  
  const isLiked = likeData?.isLiked || false;

  // Get user ID from username
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
    toggleLike.mutate(isLiked);
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

  return (
    <Card className="border-border mb-4 hover-lift">
      <CardContent className="p-4">
        {/* Post Header */}
        <div className="flex items-center justify-between mb-3">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 -m-2 p-2 rounded-lg transition-colors flex-1"
            onClick={handleProfileClick}
          >
            <Avatar className="h-10 w-10 hover-scale ring-2 ring-primary/20">
              <AvatarImage src={author.avatar || undefined} alt={author.name} />
              <AvatarFallback>
                <UserCircle className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
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
          />
        </div>

        {/* Post Content */}
        {content && <p className="text-sm mb-3">{content}</p>}

        {/* Post Media */}
        {image && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img src={image} alt="Post" className="w-full object-cover max-h-96" />
          </div>
        )}
        {video && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <video src={video} controls className="w-full max-h-96" />
          </div>
        )}

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-8 px-2 ripple"
              onClick={handleLike}
              disabled={toggleLike.isPending}
            >
              <Heart
                className={`h-5 w-5 transition-all ${isLiked ? "fill-red-500 text-red-500 animate-like" : ""}`}
              />
              <span className="text-xs">{likes}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 h-8 px-2 ripple"
              onClick={() => setShowComments(true)}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs">{comments}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 ripple">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setIsSaved(!isSaved)}
          >
            <Bookmark className={`h-5 w-5 ${isSaved ? "fill-primary" : ""}`} />
          </Button>
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
