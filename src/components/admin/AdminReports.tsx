import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Flag, Eye, Trash2, AlertTriangle, Ban, Check, X, Loader2, UserCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const AdminReports = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-reports", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ reportId, status, notes }: { reportId: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("reports")
        .update({ status, admin_notes: notes, updated_at: new Date().toISOString() })
        .eq("id", reportId);
      
      if (error) throw error;

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: `report_${status}`,
        target_type: "report",
        target_id: reportId,
        details: { notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setSelectedReport(null);
      setAdminNotes("");
      toast({ title: "Report updated", description: "The report has been processed successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update report.", variant: "destructive" });
    },
  });

  const deleteContent = useMutation({
    mutationFn: async ({ type, id }: { type: "post" | "comment"; id: string }) => {
      if (type === "post") {
        await supabase.from("posts").delete().eq("id", id);
      } else {
        await supabase.from("comments").delete().eq("id", id);
      }

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: `delete_${type}`,
        target_type: type,
        target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast({ title: "Content deleted", description: "The reported content has been removed." });
    },
  });

  const getReportTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      spam: "bg-yellow-500/10 text-yellow-600",
      harassment: "bg-red-500/10 text-red-600",
      hate_speech: "bg-purple-500/10 text-purple-600",
      fake_info: "bg-blue-500/10 text-blue-600",
      other: "bg-gray-500/10 text-gray-600",
    };
    return colors[type] || colors.other;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Pending</Badge>;
      case "resolved": return <Badge variant="outline" className="bg-green-500/10 text-green-600">Resolved</Badge>;
      case "dismissed": return <Badge variant="outline" className="bg-gray-500/10 text-gray-600">Dismissed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
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
      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {reports?.length || 0} reports
        </span>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports?.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Flag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No reports found</p>
            </CardContent>
          </Card>
        ) : (
          reports?.map((report) => (
            <Card key={report.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Report Header */}
                    <div className="flex items-center gap-3">
                      <Badge className={getReportTypeBadge(report.report_type)}>
                        {report.report_type.replace("_", " ")}
                      </Badge>
                      {getStatusBadge(report.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Reporter Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Reported by:</span>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={report.reporter?.avatar_url} />
                        <AvatarFallback><UserCircle className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{report.reporter?.display_name || report.reporter?.username}</span>
                    </div>

                    {/* Reported User */}
                    {report.reported_user && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Against:</span>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={report.reported_user?.avatar_url} />
                          <AvatarFallback><UserCircle className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{report.reported_user?.display_name || report.reported_user?.username}</span>
                      </div>
                    )}

                    {/* Description */}
                    {report.description && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        "{report.description}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-500" />
              Review Report
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {/* Report Details */}
              <div className="space-y-2">
                <p className="text-sm"><strong>Type:</strong> {selectedReport.report_type}</p>
                <p className="text-sm"><strong>Status:</strong> {selectedReport.status}</p>
                {selectedReport.description && (
                  <p className="text-sm"><strong>Description:</strong> {selectedReport.description}</p>
                )}
              </div>

              {/* Reported Content Preview */}
              {selectedReport.reported_post && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">Reported Post:</p>
                  <p className="text-sm text-muted-foreground">{selectedReport.reported_post.caption}</p>
                  {selectedReport.reported_post.media_url && (
                    <img 
                      src={selectedReport.reported_post.media_url} 
                      alt="Reported content" 
                      className="w-full max-h-40 object-cover rounded"
                    />
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteContent.mutate({ type: "post", id: selectedReport.reported_post.id })}
                    disabled={deleteContent.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Post
                  </Button>
                </div>
              )}

              {selectedReport.reported_comment && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">Reported Comment:</p>
                  <p className="text-sm text-muted-foreground">{selectedReport.reported_comment.content}</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteContent.mutate({ type: "comment", id: selectedReport.reported_comment.id })}
                    disabled={deleteContent.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Comment
                  </Button>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this report..."
                  className="mt-1"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => updateReport.mutate({ reportId: selectedReport.id, status: "dismissed", notes: adminNotes })}
                  disabled={updateReport.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Dismiss
                </Button>
                <Button
                  onClick={() => updateReport.mutate({ reportId: selectedReport.id, status: "resolved", notes: adminNotes })}
                  disabled={updateReport.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Resolved
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
