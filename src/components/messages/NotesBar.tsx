import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, Plus, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserNote } from "@/hooks/useNotes";

interface NoteFriend {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

interface NotesBarProps {
  self?: { avatar_url?: string | null; display_name?: string | null; username?: string | null } | null;
  myNote?: UserNote | null;
  friends: NoteFriend[];
  notes: Record<string, UserNote>;
  mutedIds?: string[];
  onCreateNote: () => void;
  onOpenNote: (friend: NoteFriend, note: UserNote) => void;
}

const Bubble = ({
  text,
  emoji,
  music,
  placeholder,
}: {
  text: string;
  emoji?: string | null;
  music?: string | null;
  placeholder?: boolean;
}) => (
  <div className="relative mb-2 max-w-[104px]">
    <div
      className={cn(
        "lg-surface rounded-2xl rounded-bl-lg px-2.5 py-1.5 text-[10.5px] leading-tight text-center break-words line-clamp-2",
        placeholder ? "text-muted-foreground" : "text-foreground"
      )}
    >
      {emoji && <span className="mr-0.5">{emoji}</span>}
      {text}
      {music && (
        <span className="mt-0.5 flex items-center justify-center gap-1 text-[9px] text-primary">
          <Music2 className="h-2.5 w-2.5" /> <span className="truncate">{music}</span>
        </span>
      )}
    </div>
    <span className="lg-surface absolute -bottom-1.5 left-3 h-2.5 w-2.5 rounded-full" />
    <span className="lg-surface absolute -bottom-3.5 left-1.5 h-1.5 w-1.5 rounded-full" />
  </div>
);

export const NotesBar = ({
  self,
  myNote,
  friends,
  notes,
  mutedIds = [],
  onCreateNote,
  onOpenNote,
}: NotesBarProps) => {
  const friendsWithNotes = friends.filter((f) => notes[f.id] && !mutedIds.includes(f.id));

  return (
    <div className="px-4 pt-2 pb-3">
      <div className="flex items-end gap-4 overflow-x-auto no-scrollbar pt-4">
        {/* Your note */}
        <button
          onClick={onCreateNote}
          className="flex flex-col items-center shrink-0 w-[76px] lg-press"
          aria-label={myNote ? "Edit your note" : "Create a note"}
        >
          <Bubble
            text={myNote?.content || "Share a note"}
            emoji={myNote?.emoji}
            music={myNote?.music}
            placeholder={!myNote}
          />
          <div className="relative">
            <Avatar className="h-14 w-14 ring-1 ring-border">
              <AvatarImage src={self?.avatar_url || ""} />
              <AvatarFallback className="bg-muted">
                <UserRound className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <span className="lg-fab absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-background">
              <Plus className="h-3 w-3" strokeWidth={2.6} />
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-2 truncate max-w-[76px]">
            {myNote ? "Your note" : "Add note"}
          </span>
        </button>

        {friendsWithNotes.map((f) => {
          const note = notes[f.id];
          return (
            <button
              key={f.id}
              onClick={() => onOpenNote(f, note)}
              className="flex flex-col items-center shrink-0 w-[76px] lg-press"
            >
              <Bubble text={note.content} emoji={note.emoji} music={note.music} />
              <div className="rounded-full p-[2px] bg-gradient-to-br from-primary/70 to-primary/20">
                <Avatar className="h-14 w-14 ring-2 ring-background">
                  <AvatarImage src={f.avatar_url || ""} />
                  <AvatarFallback className="bg-muted text-foreground text-xs">
                    {(f.display_name || f.username || "?")[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[11px] text-muted-foreground mt-2 truncate max-w-[76px]">
                {(f.display_name || f.username || "").split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
