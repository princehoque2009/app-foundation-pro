import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Ban,
  Shield,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PanelAuditLogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  title?: string;
}

const actionIcons: Record<string, typeof Shield> = {
  report_resolved: CheckCircle,
  report_dismissed: XCircle,
  support_ticket_responded: MessageSquare,
  mod_warn: AlertTriangle,
  mod_mute: Ban,
  mod_delete: XCircle,
  guidance_sent: MessageSquare,
  profile_feedback: User,
  user_suspended: Ban,
  user_unsuspended: CheckCircle,
  role_assigned: Shield,
  role_removed: Shield,
};

const actionColors: Record<string, string> = {
  report_resolved: "text-green-500 bg-green-500/10",
  report_dismissed: "text-muted-foreground bg-muted",
  support_ticket_responded: "text-blue-500 bg-blue-500/10",
  mod_warn: "text-amber-500 bg-amber-500/10",
  mod_mute: "text-destructive bg-destructive/10",
  mod_delete: "text-destructive bg-destructive/10",
  guidance_sent: "text-primary bg-primary/10",
  profile_feedback: "text-purple-500 bg-purple-500/10",
  user_suspended: "text-destructive bg-destructive/10",
  user_unsuspended: "text-green-500 bg-green-500/10",
  role_assigned: "text-blue-500 bg-blue-500/10",
  role_removed: "text-amber-500 bg-amber-500/10",
};

export const PanelAuditLog = ({
  open,
  onOpenChange,
  userId,
  title = "Activity Log",
}: PanelAuditLogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["audit-log", userId, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (userId) {
        query = query.eq("admin_id", userId);
      }

      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filteredLogs = logs?.filter((log) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.action_type?.toLowerCase().includes(query) ||
        log.target_type?.toLowerCase().includes(query) ||
        JSON.stringify(log.details)?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "Action", "Target Type", "Target ID", "Details"].join(","),
      ...(filteredLogs || []).map((log) =>
        [
          log.created_at,
          log.action_type,
          log.target_type || "",
          log.target_id || "",
          `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatActionLabel = (action: string) => {
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="report_resolved">Resolved</SelectItem>
              <SelectItem value="report_dismissed">Dismissed</SelectItem>
              <SelectItem value="mod_warn">Warnings</SelectItem>
              <SelectItem value="mod_mute">Mutes</SelectItem>
              <SelectItem value="user_suspended">Suspensions</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={exportLogs}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Log List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : filteredLogs?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activity found
              </div>
            ) : (
              filteredLogs?.map((log) => {
                const Icon = actionIcons[log.action_type] || FileText;
                const colorClass = actionColors[log.action_type] || "text-muted-foreground bg-muted";

                return (
                  <div
                    key={log.id}
                    className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", colorClass)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {formatActionLabel(log.action_type)}
                          </span>
                          {log.target_type && (
                            <Badge variant="outline" className="text-xs">
                              {log.target_type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.created_at || ""), {
                            addSuffix: true,
                          })}
                          {" · "}
                          {format(new Date(log.created_at || ""), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        {log.details && Object.keys(log.details as object).length > 0 && (
                          <div className="mt-2 text-xs bg-muted/50 rounded p-2 font-mono">
                            {JSON.stringify(log.details, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
