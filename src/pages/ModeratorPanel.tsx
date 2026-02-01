import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Flag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  MessageSquare,
  FileText,
  User,
  Shield,
  Clock,
  ChevronRight,
  ArrowUpRight,
  Ban,
  AlertCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Activity,
  TrendingUp,
  Users,
  BarChart3,
  Volume2,
  VolumeX,
  Send,
  History,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from "recharts";

const ModeratorPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedTab, setSelectedTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Fetch reports with related data
  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ["moderator-reports", typeFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("report_type", typeFilter);
      }

      if (dateFilter !== "all") {
        const daysAgo = parseInt(dateFilter);
        query = query.gte("created_at", subDays(new Date(), daysAgo).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const reporterIds = [...new Set(data?.map((r) => r.reporter_id) || [])];
      const { data: reporters } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", reporterIds);

      const reportedUserIds = [...new Set(data?.filter((r) => r.reported_user_id).map((r) => r.reported_user_id) || [])];
      const { data: reportedUsers } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, is_suspended")
        .in("id", reportedUserIds);

      return data?.map((report) => ({
        ...report,
        reporter: reporters?.find((p) => p.id === report.reporter_id),
        reported_user: reportedUsers?.find((p) => p.id === report.reported_user_id),
      }));
    },
    refetchInterval: 30000, // Real-time refresh every 30s
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["moderator-stats"],
    queryFn: async () => {
      const today = new Date();
      const weekAgo = subDays(today, 7);
      
      const [pending, resolved, todayActions, weekReports] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reports").select("*", { count: "exact", head: true }).in("status", ["resolved", "dismissed"]),
        supabase.from("admin_logs").select("*", { count: "exact", head: true })
          .eq("admin_id", user?.id)
          .gte("created_at", new Date().toISOString().split("T")[0]),
        supabase.from("reports").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
      ]);

      return {
        pending: pending.count || 0,
        resolved: resolved.count || 0,
        todayActions: todayActions.count || 0,
        weekReports: weekReports.count || 0,
      };
    },
  });

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ["moderator-audit-log", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .eq("admin_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: showAuditLog,
  });

  // Handle report action
  const reportAction = useMutation({
    mutationFn: async ({ reportId, action, notes }: { reportId: string; action: string; notes: string }) => {
      const { error } = await supabase
        .from("reports")
        .update({
          status: action,
          admin_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: `report_${action}`,
        target_id: reportId,
        target_type: "report",
        details: { action, notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderator-reports"] });
      queryClient.invalidateQueries({ queryKey: ["moderator-stats"] });
      setSelectedReport(null);
      setAdminNotes("");
      toast({ title: "Report updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Quick actions - warn, mute, flag, escalate
  const quickAction = useMutation({
    mutationFn: async ({ reportId, action, userId, contentId, contentType }: {
      reportId: string;
      action: "hide" | "delete" | "warn" | "mute" | "flag" | "escalate";
      userId?: string;
      contentId?: string;
      contentType?: string;
    }) => {
      if (action === "delete" && contentId && contentType === "post") {
        await supabase.from("posts").delete().eq("id", contentId);
      } else if (action === "delete" && contentId && contentType === "comment") {
        await supabase.from("comments").delete().eq("id", contentId);
      } else if (action === "mute" && userId) {
        // Temporarily disable messaging for user
        await supabase.from("profiles").update({ messaging_disabled: true }).eq("id", userId);
      } else if (action === "warn" && userId) {
        // Send warning notification
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Content Warning",
          message: "Your content has been flagged for violating community guidelines. Repeated violations may result in account restrictions.",
          type: "system_warning",
          from_user_id: user?.id,
        });
      } else if (action === "escalate") {
        // Mark for admin review
        await supabase.from("reports").update({ status: "escalated" }).eq("id", reportId);
      }

      if (action !== "escalate") {
        await supabase.from("reports").update({
          status: "resolved",
          admin_notes: `Moderator action: ${action}`,
          updated_at: new Date().toISOString(),
        }).eq("id", reportId);
      }

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: `mod_${action}`,
        target_id: reportId,
        target_type: "report",
        details: { action, content_id: contentId, content_type: contentType, user_id: userId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderator-reports"] });
      queryClient.invalidateQueries({ queryKey: ["moderator-stats"] });
      toast({ title: "Action completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "post": return <FileText className="h-4 w-4" />;
      case "comment": return <MessageSquare className="h-4 w-4" />;
      case "user": return <User className="h-4 w-4" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pending": return "destructive";
      case "reviewed": return "default";
      case "resolved": return "secondary";
      case "escalated": return "default";
      case "dismissed": return "outline";
      default: return "outline";
    }
  };

  const filteredReports = reports?.filter((report) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        report.description?.toLowerCase().includes(query) ||
        report.reporter?.username?.toLowerCase().includes(query) ||
        report.reported_user?.username?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const pendingReports = filteredReports?.filter((r) => r.status === "pending") || [];
  const reviewedReports = filteredReports?.filter((r) => r.status !== "pending") || [];

  // Chart data
  const chartData = [
    { name: "Mon", reports: 12, resolved: 10 },
    { name: "Tue", reports: 19, resolved: 15 },
    { name: "Wed", reports: 8, resolved: 8 },
    { name: "Thu", reports: 22, resolved: 18 },
    { name: "Fri", reports: 15, resolved: 12 },
    { name: "Sat", reports: 6, resolved: 6 },
    { name: "Sun", reports: 4, resolved: 4 },
  ];

  const chartConfig = {
    reports: { label: "Reports", color: "hsl(var(--destructive))" },
    resolved: { label: "Resolved", color: "hsl(var(--primary))" },
  };

  const exportReports = () => {
    const csv = [
      ["ID", "Type", "Status", "Reporter", "Created At", "Description"].join(","),
      ...(reports || []).map((r) => [
        r.id,
        r.report_type,
        r.status,
        r.reporter?.username || "",
        r.created_at,
        `"${r.description?.replace(/"/g, '""') || ""}"`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Reports exported" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-screen-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-lg">Moderator Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowAuditLog(true)}>
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-screen-2xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className={`p-4 ${(stats?.pending || 0) > 0 ? "ring-2 ring-destructive/50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.resolved || 0}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.todayActions || 0}</p>
                  <p className="text-xs text-muted-foreground">Today's Actions</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.weekReports || 0}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Activity Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Weekly Report Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="reports" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Search & Filter */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
                <SelectItem value="comment">Comments</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportReports}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </Card>

        {/* Reports Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger value="pending" className="flex-1 lg:flex-initial relative">
              Pending
              {pendingReports.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full text-white text-xs flex items-center justify-center">
                  {pendingReports.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="flex-1 lg:flex-initial">
              Reviewed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flag className="h-5 w-5 text-destructive" />
                  Pending Reports
                  <Badge variant="secondary" className="ml-2">{pendingReports.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
                    ) : pendingReports.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p>All clear! No pending reports</p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {pendingReports.map((report: any) => (
                          <motion.div
                            key={report.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-4 rounded-xl border border-border hover:border-destructive/30 transition-all"
                          >
                            <div className="flex items-start gap-4">
                              <div className="p-2 rounded-lg bg-destructive/10">
                                {getReportTypeIcon(report.report_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm capitalize">{report.report_type} Report</span>
                                  <Badge variant="destructive" className="text-xs">Pending</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {report.description || "No description provided"}
                                </p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={report.reporter?.avatar_url} />
                                    <AvatarFallback className="text-xs">{report.reporter?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">by @{report.reporter?.username}</span>
                                  <span className="text-xs text-muted-foreground">
                                    • {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                  </span>
                                  {report.reported_user && (
                                    <Badge variant="outline" className="text-xs">vs @{report.reported_user.username}</Badge>
                                  )}
                                </div>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => quickAction.mutate({
                                      reportId: report.id,
                                      action: "warn",
                                      userId: report.reported_user_id,
                                    })}
                                    disabled={quickAction.isPending}
                                  >
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Warn
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => quickAction.mutate({
                                      reportId: report.id,
                                      action: "mute",
                                      userId: report.reported_user_id,
                                    })}
                                    disabled={quickAction.isPending}
                                  >
                                    <VolumeX className="h-3 w-3 mr-1" />
                                    Mute
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs text-destructive hover:text-destructive"
                                    onClick={() => quickAction.mutate({
                                      reportId: report.id,
                                      action: "delete",
                                      contentId: report.reported_post_id || report.reported_comment_id,
                                      contentType: report.report_type,
                                    })}
                                    disabled={quickAction.isPending}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs text-amber-500 hover:text-amber-600"
                                    onClick={() => quickAction.mutate({
                                      reportId: report.id,
                                      action: "escalate",
                                    })}
                                    disabled={quickAction.isPending}
                                  >
                                    <ArrowUpRight className="h-3 w-3 mr-1" />
                                    Escalate
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-xs ml-auto"
                                    onClick={() => setSelectedReport(report)}
                                  >
                                    Review
                                    <ChevronRight className="h-3 w-3 ml-1" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviewed">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Reviewed Reports
                  <Badge variant="secondary" className="ml-2">{reviewedReports.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {reviewedReports.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No reviewed reports yet</div>
                    ) : (
                      reviewedReports.map((report: any) => (
                        <div key={report.id} className="p-4 rounded-xl border border-border">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getReportTypeIcon(report.report_type)}
                                <span className="font-medium text-sm capitalize">{report.report_type} Report</span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{report.description || "No description"}</p>
                              {report.admin_notes && (
                                <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                                  <span className="font-medium">Notes:</span> {report.admin_notes}
                                </p>
                              )}
                            </div>
                            <Badge variant={getStatusBadgeVariant(report.status)}>{report.status}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize flex items-center gap-2">
              {getReportTypeIcon(selectedReport?.report_type)}
              {selectedReport?.report_type} Report
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedReport.reporter?.avatar_url} />
                  <AvatarFallback>{selectedReport.reporter?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">Reported by</p>
                  <p className="text-xs text-muted-foreground">@{selectedReport.reporter?.username}</p>
                </div>
              </div>

              {selectedReport.reported_user && (
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedReport.reported_user?.avatar_url} />
                    <AvatarFallback>{selectedReport.reported_user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">Reported User</p>
                    <p className="text-xs text-muted-foreground">@{selectedReport.reported_user?.username}</p>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Description</p>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {selectedReport.description || "No description provided"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Moderator Notes</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this report..."
                  rows={3}
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => reportAction.mutate({ reportId: selectedReport.id, action: "dismissed", notes: adminNotes })}
                  disabled={reportAction.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
                <Button
                  onClick={() => reportAction.mutate({ reportId: selectedReport.id, action: "resolved", notes: adminNotes })}
                  disabled={reportAction.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Your Audit Log
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {auditLog?.map((log: any) => (
                <div key={log.id} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{log.action_type.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {JSON.stringify(log.details).slice(0, 100)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModeratorPanel;