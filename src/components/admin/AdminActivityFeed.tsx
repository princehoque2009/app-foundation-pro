import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  UserPlus,
  FileText,
  Flag,
  MessageSquare,
  BadgeCheck,
  AlertCircle,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ActivityEvent {
  id: string;
  type: "user_joined" | "post_created" | "report_filed" | "message_sent" | "verification_request";
  message: string;
  timestamp: string;
  user?: {
    username: string;
    avatar_url?: string;
  };
}

export const AdminActivityFeed = () => {
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ["admin-live-activity"],
    queryFn: async () => {
      const events: ActivityEvent[] = [];

      // Fetch recent users
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      recentUsers?.forEach((user) => {
        events.push({
          id: `user-${user.id}`,
          type: "user_joined",
          message: `${user.username} joined Prangon`,
          timestamp: user.created_at,
          user: { username: user.username, avatar_url: user.avatar_url },
        });
      });

      // Fetch recent posts
      const { data: recentPosts } = await supabase
        .from("posts")
        .select("id, user_id, created_at, profiles(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(5);

      recentPosts?.forEach((post: any) => {
        events.push({
          id: `post-${post.id}`,
          type: "post_created",
          message: `${post.profiles?.username || "Someone"} created a new post`,
          timestamp: post.created_at,
          user: post.profiles,
        });
      });

      // Fetch recent reports
      const { data: recentReports } = await supabase
        .from("reports")
        .select("id, report_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      recentReports?.forEach((report) => {
        events.push({
          id: `report-${report.id}`,
          type: "report_filed",
          message: `New ${report.report_type} report filed`,
          timestamp: report.created_at,
        });
      });

      // Sort all events by timestamp
      return events.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 15);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Real-time subscription for new events
  useEffect(() => {
    const channel = supabase
      .channel("admin-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const newEvent: ActivityEvent = {
            id: `user-${payload.new.id}`,
            type: "user_joined",
            message: `${payload.new.username} joined Prangon`,
            timestamp: payload.new.created_at,
            user: { username: payload.new.username, avatar_url: payload.new.avatar_url },
          };
          setLiveEvents((prev) => [newEvent, ...prev].slice(0, 5));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        (payload) => {
          const newEvent: ActivityEvent = {
            id: `report-${payload.new.id}`,
            type: "report_filed",
            message: `New ${payload.new.report_type} report filed`,
            timestamp: payload.new.created_at,
          };
          setLiveEvents((prev) => [newEvent, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "user_joined":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "post_created":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "report_filed":
        return <Flag className="h-4 w-4 text-red-500" />;
      case "message_sent":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case "verification_request":
        return <BadgeCheck className="h-4 w-4 text-primary" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "user_joined":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">New User</Badge>;
      case "post_created":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">Post</Badge>;
      case "report_filed":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">Report</Badge>;
      default:
        return null;
    }
  };

  const allEvents = [...liveEvents, ...(recentActivity || [])];
  const uniqueEvents = allEvents.filter(
    (event, index, self) => self.findIndex((e) => e.id === event.id) === index
  ).slice(0, 20);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="relative">
            <Zap className="h-5 w-5 text-primary" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse" />
          </div>
          Live Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          <AnimatePresence>
            <div className="space-y-3">
              {uniqueEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                uniqueEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-background shadow-sm">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {event.user && (
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={event.user.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {event.user.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-sm font-medium truncate">{event.message}</span>
                        {getEventBadge(event.type)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
