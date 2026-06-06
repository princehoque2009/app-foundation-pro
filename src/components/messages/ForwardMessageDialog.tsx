import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ChatMessage } from "@/hooks/useChat";
import { Send, Search } from "lucide-react";

interface FriendOption {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  message: ChatMessage | null;
  forward: (msg: ChatMessage, conversationId: string) => Promise<void>;
}

export const ForwardMessageDialog = ({ open, onOpenChange, message, forward }: Props) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [query, setQuery] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("friendships")
        .select("friend_id, profiles!friendships_friend_id_fkey(id, username, display_name, avatar_url)")
        .eq("user_id", user.id)
        .limit(50);
      const list: FriendOption[] = ((data as any[]) || [])
        .map((r) => r.profiles)
        .filter(Boolean);
      setFriends(list);
    })();
  }, [open, user?.id]);

  const filtered = friends.filter((f) =>
    `${f.display_name || ""} ${f.username}`.toLowerCase().includes(query.toLowerCase())
  );

  const handleSend = async (friendId: string) => {
    if (!message) return;
    setSendingTo(friendId);
    try {
      const { data, error } = await supabase.rpc("get_or_create_direct_conversation" as any, {
        p_other_user: friendId,
      });
      if (error || !data) throw error || new Error("No conversation");
      await forward(message, data as unknown as string);
      toast.success("Forwarded");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to forward");
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle>Forward to</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search friends"
              className="pl-9 rounded-full"
            />
          </div>
        </div>
        <ScrollArea className="max-h-80">
          <div className="px-3 pb-4 space-y-1">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No friends found</p>
            ) : (
              filtered.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleSend(f.id)}
                  disabled={sendingTo === f.id}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted transition text-left disabled:opacity-50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={f.avatar_url || ""} />
                    <AvatarFallback>{(f.display_name || f.username)[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.display_name || f.username}</p>
                    <p className="text-xs text-muted-foreground truncate">@{f.username}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="rounded-full" disabled={sendingTo === f.id}>
                    <Send className="h-4 w-4" />
                  </Button>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
