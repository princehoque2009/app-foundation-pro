import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/contexts/CallContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, UserCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CallLogRow {
  id: string;
  created_at: string;
  sender_id: string;
  call_type: "audio" | "video";
  call_status: string;
  call_duration: number | null;
  otherUser: {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export const CallsScreen = () => {
  const { user } = useAuth();
  const { startAudioCall, startVideoCall, setCallProfile } = useCall();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["call-logs", user?.id],
    queryFn: async (): Promise<CallLogRow[]> => {
      const { data: myParts }: any = await supabase
        .from("conversation_participants" as any)
        .select("conversation_id")
        .eq("user_id", user!.id);
      const convIds = (myParts || []).map((r: any) => r.conversation_id);
      if (convIds.length === 0) return [];

      const { data: others }: any = await supabase
        .from("conversation_participants" as any)
        .select("conversation_id, user_id")
        .in("conversation_id", convIds)
        .neq("user_id", user!.id);

      const otherByConv: Record<string, string> = {};
      (others || []).forEach((o: any) => {
        otherByConv[o.conversation_id] = o.user_id;
      });

      const { data: profiles }: any = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", Array.from(new Set(Object.values(otherByConv))));
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => (profileMap[p.id] = p));

      const { data: msgs }: any = await supabase
        .from("messages" as any)
        .select("id, conversation_id, sender_id, call_type, call_status, call_duration, created_at")
        .in("conversation_id", convIds)
        .not("call_type", "is", null)
        .order("created_at", { ascending: false })
        .limit(60);

      return (msgs || [])
        .map((m: any) => ({
          ...m,
          otherUser: profileMap[otherByConv[m.conversation_id]],
        }))
        .filter((m: any) => m.otherUser);
    },
    enabled: !!user?.id,
  });

  const call = (row: CallLogRow, video: boolean) => {
    setCallProfile({
      id: row.otherUser.id,
      username: row.otherUser.username || "",
      display_name: row.otherUser.display_name,
      avatar_url: row.otherUser.avatar_url,
    });
    (video ? startVideoCall : startAudioCall)(row.otherUser.id);
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <header className="sticky top-0 z-20 px-5 pt-6 pb-4 bg-background/[.88] backdrop-blur-md border-b border-border/60">
        <h1 className="text-[28px] font-extrabold tracking-tight">Calls</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Recent voice & video calls</p>
      </header>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-32 pt-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : logs && logs.length > 0 ? (
            logs.map((row) => {
              const outgoing = row.sender_id === user?.id;
              const missed = row.call_status === "missed" || row.call_status === "declined";
              const Icon = missed ? PhoneMissed : outgoing ? PhoneOutgoing : PhoneIncoming;
              return (
                <div
                  key={row.id}
                  className="w-full p-3 rounded-2xl flex items-center gap-3 hover:bg-accent/60 transition-colors"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={row.otherUser.avatar_url || ""} />
                    <AvatarFallback className="bg-muted">
                      <UserCircle className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[15px] font-medium truncate", missed && "text-primary")}>
                      {row.otherUser.display_name || row.otherUser.username}
                    </p>
                    <p className="text-[12px] text-muted-foreground flex items-center gap-1 truncate">
                      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      {missed ? "Missed" : outgoing ? "Outgoing" : "Incoming"}
                      {" · "}
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={() => call(row, false)}
                    className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                    aria-label="Voice call"
                  >
                    <Phone className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => call(row, true)}
                    className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                    aria-label="Video call"
                  >
                    <Video className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                <Phone className="h-8 w-8 text-muted-foreground/60" strokeWidth={1.5} />
              </div>
              <p className="font-semibold">No calls yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a voice or video call from any chat
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
