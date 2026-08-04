import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, UserPlus, UserCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PeopleFriend {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

interface PeopleScreenProps {
  friends: PeopleFriend[];
  onlineIds: string[];
  onOpenChat: (friend: PeopleFriend) => void;
  onNewContact: () => void;
  onNewCommunity: () => void;
}

export const PeopleScreen = ({
  friends,
  onlineIds,
  onOpenChat,
  onNewContact,
  onNewCommunity,
}: PeopleScreenProps) => {
  const onlineSet = new Set(onlineIds);
  const sorted = [...friends].sort((a, b) => {
    const ao = onlineSet.has(a.id) ? 0 : 1;
    const bo = onlineSet.has(b.id) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return (a.display_name || a.username || "").localeCompare(b.display_name || b.username || "");
  });

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <header className="sticky top-0 z-20 px-5 pt-6 pb-4 bg-background/[.88] backdrop-blur-md border-b border-border/60">
        <h1 className="text-[28px] font-extrabold tracking-tight">People</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {onlineIds.length} active now
        </p>
      </header>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-32 pt-3 space-y-1">
          {/* Shortcuts */}
          <div className="flex gap-2 px-1 pb-3">
            <button
              onClick={onNewContact}
              className="flex-1 rounded-2xl border border-border/70 bg-card px-3 py-3 flex items-center gap-2.5 hover:bg-accent/60 transition-colors"
            >
              <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UserPlus className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <span className="text-[13px] font-semibold">Add contact</span>
            </button>
            <button
              onClick={onNewCommunity}
              className="flex-1 rounded-2xl border border-border/70 bg-card px-3 py-3 flex items-center gap-2.5 hover:bg-accent/60 transition-colors"
            >
              <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <span className="text-[13px] font-semibold">New group</span>
            </button>
          </div>

          {sorted.map((f) => {
            const online = onlineSet.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => onOpenChat(f)}
                className="w-full p-3 rounded-2xl flex items-center gap-3 hover:bg-accent/60 transition-colors text-left"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={f.avatar_url || ""} />
                    <AvatarFallback className="bg-muted">
                      <UserCircle className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  {online && (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium truncate">
                    {f.display_name || f.username}
                  </p>
                  <p className={cn("text-[12px] truncate", online ? "text-emerald-600" : "text-muted-foreground")}>
                    {online ? "Active now" : `@${f.username}`}
                  </p>
                </div>
                <span className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                </span>
              </button>
            );
          })}

          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users className="h-8 w-8 text-muted-foreground/60" strokeWidth={1.5} />
              </div>
              <p className="font-semibold">No contacts yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add people to start chatting</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
