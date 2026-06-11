import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Reply, Forward, Pin, PinOff, Copy, Trash2, Flag, Star, StarOff } from "lucide-react";
import type { ChatMessage } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  message: ChatMessage | null;
  isOwn: boolean;
  isPinned: boolean;
  isStarred?: boolean;
  quickReactions: string[];
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onReport: () => void;
  onReact: (emoji: string) => void;
  onToggleStar?: () => void;
}

export const MessageActionsSheet = ({
  open,
  onOpenChange,
  message,
  isOwn,
  isPinned,
  isStarred,
  quickReactions,
  onReply,
  onForward,
  onPin,
  onCopy,
  onDelete,
  onReport,
  onReact,
  onToggleStar,
}: Props) => {
  if (!message) return null;

  const items = [
    { icon: Reply, label: "Reply", onClick: onReply, show: true },
    { icon: Forward, label: "Forward", onClick: onForward, show: true },
    { icon: isStarred ? StarOff : Star, label: isStarred ? "Unstar" : "Star", onClick: onToggleStar || (() => {}), show: !!onToggleStar },
    { icon: isPinned ? PinOff : Pin, label: isPinned ? "Unpin" : "Pin", onClick: onPin, show: true },
    { icon: Copy, label: "Copy", onClick: onCopy, show: !!message.content },
    { icon: Trash2, label: "Delete", onClick: onDelete, show: isOwn, danger: true },
    { icon: Flag, label: "Report", onClick: onReport, show: !isOwn, danger: true },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-0 pb-[max(env(safe-area-inset-bottom),16px)] max-h-[80vh] border-0 bg-card"
      >
        {/* Quick reactions row */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-1 overflow-x-auto">
          {quickReactions.map((e) => (
            <button
              key={e}
              onClick={() => {
                onReact(e);
                onOpenChange(false);
              }}
              className="text-2xl p-2 rounded-full hover:bg-muted active:scale-90 transition"
            >
              {e}
            </button>
          ))}
        </div>

        <div className="h-px bg-border" />

        {/* Action list */}
        <div className="py-2">
          {items
            .filter((i) => i.show)
            .map((i) => (
              <button
                key={i.label}
                onClick={() => {
                  i.onClick();
                  onOpenChange(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/60 transition",
                  i.danger && "text-destructive"
                )}
              >
                <i.icon className="h-5 w-5" />
                <span className="text-[15px] font-medium">{i.label}</span>
              </button>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
