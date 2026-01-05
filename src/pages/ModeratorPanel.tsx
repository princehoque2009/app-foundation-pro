import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
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
} from "lucide-react";

const ModeratorPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedTab, setSelectedTab] = useState("pending");

  // Fetch reports with related data
  const { data: reports, isLoading } = useQuery({
    queryKey: ["moderator-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch reporter profiles
      const reporterIds = [...new Set(data?.map((r) => r.reporter_id) || [])];
      const { data: reporters } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", reporterIds);

      // Fetch reported user profiles
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
  });

  // Handle report action
  const reportAction = useMutation({
    mutationFn: async ({
      reportId,
      action,
      notes,
    }: {
      reportId: string;
      action: string;
      notes: string;
    }) => {
      const { error } = await supabase
        .from("reports")
        .update({
          status: action,
          admin_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      // Log moderator action
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
      setSelectedReport(null);
      setAdminNotes("");
      toast({ title: "Report updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Quick actions
  const quickAction = useMutation({
    mutationFn: async ({
      reportId,
      action,
      contentId,
      contentType,
    }: {
      reportId: string;
      action: "hide" | "delete" | "warn";
      contentId?: string;
      contentType?: string;
    }) => {
      // Handle the quick action based on type
      if (action === "delete" && contentId && contentType === "post") {
        await supabase.from("posts").delete().eq("id", contentId);
      }

      // Update report status
      await supabase
        .from("reports")
        .update({
          status: "resolved",
          admin_notes: `Quick action: ${action}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      // Log action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: `quick_${action}`,
        target_id: reportId,
        target_type: "report",
        details: { action, content_id: contentId, content_type: contentType },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderator-reports"] });
      toast({ title: "Action completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "post":
        return <FileText className="h-4 w-4" />;
      case "comment":
        return <MessageSquare className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pending":
        return "destructive";
      case "reviewed":
        return "default";
      case "resolved":
        return "secondary";
      case "dismissed":
        return "outline";
      default:
        return "outline";
    }
  };

  const pendingReports = reports?.filter((r) => r.status === "pending") || [];
  const reviewedReports = reports?.filter((r) => r.status !== "pending") || [];

  const handleQuickAction = (report: any, action: "hide" | "delete" | "warn") => {
    quickAction.mutate({
      reportId: report.id,
      action,
      contentId: report.reported_post_id || report.reported_comment_id,
      contentType: report.report_type,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-lg">Moderator Panel</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-screen-xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className={`p-4 ${pendingReports.length > 0 ? "ring-2 ring-red-500/50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingReports.length}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
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
                  <p className="text-2xl font-bold">{reviewedReports.length}</p>
                  <p className="text-xs text-muted-foreground">Handled</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Reports Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1 relative">
              Pending
              {pendingReports.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {pendingReports.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="flex-1">
              Reviewed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flag className="h-5 w-5 text-red-500" />
                  Pending Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px]">
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading reports...
                      </div>
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
                            className="p-4 rounded-xl border border-border hover:border-red-500/30 transition-all"
                          >
                            <div className="flex items-start gap-4">
                              <div className="p-2 rounded-lg bg-red-500/10">
                                {getReportTypeIcon(report.report_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm capitalize">
                                    {report.report_type} Report
                                  </span>
                                  <Badge variant="destructive" className="text-xs">
                                    Pending
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {report.description || "No description provided"}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={report.reporter?.avatar_url} />
                                    <AvatarFallback className="text-xs">
                                      {report.reporter?.username?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">
                                    by @{report.reporter?.username}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    • {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                  </span>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickAction(report, "hide");
                                    }}
                                    disabled={quickAction.isPending}
                                  >
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    Hide
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs text-red-500 hover:text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickAction(report, "delete");
                                    }}
                                    disabled={quickAction.isPending}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px]">
                  <div className="space-y-3">
                    {reviewedReports.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No reviewed reports yet
                      </div>
                    ) : (
                      reviewedReports.map((report: any) => (
                        <div
                          key={report.id}
                          className="p-4 rounded-xl border border-border"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getReportTypeIcon(report.report_type)}
                                <span className="font-medium text-sm capitalize">
                                  {report.report_type} Report
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {report.description || "No description provided"}
                              </p>
                              {report.admin_notes && (
                                <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                                  <span className="font-medium">Notes:</span> {report.admin_notes}
                                </p>
                              )}
                            </div>
                            <Badge variant={getStatusBadgeVariant(report.status)}>
                              {report.status}
                            </Badge>
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
      <Dialog
        open={!!selectedReport}
        onOpenChange={() => setSelectedReport(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize flex items-center gap-2">
              {getReportTypeIcon(selectedReport?.report_type)}
              {selectedReport?.report_type} Report Review
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              {/* Reporter Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedReport.reporter?.avatar_url} />
                  <AvatarFallback>
                    {selectedReport.reporter?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Reported by</p>
                  <p className="text-xs text-muted-foreground">
                    @{selectedReport.reporter?.username}
                  </p>
                </div>
              </div>

              {/* Reported User (if applicable) */}
              {selectedReport.reported_user && (
                <div className="flex items-center gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedReport.reported_user?.avatar_url} />
                    <AvatarFallback>
                      {selectedReport.reported_user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      Reported User
                      {selectedReport.reported_user?.is_suspended && (
                        <Badge variant="destructive" className="text-xs">Suspended</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{selectedReport.reported_user?.username}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {selectedReport.report_type}
                </Badge>
                <Badge variant={getStatusBadgeVariant(selectedReport.status)}>
                  {selectedReport.status}
                </Badge>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Report Description</p>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {selectedReport.description || "No description provided"}
                </p>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Reported {format(new Date(selectedReport.created_at), "MMM d, yyyy 'at' h:mm a")}
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Moderator Notes</p>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() =>
                    reportAction.mutate({
                      reportId: selectedReport.id,
                      action: "dismissed",
                      notes: adminNotes,
                    })
                  }
                  disabled={reportAction.isPending}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
                <Button
                  onClick={() =>
                    reportAction.mutate({
                      reportId: selectedReport.id,
                      action: "resolved",
                      notes: adminNotes,
                    })
                  }
                  disabled={reportAction.isPending}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModeratorPanel;
