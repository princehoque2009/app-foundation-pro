import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { History, Heart, MessageCircle, UserPlus, Bookmark, Share2, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

type ActivityItem = {
  id: string;
  type: "like" | "comment" | "friend_request" | "friend_accept" | "saved" | "reaction";
  timestamp: string;
  targetId?: string;
  details?: string;
  relatedUser?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

const ActivityLog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["activity-log", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const items: ActivityItem[] = [];

      // Fetch likes
      const { data: likes } = await supabase
        .from("post_reactions")
        .select("id, created_at, post_id, reaction")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);

      likes?.forEach((l) => {
        items.push({
          id: `like-${l.id}`,
          type: "reaction",
          timestamp: l.created_at,
          targetId: l.post_id,
          details: l.reaction,
        });
      });

      // Fetch comments
      const { data: comments } = await supabase
        .from("comments")
        .select("id, created_at, post_id, content")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);

      comments?.forEach((c) => {
        items.push({
          id: `comment-${c.id}`,
          type: "comment",
          timestamp: c.created_at,
          targetId: c.post_id,
          details: c.content.length > 60 ? c.content.slice(0, 60) + "…" : c.content,
        });
      });

      // Fetch sent friend requests
      const { data: friendReqs } = await supabase
        .from("friend_requests")
        .select("id, created_at, status, to_user_id, profiles!friend_requests_to_user_id_fkey(username, display_name, avatar_url)")
        .eq("from_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      friendReqs?.forEach((fr: any) => {
        items.push({
          id: `fr-${fr.id}`,
          type: "friend_request",
          timestamp: fr.created_at,
          details: fr.status,
          relatedUser: fr.profiles,
        });
      });

      // Fetch saved posts
      const { data: saved } = await supabase
        .from("saved_posts")
        .select("id, created_at, post_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      saved?.forEach((s) => {
        items.push({
          id: `saved-${s.id}`,
          type: "saved",
          timestamp: s.created_at!,
          targetId: s.post_id,
        });
      });

      // Sort all by time
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return items.slice(0, 50);
    },
  });

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "reaction":
      case "like":
        return <Heart className="h-4 w-4 text-[#FF5A5F]" />;
      case "comment":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "friend_request":
        return <UserPlus className="h-4 w-4 text-emerald-500" />;
      case "friend_accept":
        return <UserPlus className="h-4 w-4 text-emerald-600" />;
      case "saved":
        return <Bookmark className="h-4 w-4 text-amber-500" />;
    }
  };

  const getLabel = (item: ActivityItem) => {
    switch (item.type) {
      case "reaction":
        return `Reacted ${item.details || "❤️"} to a post`;
      case "comment":
        return `Commented: "${item.details}"`;
      case "friend_request":
        return `Sent friend request to ${item.relatedUser?.display_name || item.relatedUser?.username || "someone"} (${item.details})`;
      case "saved":
        return "Saved a post";
      default:
        return "Activity";
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center h-14 px-4 max-w-screen-xl mx-auto gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <History className="h-5 w-5 text-foreground" />
            <h1 className="font-semibold text-lg">Activity Log</h1>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-screen-md mx-auto p-4 space-y-2"
        >
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))
          ) : !activities || activities.length === 0 ? (
            <Card className="p-12 text-center">
              <History className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-xl mb-2">No activity yet</h3>
              <p className="text-muted-foreground">Your likes, comments, and interactions will appear here</p>
            </Card>
          ) : (
            activities.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-muted/50 transition-colors border-border/50"
                  onClick={() => item.targetId && navigate(`/post/${item.targetId}`)}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-1">{getLabel(item)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default ActivityLog;
