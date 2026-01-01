import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, UserCircle, Shield, Flag, BadgeCheck, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const AdminAuditLog = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const getActionIcon = (actionType: string) => {
    if (actionType.includes("report")) return Flag;
    if (actionType.includes("verif")) return BadgeCheck;
    if (actionType.includes("support")) return MessageSquare;
    if (actionType.includes("delete")) return Trash2;
    if (actionType.includes("role")) return Shield;
    return History;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("approved") || actionType.includes("resolved")) return "text-green-600 bg-green-500/10";
    if (actionType.includes("rejected") || actionType.includes("delete") || actionType.includes("ban")) return "text-red-600 bg-red-500/10";
    if (actionType.includes("dismissed")) return "text-gray-600 bg-gray-500/10";
    return "text-blue-600 bg-blue-500/10";
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" />
          Audit Log
        </h2>
        <span className="text-sm text-muted-foreground">
          Last 100 actions
        </span>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {logs?.length === 0 ? (
            <div className="py-12 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No admin actions recorded</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border">
                {logs?.map((log, index) => {
                  const ActionIcon = getActionIcon(log.action_type);
                  const colorClass = getActionColor(log.action_type);
                  
                  return (
                    <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Timeline connector */}
                        <div className="flex flex-col items-center">
                          <div className={`p-2 rounded-full ${colorClass}`}>
                            <ActionIcon className="h-4 w-4" />
                          </div>
                          {index < (logs?.length || 0) - 1 && (
                            <div className="w-0.5 h-full bg-border mt-2 min-h-[20px]" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={colorClass}>
                              {formatActionType(log.action_type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={log.admin?.avatar_url} />
                              <AvatarFallback><UserCircle className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {log.admin?.display_name || log.admin?.username || "System"}
                            </span>
                          </div>

                          {log.target_type && (
                            <p className="text-xs text-muted-foreground">
                              Target: {log.target_type} ({log.target_id?.slice(0, 8)}...)
                            </p>
                          )}

                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
