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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ArrowLeft,
  Flag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  MessageSquare,
  FileText,
  User,
} from "lucide-react";

const ModeratorPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  // Fetch reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ["moderator-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
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
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingReports.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviewedReports.length}</p>
                <p className="text-xs text-muted-foreground">Reviewed</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Reports Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              Pending ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="flex-1">
              Reviewed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flag className="h-5 w-5" />
                  Pending Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading reports...
                      </div>
                    ) : pendingReports.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No pending reports
                      </div>
                    ) : (
                      pendingReports.map((report: any) => (
                        <div
                          key={report.id}
                          className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedReport(report)}
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
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(
                                  new Date(report.created_at),
                                  "MMM d, h:mm a"
                                )}
                              </p>
                            </div>
                            <Badge variant="destructive">Pending</Badge>
                          </div>
                        </div>
                      ))
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
                  <CheckCircle className="h-5 w-5" />
                  Reviewed Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {reviewedReports.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No reviewed reports
                      </div>
                    ) : (
                      reviewedReports.map((report: any) => (
                        <div
                          key={report.id}
                          className="p-4 rounded-lg border border-border"
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
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  Notes: {report.admin_notes}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={getStatusBadgeVariant(report.status)}
                            >
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selectedReport?.report_type} Report
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
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
                <p className="text-sm font-medium mb-2">Description</p>
                <p className="text-sm text-muted-foreground">
                  {selectedReport.description || "No description provided"}
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                Reported:{" "}
                {format(
                  new Date(selectedReport.created_at),
                  "MMM d, yyyy h:mm a"
                )}
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
