import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Heart, MessageCircle, Share2, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface CircleFeedPostProps {
  post: any;
  circle: any;
  userId?: string;
  isAdmin: boolean;
  onDelete: (postId: string) => void;
}

export const CircleFeedPost = ({ post, circle, userId, isAdmin, onDelete }: CircleFeedPostProps) => {
  const canDelete = isAdmin || post.user_id === userId;
  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : "";

  return (
    <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3 pb-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={circle.logo_url} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {circle.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{circle.name}</p>
          <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
        </div>
        {canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-full hover:bg-muted/60 transition-colors">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <div className="px-3 pb-2">
        <p className="text-sm text-foreground leading-relaxed">{post.caption}</p>
      </div>

      {post.media_url && (
        <div className="px-3 pb-2">
          <img src={post.media_url} className="w-full rounded-xl object-cover max-h-80" alt="" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 pb-3 pt-1 border-t border-border/30 mx-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground text-xs">
          <Heart className="h-4 w-4" /> Like
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground text-xs">
          <MessageCircle className="h-4 w-4" /> Comment
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground text-xs">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
    </div>
  );
};
