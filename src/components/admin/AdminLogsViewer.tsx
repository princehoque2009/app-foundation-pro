import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import {
  Activity,
  UserCircle,
  Ban,
  BadgeCheck,
  MessageSquare,
  FileText,
  Settings,
  AlertTriangle,
  Search,
  Shield,
  Bell,
  Trash,
} from "lucide-react";

interface AdminLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_id: string | null;
  target_type: string | null;
  details: Record<string, any> | null;
  created_at: string;
  admin_profile?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const AdminLogsViewer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Fetch admin logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-logs", filterType],
    queryFn: async () => {
      const { data: logsData, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Fetch admin profiles
      const adminIds = [...new Set(logsData.map((l: any) => l.admin_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", adminIds);

      const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]));

      return logsData.map((log: any) => ({
        ...log,
        admin_profile: profilesMap.get(log.admin_id),
      })) as AdminLog[];
    },
  });

  const getActionIcon = (actionType: string) => {
    if (actionType.includes("user") || actionType.includes("suspend") || actionType.includes("ban")) {
      return UserCircle;
    }
    if (actionType.includes("verification")) return BadgeCheck;
    if (actionType.includes("message")) return MessageSquare;
    if (actionType.includes("report")) return AlertTriangle;
    if (actionType.includes("setting")) return Settings;
    if (actionType.includes("notification")) return Bell;
    if (actionType.includes("delete")) return Trash;
    return Activity;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("ban") || actionType.includes("delete") || actionType.includes("disabled")) {
      return "bg-destructive/10 text-destructive";
    }
    if (actionType.includes("suspend") || actionType.includes("warn")) {
      return "bg-orange-500/10 text-orange-600";
    }
    if (actionType.includes("approve") || actionType.includes("enabled") || actionType.includes("unsuspend")) {
      return "bg-green-500/10 text-green-600";
    }
    if (actionType.includes("verification")) {
      return "bg-primary/10 text-primary";
    }
    return "bg-muted text-muted-foreground";
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const filteredLogs = logs?.filter((log) => {
    if (filterType !== "all" && !log.action_type.includes(filterType)) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        log.action_type.toLowerCase().includes(searchLower) ||
        log.admin_profile?.username.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const actionTypes = [
    { value: "all", label: "All Actions" },
    { value: "user", label: "User Actions" },
    { value: "verification", label: "Verification" },
    { value: "report", label: "Reports" },
    { value: "setting", label: "Settings" },
    { value: "message", label: "Messaging" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Admin Activity Log
            <Badge variant="outline" className="ml-2">
              {filteredLogs?.length || 0} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {filteredLogs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No admin actions recorded
                  </div>
                ) : (
                  filteredLogs?.map((log) => {
                    const Icon = getActionIcon(log.action_type);
                    return (
                      <div key={log.id} className="relative flex gap-4 pl-2">
                        {/* Timeline dot */}
                        <div
                          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 ${getActionColor(log.action_type)}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="secondary"
                                  className={getActionColor(log.action_type)}
                                >
                                  {formatActionType(log.action_type)}
                                </Badge>
                                {log.target_type && (
                                  <span className="text-xs text-muted-foreground">
                                    on {log.target_type}
                                  </span>
                                )}
                              </div>

                              {/* Admin info */}
                              <div className="flex items-center gap-2 mt-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={log.admin_profile?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    <Shield className="h-3 w-3" />
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">
                                  {log.admin_profile?.display_name || log.admin_profile?.username || "Admin"}
                                </span>
                              </div>

                              {/* Details */}
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                                  {log.details.reason && (
                                    <p>
                                      <span className="text-muted-foreground">Reason:</span>{" "}
                                      {log.details.reason}
                                    </p>
                                  )}
                                  {log.details.key && (
                                    <p>
                                      <span className="text-muted-foreground">Setting:</span>{" "}
                                      {log.details.key} = {String(log.details.value)}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <span className="text-xs text-muted-foreground shrink-0">
                              {format(new Date(log.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
