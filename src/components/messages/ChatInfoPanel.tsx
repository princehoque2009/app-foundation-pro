import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { Bell, BellOff, UserX, Flag, Trash2, Image as ImageIcon, Film, Link as LinkIcon, ExternalLink, Palette, Pin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMessengerSettings } from "@/hooks/useMessengerSettings";
import { formatLastSeen, isUserOnline, type PresenceStatus } from "@/hooks/usePresence";

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  bio?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  friend: Profile;
  conversationId: string | null;
  status?: PresenceStatus;
  onCleared?: () => void;
}

interface MediaMsg {
  id: string;
  media_url: string;
  media_type: string;
  content: string | null;
  created_at: string;
}

const URL_RE = /(https?:\/\/[^\s]+)/gi;

export const ChatInfoPanel = ({ open, onOpenChange, friend, conversationId, status, onCleared }: Props) => {
  const { user } = useAuth();
  const { isChatMuted, muteChat, unmuteChat } = useMessengerSettings();
  const [media, setMedia] = useState<MediaMsg[]>([]);
  const [links, setLinks] = useState<{ id: string; url: string; created_at: string }[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [bio, setBio] = useState<string | undefined>(friend.bio);
  const muted = conversationId ? isChatMuted(conversationId) : false;

  // Fetch bio + shared media + blocked state
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [{ data: prof }, { data: msgs }, { data: blocks }] = await Promise.all([
        supabase.from("profiles").select("bio").eq("id", friend.id).maybeSingle(),
        conversationId
          ? supabase
              .from("messages" as any)
              .select("id, media_url, media_type, content, created_at")
              .eq("conversation_id", conversationId)
              .order("created_at", { ascending: false })
              .limit(200)
          : Promise.resolve({ data: [] }),
        user?.id
          ? supabase
              .from("blocked_users")
              .select("id")
              .eq("user_id", user.id)
              .eq("blocked_user_id", friend.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      if (prof?.bio) setBio(prof.bio);
      const all = ((msgs as any[]) || []) as MediaMsg[];
      setMedia(all.filter((m) => m.media_url && (m.media_type === "image" || m.media_type === "video")));
      const linkRows: { id: string; url: string; created_at: string }[] = [];
      all.forEach((m) => {
        if (m.content) {
          const found = m.content.match(URL_RE);
          found?.forEach((u) => linkRows.push({ id: `${m.id}-${u}`, url: u, created_at: m.created_at }));
        }
      });
      setLinks(linkRows.slice(0, 100));
      setBlocked(!!blocks);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, friend.id, conversationId, user?.id]);

  const toggleMute = () => {
    if (!conversationId) return;
    if (muted) unmuteChat(conversationId);
    else muteChat(conversationId);
  };

  const toggleBlock = async () => {
    if (!user?.id) return;
    if (blocked) {
      await supabase.from("blocked_users").delete().eq("user_id", user.id).eq("blocked_user_id", friend.id);
      setBlocked(false);
      toast({ title: "Unblocked", description: `You unblocked @${friend.username}` });
    } else {
      const { error } = await supabase
        .from("blocked_users")
        .insert({ user_id: user.id, blocked_user_id: friend.id });
      if (error) {
        toast({ title: "Could not block", description: error.message, variant: "destructive" });
        return;
      }
      setBlocked(true);
      toast({ title: "Blocked", description: `You blocked @${friend.username}` });
    }
  };

  const handleReport = async () => {
    if (!user?.id) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: friend.id,
      report_type: "chat_user",
      description: `Reported from chat with @${friend.username}`,
    });
    if (error) {
      toast({ title: "Could not report", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reported", description: "Our team will review this report." });
  };

  const handleClear = async () => {
    if (!conversationId || !user?.id) return;
    if (!confirm("Clear this entire chat? This cannot be undone.")) return;
    // Soft clear: mark all my visible messages as content=null. Real delete needs DELETE policy we don't have.
    // Instead we hide locally by re-fetching from a "cleared_at" stored client-side.
    localStorage.setItem(`chat_cleared_${conversationId}_${user.id}`, new Date().toISOString());
    toast({ title: "Chat cleared", description: "Messages are hidden on your device." });
    onCleared?.();
    onOpenChange(false);
  };

  const online = isUserOnline(status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-5 pt-6 pb-3 border-b">
          <SheetTitle>Chat info</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-5 flex flex-col items-center text-center">
            <div className="rounded-full p-[3px] bg-coral-gradient">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage src={friend.avatar_url || ""} />
                <AvatarFallback className="text-2xl">
                  {friend.display_name?.[0] || friend.username?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="mt-3 flex items-center gap-1">
              <h3 className="text-lg font-semibold">{friend.display_name || friend.username}</h3>
              {friend.is_verified && <VerifiedBadge size="sm" />}
            </div>
            <p className="text-sm text-muted-foreground">@{friend.username}</p>
            <p className={`text-xs mt-1 ${online ? "text-green-500 font-medium" : "text-muted-foreground"}`}>
              {formatLastSeen(status)}
            </p>
            {bio && <p className="text-sm mt-3 text-foreground/90 max-w-xs">{bio}</p>}

            <div className="flex gap-2 mt-4">
              <Button variant="outline" asChild className="rounded-full">
                <Link to={`/profile/${friend.id}`}>View profile</Link>
              </Button>
            </div>
          </div>

          <div className="px-5 space-y-1">
            <button
              onClick={toggleMute}
              className="w-full flex items-center justify-between py-3 border-b"
            >
              <div className="flex items-center gap-3">
                {muted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                <span className="text-sm font-medium">Mute notifications</span>
              </div>
              <Switch checked={muted} onCheckedChange={toggleMute} />
            </button>

            <button
              onClick={toggleBlock}
              className="w-full flex items-center gap-3 py-3 border-b text-left"
            >
              <UserX className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {blocked ? "Unblock user" : "Block user"}
              </span>
            </button>

            <button
              onClick={handleReport}
              className="w-full flex items-center gap-3 py-3 border-b text-left"
            >
              <Flag className="h-5 w-5" />
              <span className="text-sm font-medium">Report</span>
            </button>

            <button
              onClick={handleClear}
              className="w-full flex items-center gap-3 py-3 border-b text-left"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">Clear chat</span>
            </button>
          </div>

          <div className="px-5 pt-4 pb-8">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Shared</h4>
            <Tabs defaultValue="media">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="media"><ImageIcon className="h-4 w-4 mr-1" />Media</TabsTrigger>
                <TabsTrigger value="videos"><Film className="h-4 w-4 mr-1" />Videos</TabsTrigger>
                <TabsTrigger value="links"><LinkIcon className="h-4 w-4 mr-1" />Links</TabsTrigger>
              </TabsList>

              <TabsContent value="media" className="mt-3">
                {media.filter((m) => m.media_type === "image").length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No shared photos yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {media.filter((m) => m.media_type === "image").map((m) => (
                      <a key={m.id} href={m.media_url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-md">
                        <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="videos" className="mt-3">
                {media.filter((m) => m.media_type === "video").length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No shared videos yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {media.filter((m) => m.media_type === "video").map((m) => (
                      <video key={m.id} src={m.media_url} controls className="w-full rounded-md" />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="links" className="mt-3 space-y-1">
                {links.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No shared links yet.</p>
                ) : (
                  links.map((l) => (
                    <a
                      key={l.id}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted text-sm truncate"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span className="truncate">{l.url}</span>
                    </a>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
