import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { useToggleLike, usePostLikes } from "@/hooks/usePostInteractions";
import { formatDistanceToNow } from "date-fns";
import { useState, useRef, useEffect } from "react";
import { CommentsDialog } from "../home/CommentsDialog";

interface ReelCardProps {
  id: string;
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
}

export const ReelCard = ({
  id,
  author,
  caption,
  videoUrl,
  likes,
  comments,
  timestamp,
  isInView,
}: ReelCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { data: likeData } = usePostLikes(id);
  const toggleLike = useToggleLike(id);
  
  const isLiked = likeData?.isLiked || false;

  useEffect(() => {
    if (videoRef.current) {
      if (isInView) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isInView]);

  const handleLike = () => {
    toggleLike.mutate(isLiked);
  };

  return (
    <div className="relative h-screen w-full snap-start snap-always">
      <video
        ref={videoRef}
        src={videoUrl}
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Author info */}
      <div className="absolute bottom-20 left-4 right-20 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{author.name}</p>
            <p className="text-xs opacity-90">@{author.username}</p>
          </div>
        </div>
        {caption && <p className="text-sm mb-2">{caption}</p>}
        <p className="text-xs opacity-75">
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
        </p>
      </div>

      {/* Actions */}
      <div className="absolute bottom-20 right-4 flex flex-col gap-4">
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white"
            onClick={handleLike}
            disabled={toggleLike.isPending}
          >
            <Heart
              className={`h-6 w-6 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
            />
          </Button>
          <span className="text-xs text-white font-semibold mt-1">{likes}</span>
        </div>

        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white"
            onClick={() => setShowComments(true)}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          <span className="text-xs text-white font-semibold mt-1">{comments}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white"
        >
          <Share2 className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white"
          onClick={() => setIsSaved(!isSaved)}
        >
          <Bookmark className={`h-6 w-6 ${isSaved ? "fill-white" : ""}`} />
        </Button>
      </div>

      <CommentsDialog 
        postId={id} 
        open={showComments} 
        onOpenChange={setShowComments} 
      />
    </div>
  );
};
