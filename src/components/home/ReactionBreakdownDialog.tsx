import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { REACTION_TYPES, getEmojiForReaction, useReactionUsers } from "@/hooks/usePostReactions";
import { cn } from "@/lib/utils";

interface ReactionBreakdownDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: Record<string, number>;
  totalCount: number;
}

export const ReactionBreakdownDialog = ({
  postId,
  open,
  onOpenChange,
  counts,
  totalCount,
}: ReactionBreakdownDialogProps) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const navigate = useNavigate();
  const { data: users, isLoading } = useReactionUsers(postId, activeTab);

  const tabs = [
    { key: null, label: "All", count: totalCount },
    ...REACTION_TYPES
      .filter(r => (counts[r.key] || 0) > 0)
      .map(r => ({ key: r.key, label: r.emoji, count: counts[r.key] || 0 })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base font-semibold">Reactions</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.key ?? "all"}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <span>{tab.label}</span>
              <span className="text-xs tabular-nums">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* User list */}
        <ScrollArea className="max-h-80 px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {users?.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/profile/${entry.user_id}`);
                  }}
                  className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={entry.profile.avatar_url || ""} />
                    <AvatarFallback className="bg-muted">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {entry.profile.display_name || entry.profile.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{entry.profile.username}
                    </p>
                  </div>
                  <span className="text-lg">{getEmojiForReaction(entry.reaction)}</span>
                </button>
              ))}
              {(!users || users.length === 0) && (
                <p className="text-center text-sm text-muted-foreground py-6">No reactions yet</p>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
