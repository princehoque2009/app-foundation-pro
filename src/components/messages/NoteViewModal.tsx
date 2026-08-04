import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, X, Send } from "lucide-react";

interface NoteViewModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  friend?: { id: string; display_name?: string; username?: string; avatar_url?: string } | null;
  note?: string;
  onReply: (friendId: string, message: string) => void;
}

export const NoteViewModal = ({ open, onOpenChange, friend, note, onReply }: NoteViewModalProps) => {
  const [reply, setReply] = useState("");

  useEffect(() => {
    if (open) setReply("");
  }, [open, friend?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || !friend) return null;

  const name = friend.display_name || friend.username || "Friend";

  const send = () => {
    if (!reply.trim()) return;
    onReply(friend.id, reply.trim());
    onOpenChange(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-background border border-border/60 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end -mt-2 -mr-2 mb-2">
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-2 max-w-[240px]">
            <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-[13px] leading-snug text-foreground text-center break-words">
              {note}
            </div>
            <span className="absolute -bottom-1 left-4 h-2.5 w-2.5 rounded-full bg-muted" />
            <span className="absolute -bottom-3 left-2 h-1.5 w-1.5 rounded-full bg-muted" />
          </div>
          <Avatar className="h-16 w-16 ring-2 ring-primary/60 ring-offset-2 ring-offset-background mt-2">
            <AvatarImage src={friend.avatar_url || ""} />
            <AvatarFallback className="bg-muted">
              <UserCircle className="h-8 w-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <span className="text-[15px] font-semibold mt-2">{name}</span>
          {friend.username && (
            <span className="text-[12px] text-muted-foreground">@{friend.username}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            autoFocus
            placeholder={`Reply to ${name.split(" ")[0]}…`}
            className="flex-1 h-12 rounded-2xl bg-muted/60 border border-border/60 px-4 text-sm outline-none focus:border-primary/60 transition-colors"
          />
          <button
            onClick={send}
            disabled={!reply.trim()}
            className="h-12 w-12 shrink-0 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-coral disabled:opacity-50"
            aria-label="Send reply"
          >
            <Send className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
