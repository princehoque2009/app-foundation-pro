import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Plus } from "lucide-react";
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
  onCreateNote: () => void;
  onOpenNote: (friend: NoteFriend, note: UserNote) => void;
}

const Bubble = ({ text, muted }: { text: string; muted?: boolean }) => (
  <div className="relative mb-1.5 max-w-[92px]">
    <div
      className={cn(
        "rounded-2xl rounded-bl-md px-2.5 py-1 text-[10.5px] leading-tight text-center line-clamp-2 break-words",
        muted ? "bg-muted text-muted-foreground" : "bg-muted text-foreground"
      )}
    >
      {text}
    </div>
    <span className="absolute -bottom-1 left-3 h-2 w-2 rounded-full bg-muted" />
    <span className="absolute -bottom-2.5 left-1.5 h-1 w-1 rounded-full bg-muted" />
  </div>
);

export const NotesBar = ({
  self,
  myNote,
  friends,
  notes,
  onCreateNote,
  onOpenNote,
}: NotesBarProps) => {
  const friendsWithNotes = friends.filter((f) => notes[f.id]);

  return (
    <div className="px-4 pt-1 pb-3">
      <div className="flex items-end gap-4 overflow-x-auto no-scrollbar pt-3">
        {/* Your note */}
        <button
          onClick={onCreateNote}
          className="flex flex-col items-center shrink-0 w-[72px]"
          aria-label="Create note"
        >
          <Bubble text={myNote?.content || "Your note"} muted={!myNote} />
          <div className="relative">
            <Avatar className="h-14 w-14 ring-2 ring-border">
              <AvatarImage src={self?.avatar_url || ""} />
              <AvatarFallback className="bg-muted">
                <UserCircle className="h-7 w-7 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background">
              <Plus className="h-3 w-3" strokeWidth={2.5} />
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1.5 truncate max-w-[72px]">
            Your note
          </span>
        </button>

        {friendsWithNotes.map((f) => {
          const note = notes[f.id];
          return (
            <button
              key={f.id}
              onClick={() => onOpenNote(f, note)}
              className="flex flex-col items-center shrink-0 w-[72px]"
            >
              <Bubble text={note.content} />
              <Avatar className="h-14 w-14 ring-2 ring-primary/50 ring-offset-2 ring-offset-background">
                <AvatarImage src={f.avatar_url || ""} />
                <AvatarFallback className="bg-muted text-foreground text-xs">
                  {(f.display_name || f.username || "?")[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] text-muted-foreground mt-1.5 truncate max-w-[72px]">
                {(f.display_name || f.username || "").split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
