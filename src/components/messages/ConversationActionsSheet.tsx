import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Pin, PinOff, Archive, ArchiveRestore, Heart, HeartOff, Lock, Unlock, BellOff, Bell, Trash2, MailOpen, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationFlags } from "@/hooks/useConversationFlags";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  flags: ConversationFlags;
  onUpdate: (patch: ConversationFlags) => void;
  onDeleteChat: () => void;
}

export const ConversationActionsSheet = ({
  open,
  onOpenChange,
  name,
  flags,
  onUpdate,
  onDeleteChat,
}: Props) => {
  const items = [
    {
      icon: flags.pinned ? PinOff : Pin,
      label: flags.pinned ? "Unpin" : "Pin to top",
      onClick: () => onUpdate({ pinned: !flags.pinned }),
    },
    {
      icon: flags.favourite ? HeartOff : Heart,
      label: flags.favourite ? "Remove from favourites" : "Add to favourites",
      onClick: () => onUpdate({ favourite: !flags.favourite }),
    },
    {
      icon: flags.markedUnread ? MailOpen : Mail,
      label: flags.markedUnread ? "Mark as read" : "Mark as unread",
      onClick: () => onUpdate({ markedUnread: !flags.markedUnread }),
    },
    {
      icon: flags.archived ? ArchiveRestore : Archive,
      label: flags.archived ? "Unarchive" : "Archive chat",
      onClick: () => onUpdate({ archived: !flags.archived }),
    },
    {
      icon: flags.locked ? Unlock : Lock,
      label: flags.locked ? "Unlock chat" : "Lock chat",
      onClick: () => onUpdate({ locked: !flags.locked }),
    },
    {
      icon: Trash2,
      label: "Delete chat",
      onClick: onDeleteChat,
      danger: true,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-0 pb-[max(env(safe-area-inset-bottom),16px)] border-0 bg-card"
      >
        <div className="px-5 pt-4 pb-2">
          <div className="mx-auto h-1 w-10 rounded-full bg-muted mb-3" />
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground">Chat options</p>
        </div>
        <div className="h-px bg-border" />
        <div className="py-2">
          {items.map((i) => (
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
