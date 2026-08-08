import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, X, Send, Music2, BellOff, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  NOTE_REACTIONS,
  useNoteReactions,
  useReactToNote,
  useToggleNoteMute,
  type UserNote,
} from "@/hooks/useNotes";
import { toast } from "sonner";

interface NoteViewModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  friend?: { id: string; display_name?: string; username?: string; avatar_url?: string } | null;
  note?: string;
  noteData?: UserNote | null;
  muted?: boolean;
  onReply: (friendId: string, message: string) => void;
}

export const NoteViewModal = ({
  open,
  onOpenChange,
  friend,
  note,
  noteData,
  muted = false,
  onReply,
}: NoteViewModalProps) => {
  const [reply, setReply] = useState("");
  const { user } = useAuth();
  const { data: reactions } = useNoteReactions(open ? noteData?.id : undefined);
  const react = useReactToNote();
  const toggleMute = useToggleNoteMute();

  const myReaction = reactions?.find((r) => r.user_id === user?.id)?.emoji ?? null;

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
  const content = noteData?.content ?? note;

  const send = () => {
    if (!reply.trim()) return;
    onReply(friend.id, reply.trim());
    onOpenChange(false);
  };

  const handleReact = async (emoji: string) => {
    if (!noteData?.id) return;
    try {
      await react.mutateAsync({ noteId: noteData.id, emoji: myReaction === emoji ? null : emoji });
    } catch {
      toast.error("Couldn't send reaction");
    }
  };

  const handleMute = async () => {
    try {
      await toggleMute.mutateAsync({ userId: friend.id, mute: !muted });
      toast.success(muted ? `Notes from ${name} unmuted` : `Notes from ${name} muted`);
      if (!muted) onOpenChange(false);
    } catch {
      toast.error("Couldn't update mute setting");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5 lg-scrim animate-fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="lg-sheet w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center -mt-2 mb-2">
          <button
            onClick={handleMute}
            className="h-8 px-3 rounded-full bg-muted text-[12px] font-medium text-muted-foreground inline-flex items-center gap-1.5 lg-press"
          >
            {muted ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground lg-press"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-5">
          <div className="relative mb-2 max-w-[240px]">
            <div className="lg-surface rounded-2xl rounded-bl-lg px-3.5 py-2 text-[13px] leading-snug text-center break-words">
              {noteData?.emoji && <span className="mr-1">{noteData.emoji}</span>}
              {content}
              {noteData?.music && (
                <span className="mt-1 flex items-center justify-center gap-1 text-[11px] text-primary">
                  <Music2 className="h-3 w-3" /> {noteData.music}
                </span>
              )}
            </div>
            <span className="lg-surface absolute -bottom-1.5 left-4 h-2.5 w-2.5 rounded-full" />
            <span className="lg-surface absolute -bottom-3.5 left-2 h-1.5 w-1.5 rounded-full" />
          </div>
          <Avatar className="h-16 w-16 ring-2 ring-primary/50 ring-offset-2 ring-offset-background mt-3">
            <AvatarImage src={friend.avatar_url || ""} />
            <AvatarFallback className="bg-muted">
              <UserRound className="h-7 w-7 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <span className="text-[15px] font-semibold mt-2">{name}</span>
          {friend.username && (
            <span className="text-[12px] text-muted-foreground">@{friend.username}</span>
          )}
        </div>

        {/* Reactions */}
        {noteData?.id && (
          <div className="lg-bar flex items-center justify-between gap-1 p-1.5 rounded-2xl mb-3">
            {NOTE_REACTIONS.map((e) => {
              const count = reactions?.filter((r) => r.emoji === e).length ?? 0;
              return (
                <button
                  key={e}
                  onClick={() => handleReact(e)}
                  className={cn(
                    "flex-1 h-9 rounded-xl text-[17px] leading-none lg-press flex items-center justify-center gap-1",
                    myReaction === e ? "bg-primary/12 ring-1 ring-primary/40" : "hover:bg-muted/60"
                  )}
                >
                  {e}
                  {count > 0 && (
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="lg-field flex-1 h-12 rounded-2xl flex items-center px-4">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              autoFocus
              placeholder={`Reply to ${name.split(" ")[0]}…`}
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <button
            onClick={send}
            disabled={!reply.trim()}
            className="lg-fab h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center disabled:opacity-50"
            aria-label="Send reply"
          >
            <Send className="h-5 w-5" strokeWidth={1.9} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
