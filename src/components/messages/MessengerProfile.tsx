import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessengerSettings } from "@/components/messages/MessengerSettings";
import { UserCircle, ArrowUpRight, LogOut } from "lucide-react";

interface MessengerProfileProps {
  profile?: { display_name?: string | null; username?: string | null; avatar_url?: string | null } | null;
  chatsCount: number;
  totalUnread: number;
  onOpenFullProfile: () => void;
  onExit: () => void;
}

export const MessengerProfile = ({
  profile,
  chatsCount,
  totalUnread,
  onOpenFullProfile,
  onExit,
}: MessengerProfileProps) => {
  return (
    <ScrollArea className="flex-1">
      <div className="px-5 pt-8 pb-32 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-muted">
              <UserCircle className="h-12 w-12 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">
              {profile?.display_name || profile?.username || "You"}
            </h1>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-4 text-center">
            <div className="text-2xl font-bold tabular-nums">{chatsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Chats</div>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-center">
            <div className="text-2xl font-bold tabular-nums">{totalUnread}</div>
            <div className="text-xs text-muted-foreground mt-1">Unread</div>
          </div>
        </div>

        <div className="rounded-2xl border divide-y overflow-hidden bg-card">
          <MessengerSettings
            trigger={
              <button className="w-full flex items-center justify-between px-4 py-3.5 text-left text-[15px] hover:bg-accent/60 transition-colors">
                Messenger settings
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </button>
            }
          />
          <button
            onClick={onOpenFullProfile}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left text-[15px] hover:bg-accent/60 transition-colors"
          >
            View full profile
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <Button variant="outline" className="w-full rounded-full gap-2" onClick={onExit}>
          <LogOut className="h-4 w-4" />
          Back to chats
        </Button>
      </div>
    </ScrollArea>
  );
};
