import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { useState } from "react";
import { useToggleLike, usePostLikes } from "@/hooks/usePostInteractions";
import { formatDistanceToNow } from "date-fns";
import { CommentsDialog } from "./CommentsDialog";

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
  
  const { data: likeData } = usePostLikes(id);
  const toggleLike = useToggleLike(id);
  
  const isLiked = likeData?.isLiked || false;

  const handleLike = () => {
    toggleLike.mutate(isLiked);
  };

  return (
    <Card className="border-border mb-4">
      <CardContent className="p-4">
        {/* Post Header */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={author.avatar || undefined} alt={author.name} />
            <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm">{author.name}</p>
            <p className="text-xs text-muted-foreground">
              @{author.username} · {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
            </p>
          </div>
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
              className="gap-2 h-8 px-2"
              onClick={handleLike}
              disabled={toggleLike.isPending}
            >
              <Heart
                className={`h-5 w-5 transition-colors ${isLiked ? "fill-red-500 text-red-500" : ""}`}
              />
              <span className="text-xs">{likes}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 h-8 px-2"
              onClick={() => setShowComments(true)}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs">{comments}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2">
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
