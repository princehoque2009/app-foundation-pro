import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePostComments, useCreateComment, useToggleCommentReaction, useCommentReactions } from "@/hooks/usePostInteractions";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Loader2, Heart, Reply, ChevronDown, ChevronUp, UserCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface CommentsDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommentItemProps {
  comment: any;
  onReply: (comment: any) => void;
  replies: any[];
  level?: number;
}

const CommentItem = ({ comment, onReply, replies, level = 0 }: CommentItemProps) => {
  const [showReplies, setShowReplies] = useState(false);
  const navigate = useNavigate();
  const toggleReaction = useToggleCommentReaction(comment.id);
  const { data: reactionData } = useCommentReactions(comment.id);

  const handleProfileClick = () => {
    navigate(`/profile/${comment.user_id}`);
  };

  return (
    <div className={cn("animate-slide-up", level > 0 && "ml-8 pl-4 border-l-2 border-border")}>
      <div className="flex gap-3 group">
        <Avatar 
          className="h-8 w-8 cursor-pointer hover-scale flex-shrink-0" 
          onClick={handleProfileClick}
        >
          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {comment.profiles?.username?.charAt(0).toUpperCase() || <UserCircle className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted/50 rounded-2xl px-4 py-2">
            <div className="flex items-center gap-2">
              <span 
                className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                onClick={handleProfileClick}
              >
                {comment.profiles?.display_name || comment.profiles?.username}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm mt-1 break-words">{comment.content}</p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-4 mt-1 ml-2">
            <button
              onClick={() => toggleReaction.mutate(reactionData?.hasReacted || false)}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                reactionData?.hasReacted ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
              )}
            >
              <Heart className={cn("h-3 w-3", reactionData?.hasReacted && "fill-primary animate-like")} />
              {reactionData?.count ? reactionData.count : 'Like'}
            </button>
            <button
              onClick={() => onReply(comment)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          </div>

          {/* Show/Hide Replies */}
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-xs text-primary mt-2 ml-2 font-medium"
            >
              {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showReplies ? 'Hide' : 'View'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}

          {/* Nested Replies */}
          {showReplies && replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {replies.map((reply) => (
                <CommentItem 
                  key={reply.id} 
                  comment={reply} 
                  onReply={onReply}
                  replies={[]}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommentsDialog = ({ postId, open, onOpenChange }: CommentsDialogProps) => {
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const { data: comments, isLoading } = usePostComments(postId);
  const createComment = useCreateComment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    createComment.mutate(
      { 
        postId, 
        content: comment,
        parentId: replyingTo?.id
      },
      {
        onSuccess: () => {
          setComment("");
          setReplyingTo(null);
        },
      }
    );
  };

  const handleReply = (commentToReply: any) => {
    setReplyingTo(commentToReply);
    setComment(`@${commentToReply.profiles?.username} `);
  };

  // Organize comments into threads
  const topLevelComments = comments?.filter((c: any) => !c.parent_id) || [];
  const getReplies = (parentId: string) => 
    comments?.filter((c: any) => c.parent_id === parentId) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-center font-semibold">Comments</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
              </div>
            </div>
          ) : topLevelComments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No comments yet</p>
              <p className="text-muted-foreground text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topLevelComments.map((comment: any) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  replies={getReplies(comment.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Replying to <span className="font-semibold text-foreground">@{replyingTo.profiles?.username}</span>
            </span>
            <button
              onClick={() => {
                setReplyingTo(null);
                setComment("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
          <Input
            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={createComment.isPending}
            className="rounded-full bg-muted/50 border-0"
          />
          <Button 
            type="submit" 
            disabled={createComment.isPending || !comment.trim()}
            size="sm"
            className="rounded-full px-6"
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Post"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
