import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Circle,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OnlineUser {
  id: string;
  username: string;
  avatar_url: string | null;
  display_name: string | null;
  updated_at: string;
  status: "online" | "idle" | "offline";
}

export const AdminOnlineUsers = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-online-users"],
    queryFn: async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, display_name, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate online status based on updated_at
      return data?.map((user) => {
        const lastActive = new Date(user.updated_at).getTime();
        const now = Date.now();
        const fiveMin = 5 * 60 * 1000;
        const thirtyMin = 30 * 60 * 1000;

        let status: "online" | "idle" | "offline" = "offline";
        if (now - lastActive < fiveMin) {
          status = "online";
        } else if (now - lastActive < thirtyMin) {
          status = "idle";
        }

        return { ...user, status } as OnlineUser;
      }) || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const onlineCount = users?.filter((u) => u.status === "online").length || 0;
  const idleCount = users?.filter((u) => u.status === "idle").length || 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />;
      case "idle":
        return <Circle className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />;
      default:
        return <Circle className="h-2.5 w-2.5 fill-muted-foreground text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">Online</Badge>;
      case "idle":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs">Idle</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Offline</Badge>;
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Live User Status
          </div>
          <div className="flex items-center gap-3 text-sm font-normal">
            <span className="flex items-center gap-1.5">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              {onlineCount}
            </span>
            <span className="flex items-center gap-1.5">
              <Circle className="h-2 w-2 fill-yellow-500 text-yellow-500" />
              {idleCount}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : (
            <div className="space-y-2">
              {users?.slice(0, 20).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5">
                      {getStatusIcon(user.status)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.display_name || user.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(user.status)}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
