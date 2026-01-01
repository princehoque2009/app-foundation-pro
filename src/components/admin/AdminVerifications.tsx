import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { BadgeCheck, UserCircle, FileText, Check, X, Loader2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const AdminVerifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-verification-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select(`
          *,
          profile:profiles!verification_requests_user_id_fkey(id, username, display_name, avatar_url, is_verified)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const processVerification = useMutation({
    mutationFn: async ({ requestId, userId, approved, notes }: { requestId: string; userId: string; approved: boolean; notes: string }) => {
      // Update verification request
      const { error: reqError } = await supabase
        .from("verification_requests")
        .update({ 
          status: approved ? "approved" : "rejected", 
          admin_notes: notes,
          updated_at: new Date().toISOString() 
        })
        .eq("id", requestId);
      
      if (reqError) throw reqError;

      // If approved, update profile
      if (approved) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_verified: true })
          .eq("id", userId);
        
        if (profileError) throw profileError;
      }

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: approved ? "verification_approved" : "verification_rejected",
        target_type: "verification_request",
        target_id: requestId,
        details: { notes, userId },
      });

      // Send notification to user
      await supabase.rpc("create_notification", {
        p_user_id: userId,
        p_from_user_id: user?.id,
        p_type: approved ? "verification_approved" : "verification_rejected",
        p_title: approved ? "Verification Approved!" : "Verification Update",
        p_message: approved 
          ? "Congratulations! Your account has been verified." 
          : `Your verification request was not approved. ${notes ? `Reason: ${notes}` : ""}`,
        p_action_url: "/profile",
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-verification-requests"] });
      setSelectedRequest(null);
      setAdminNotes("");
      toast({ 
        title: variables.approved ? "Verification Approved" : "Verification Rejected", 
        description: variables.approved 
          ? "The user has been verified and notified." 
          : "The user has been notified of the decision." 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to process verification.", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Pending</Badge>;
      case "approved": return <Badge variant="outline" className="bg-green-500/10 text-green-600">Approved</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-500/10 text-red-600">Rejected</Badge>;
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Verification Requests</h2>
        <span className="text-sm text-muted-foreground">
          {requests?.filter(r => r.status === "pending").length || 0} pending
        </span>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests?.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <BadgeCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No verification requests</p>
            </CardContent>
          </Card>
        ) : (
          requests?.map((request) => (
            <Card key={request.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={request.profile?.avatar_url} />
                      <AvatarFallback><UserCircle className="h-6 w-6" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{request.full_name}</p>
                        {getStatusBadge(request.status)}
                        {request.profile?.is_verified && (
                          <BadgeCheck className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{request.profile?.username}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {request.id_document_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={request.id_document_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-1" />
                          View Doc
                        </a>
                      </Button>
                    )}
                    {request.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNotes(request.admin_notes || "");
                        }}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Review Verification Request
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedRequest.profile?.avatar_url} />
                  <AvatarFallback><UserCircle className="h-8 w-8" /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedRequest.full_name}</p>
                  <p className="text-sm text-muted-foreground">@{selectedRequest.profile?.username}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.email}</p>
                </div>
              </div>

              {/* Document Preview */}
              {selectedRequest.id_document_url && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Submitted Document
                  </p>
                  <a 
                    href={selectedRequest.id_document_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open document in new tab
                  </a>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-medium">Admin Notes / Rejection Reason</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes (required for rejection)..."
                  className="mt-1"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!adminNotes.trim()) {
                      toast({ title: "Notes required", description: "Please provide a reason for rejection.", variant: "destructive" });
                      return;
                    }
                    processVerification.mutate({ 
                      requestId: selectedRequest.id, 
                      userId: selectedRequest.user_id, 
                      approved: false, 
                      notes: adminNotes 
                    });
                  }}
                  disabled={processVerification.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => processVerification.mutate({ 
                    requestId: selectedRequest.id, 
                    userId: selectedRequest.user_id, 
                    approved: true, 
                    notes: adminNotes 
                  })}
                  disabled={processVerification.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve & Verify
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
