import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, X, Trash2 } from "lucide-react";
import { NOTE_MAX_LENGTH, useSaveNote, useDeleteNote } from "@/hooks/useNotes";
import { toast } from "sonner";

interface NoteComposerModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  avatarUrl?: string | null;
  name?: string;
  existingNote?: string | null;
}

export const NoteComposerModal = ({
  open,
  onOpenChange,
  avatarUrl,
  name,
  existingNote,
}: NoteComposerModalProps) => {
  const [text, setText] = useState("");
  const saveNote = useSaveNote();
  const deleteNote = useDeleteNote();

  useEffect(() => {
    if (open) setText(existingNote || "");
  }, [open, existingNote]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleShare = async () => {
    if (!text.trim()) return;
    try {
      await saveNote.mutateAsync(text);
      toast.success("Note shared");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't share your note");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNote.mutateAsync();
      toast.success("Note removed");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't remove note");
    }
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold tracking-tight">
            {existingNote ? "Edit note" : "New note"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live preview */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-2 max-w-[220px]">
            <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-[13px] leading-snug text-foreground text-center break-words">
              {text.trim() || "Share what you're up to…"}
            </div>
            <span className="absolute -bottom-1 left-4 h-2.5 w-2.5 rounded-full bg-muted" />
            <span className="absolute -bottom-3 left-2 h-1.5 w-1.5 rounded-full bg-muted" />
          </div>
          <Avatar className="h-16 w-16 ring-2 ring-primary/60 ring-offset-2 ring-offset-background mt-2">
            <AvatarImage src={avatarUrl || ""} />
            <AvatarFallback className="bg-muted">
              <UserCircle className="h-8 w-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <span className="text-[12px] text-muted-foreground mt-1.5">{name || "You"}</span>
        </div>

        <div className="relative mb-5">
          <textarea
            value={text}
            maxLength={NOTE_MAX_LENGTH}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            autoFocus
            placeholder="What's on your mind?"
            className="w-full resize-none rounded-2xl bg-muted/60 border border-border/60 px-4 py-3 text-sm outline-none focus:border-primary/60 transition-colors"
          />
          <span className="absolute bottom-2.5 right-3 text-[11px] text-muted-foreground tabular-nums">
            {text.length}/{NOTE_MAX_LENGTH}
          </span>
        </div>

        <button
          onClick={handleShare}
          disabled={!text.trim() || saveNote.isPending}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] shadow-coral disabled:opacity-50 transition-opacity"
        >
          {saveNote.isPending ? "Sharing…" : "Share Note"}
        </button>

        {existingNote && (
          <button
            onClick={handleDelete}
            disabled={deleteNote.isPending}
            className="w-full h-11 mt-2 rounded-2xl text-destructive font-medium text-sm inline-flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Remove note
          </button>
        )}

        <p className="text-[11px] text-muted-foreground text-center mt-3">
          Notes disappear after 24 hours
        </p>
      </div>
    </div>,
    document.body
  );
};
