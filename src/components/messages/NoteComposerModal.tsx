import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, X, Trash2, Music2, Smile, Globe2, Users } from "lucide-react";
import {
  NOTE_MAX_LENGTH,
  useSaveNote,
  useDeleteNote,
  type UserNote,
  type NoteAudience,
} from "@/hooks/useNotes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["😀", "🥹", "🔥", "🎧", "☕", "💻", "🌙", "🎬", "🏃", "❤️"];

interface NoteComposerModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  avatarUrl?: string | null;
  name?: string;
  existingNote?: string | null;
  existing?: UserNote | null;
}

export const NoteComposerModal = ({
  open,
  onOpenChange,
  avatarUrl,
  name,
  existingNote,
  existing,
}: NoteComposerModalProps) => {
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [music, setMusic] = useState("");
  const [showMusic, setShowMusic] = useState(false);
  const [audience, setAudience] = useState<NoteAudience>("followers");
  const saveNote = useSaveNote();
  const deleteNote = useDeleteNote();
  const hasExisting = !!(existing || existingNote);

  useEffect(() => {
    if (!open) return;
    setText(existing?.content ?? existingNote ?? "");
    setEmoji(existing?.emoji ?? null);
    setMusic(existing?.music ?? "");
    setShowMusic(!!existing?.music);
    setAudience((existing?.audience as NoteAudience) || "followers");
  }, [open, existing, existingNote]);

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
      await saveNote.mutateAsync({ content: text, emoji, music: music.trim() || null, audience });
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
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5 lg-scrim animate-fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="lg-sheet w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold tracking-tight">
            {hasExisting ? "Edit note" : "New note"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground lg-press"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live preview */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative mb-2 max-w-[230px]">
            <div className="lg-surface rounded-2xl rounded-bl-lg px-3.5 py-2 text-[13px] leading-snug text-center break-words">
              {emoji && <span className="mr-1">{emoji}</span>}
              {text.trim() || "Share what you're up to…"}
              {music.trim() && (
                <span className="mt-1 flex items-center justify-center gap-1 text-[11px] text-primary">
                  <Music2 className="h-3 w-3" /> {music.trim()}
                </span>
              )}
            </div>
            <span className="lg-surface absolute -bottom-1.5 left-4 h-2.5 w-2.5 rounded-full" />
            <span className="lg-surface absolute -bottom-3.5 left-2 h-1.5 w-1.5 rounded-full" />
          </div>
          <Avatar className="h-16 w-16 ring-2 ring-primary/50 ring-offset-2 ring-offset-background mt-3">
            <AvatarImage src={avatarUrl || ""} />
            <AvatarFallback className="bg-muted">
              <UserRound className="h-7 w-7 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <span className="text-[12px] text-muted-foreground mt-1.5">{name || "You"}</span>
        </div>

        {/* Text input */}
        <div className="lg-field relative rounded-2xl mb-3">
          <textarea
            value={text}
            maxLength={NOTE_MAX_LENGTH}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            autoFocus
            placeholder="What's on your mind?"
            className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none"
          />
          <span className="absolute bottom-2.5 right-3 text-[11px] text-muted-foreground tabular-nums">
            {text.length}/{NOTE_MAX_LENGTH}
          </span>
        </div>

        {/* Emoji row */}
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar">
          <span className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Smile className="h-4 w-4" />
          </span>
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(emoji === e ? null : e)}
              className={cn(
                "h-8 w-8 shrink-0 rounded-full text-[16px] leading-none lg-press flex items-center justify-center",
                emoji === e ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-muted"
              )}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Music / activity */}
        {showMusic ? (
          <div className="lg-field flex items-center gap-2 rounded-2xl px-3.5 h-11 mb-3">
            <Music2 className="h-4 w-4 text-primary shrink-0" />
            <input
              value={music}
              maxLength={40}
              onChange={(e) => setMusic(e.target.value)}
              placeholder="Song or activity"
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button
              onClick={() => {
                setMusic("");
                setShowMusic(false);
              }}
              className="text-muted-foreground lg-press"
              aria-label="Remove activity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowMusic(true)}
            className="lg-chip w-full h-11 rounded-2xl mb-3 flex items-center justify-center gap-2 text-[13px] font-medium text-muted-foreground lg-press"
          >
            <Music2 className="h-4 w-4" /> Add music or activity
          </button>
        )}

        {/* Audience */}
        <div className="lg-bar grid grid-cols-2 gap-1 p-1 rounded-2xl mb-5">
          {([
            { id: "followers" as NoteAudience, label: "Followers", icon: Users },
            { id: "everyone" as NoteAudience, label: "Everyone", icon: Globe2 },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAudience(id)}
              className={cn(
                "h-9 rounded-xl text-[13px] font-medium flex items-center justify-center gap-1.5 lg-press",
                audience === id ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-[15px] w-[15px]" /> {label}
            </button>
          ))}
        </div>

        <button
          onClick={handleShare}
          disabled={!text.trim() || saveNote.isPending}
          className="lg-fab w-full h-12 rounded-2xl font-semibold text-[15px] disabled:opacity-50"
        >
          {saveNote.isPending ? "Sharing…" : hasExisting ? "Update note" : "Share note"}
        </button>

        {hasExisting && (
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
