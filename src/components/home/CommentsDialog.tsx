import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePostComments, useCreateComment, useToggleCommentReaction, useCommentReactions, useUpdateComment, useDeleteComment, usePinComment } from "@/hooks/usePostInteractions";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Loader2, Heart, Reply, ChevronDown, ChevronUp, UserCircle, X, MoreHorizontal, Edit2, Trash2, Pin, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

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
  postOwnerId?: string;
  pinnedCommentIds?: string[];
}

const CommentItem = ({ comment, onReply, replies, level = 0, postOwnerId, pinnedCommentIds = [] }: CommentItemProps) => {
  const [showReplies, setShowReplies] = useState(level === 0 && replies.length > 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const navigate = useNavigate();
  const { user } = useAuth();
  const toggleReaction = useToggleCommentReaction(comment.id);
  const { data: reactionData } = useCommentReactions(comment.id);
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const pinComment = usePinComment();

  const isOwner = user?.id === comment.user_id;
  const isPostOwner = user?.id === postOwnerId;
  const isPinned = pinnedCommentIds.includes(comment.id);
  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;

  const handleProfileClick = () => {
    navigate(`/profile/${comment.user_id}`);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    updateComment.mutate(
      { commentId: comment.id, content: editContent.trim(), postId: comment.post_id },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteComment.mutate({ commentId: comment.id, postId: comment.post_id });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative",
        level > 0 && "ml-10 pl-4 border-l-2 border-border/50"
      )}
    >
      {/* Pinned indicator */}
      {isPinned && level === 0 && (
        <div className="flex items-center gap-1 text-xs text-primary mb-2">
          <Pin className="h-3 w-3" />
          <span className="font-medium">Pinned</span>
        </div>
      )}

      <div className="flex gap-3 group">
        <Avatar 
          className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" 
          onClick={handleProfileClick}
        >
          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {comment.profiles?.username?.charAt(0).toUpperCase() || <UserCircle className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="rounded-xl bg-muted/50 border-0"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  className="h-7 px-3 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updateComment.isPending}
                  className="h-7 px-3 text-xs"
                >
                  {updateComment.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-muted/40 rounded-2xl px-4 py-2.5 inline-block max-w-full">
                <div className="flex items-center gap-2">
                  <span 
                    className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                    onClick={handleProfileClick}
                  >
                    {comment.profiles?.display_name || comment.profiles?.username}
                  </span>
                  {isEdited && (
                    <span className="text-[10px] text-muted-foreground">(edited)</span>
                  )}
                </div>
                <p className="text-sm mt-0.5 break-words whitespace-pre-wrap">{comment.content}</p>
              </div>
              
              {/* Actions Row */}
              <div className="flex items-center gap-4 mt-1.5 ml-1">
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: false })}
                </span>
                <button
                  onClick={() => toggleReaction.mutate(reactionData?.hasReacted || false)}
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium transition-colors",
                    reactionData?.hasReacted ? "text-primary" : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", reactionData?.hasReacted && "fill-primary")} />
                  {reactionData?.count ? reactionData.count : null}
                </button>
                <button
                  onClick={() => onReply(comment)}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Reply
                </button>
                
                {/* Comment Menu */}
                {(isOwner || isPostOwner) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded-full hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      {isOwner && (
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {isPostOwner && level === 0 && (
                        <DropdownMenuItem 
                          onClick={() => pinComment.mutate({ 
                            postId: comment.post_id, 
                            commentId: comment.id, 
                            isPinned 
                          })}
                        >
                          <Pin className="h-4 w-4 mr-2" />
                          {isPinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                      )}
                      {(isOwner || isPostOwner) && (
                        <DropdownMenuItem 
                          onClick={handleDelete}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </>
          )}

          {/* Show/Hide Replies */}
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1.5 text-xs text-primary mt-2 font-medium hover:underline"
            >
              {showReplies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showReplies ? 'Hide' : 'View'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}

          {/* Nested Replies */}
          <AnimatePresence>
            {showReplies && replies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-3"
              >
                {replies.map((reply) => (
                  <CommentItem 
                    key={reply.id} 
                    comment={reply} 
                    onReply={onReply}
                    replies={[]}
                    level={level + 1}
                    postOwnerId={postOwnerId}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export const CommentsDialog = ({ postId, open, onOpenChange }: CommentsDialogProps) => {
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const { data: comments, isLoading } = usePostComments(postId);
  const createComment = useCreateComment();
  const { user } = useAuth();

  // TODO: Fetch post owner ID and pinned comments from post data
  const postOwnerId = user?.id; // This should come from the post
  const pinnedCommentIds: string[] = []; // This should come from the post

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

  // Organize comments into threads with pinned first
  const allComments = comments || [];
  const topLevelComments = allComments.filter((c: any) => !c.parent_id);
  const getReplies = (parentId: string) => 
    allComments.filter((c: any) => c.parent_id === parentId);

  // Sort: pinned first, then by date
  const sortedTopLevel = [...topLevelComments].sort((a, b) => {
    const aIsPinned = pinnedCommentIds.includes(a.id);
    const bIsPinned = pinnedCommentIds.includes(b.id);
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-center font-semibold">Comments</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
              </div>
            </div>
          ) : sortedTopLevel.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Reply className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No comments yet</p>
              <p className="text-muted-foreground text-sm mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTopLevel.map((comment: any) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={(c) => {
                    setReplyingTo(c);
                    setComment(`@${c.profiles?.username} `);
                  }}
                  replies={getReplies(comment.id)}
                  postOwnerId={postOwnerId}
                  pinnedCommentIds={pinnedCommentIds}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Reply indicator */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-muted/50 border-t border-border flex items-center justify-between"
            >
              <span className="text-xs text-muted-foreground">
                Replying to <span className="font-semibold text-foreground">@{replyingTo.profiles?.username}</span>
              </span>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setComment("");
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-border shrink-0 bg-card">
          <Input
            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={createComment.isPending}
            className="rounded-full bg-muted/50 border-0 h-11 focus-visible:ring-1 focus-visible:ring-primary"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={createComment.isPending || !comment.trim()}
            className="rounded-full h-11 w-11 shrink-0"
          >
            {createComment.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
