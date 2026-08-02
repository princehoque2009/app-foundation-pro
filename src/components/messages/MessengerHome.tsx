import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Users, UserCircle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniProfile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface MessengerHomeProps {
  friends: MiniProfile[];
  onlineIds: string[];
  totalUnread: number;
  onOpenChat: (friend: MiniProfile) => void;
  onExit: () => void;
}

export const MessengerHome = ({
  friends,
  onlineIds,
  totalUnread,
  onOpenChat,
  onExit,
}: MessengerHomeProps) => {
  const navigate = useNavigate();
  const online = friends.filter((f) => onlineIds.includes(f.id));

  return (
    <ScrollArea className="flex-1">
      <div className="px-5 pt-6 pb-32 space-y-6">
        <div>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">
            Messenger Home
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {String(totalUnread).padStart(2, "0")} unread ·{" "}
            {online.length} online now
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Chats", icon: MessageSquare, count: friends.length },
            { label: "Online", icon: Users, count: online.length },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border bg-card p-4 flex flex-col gap-2"
            >
              <c.icon className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold tabular-nums">{c.count}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-[15px] font-bold mb-3">Active now</h2>
          {online.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nobody is active right now.
            </p>
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
              {online.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onOpenChat(f)}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div className="relative">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={f.avatar_url || ""} />
                      <AvatarFallback className="bg-muted">
                        <UserCircle className="h-6 w-6 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[64px]">
                    {(f.display_name || f.username || "").split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border divide-y overflow-hidden bg-card">
          {[
            { label: "Go to app feed", onClick: () => navigate("/") },
            { label: "Discover people", onClick: () => navigate("/friends") },
            { label: "Back to chats", onClick: onExit },
          ].map((row) => (
            <button
              key={row.label}
              onClick={row.onClick}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 text-left text-[15px]",
                "hover:bg-accent/60 transition-colors"
              )}
            >
              {row.label}
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};
