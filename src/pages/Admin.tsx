import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  BadgeCheck,
  UserCircle,
  Eye,
} from "lucide-react";
import { useState } from "react";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  // Check if user is admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user?.id,
        _role: "admin",
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Redirect non-admins
  useEffect(() => {
    if (!checkingAdmin && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, checkingAdmin, navigate]);

  // Fetch verification requests
  const { data: verificationRequests } = useQuery({
    queryKey: ["admin-verification-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  // Fetch reports
  const { data: reports } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  // Fetch support tickets
  const { data: tickets } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          *,
          user:profiles!support_tickets_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  // Update verification request
  const updateVerification = useMutation({
    mutationFn: async ({
      id,
      status,
      userId,
    }: {
      id: string;
      status: "approved" | "rejected";
      userId: string;
    }) => {
      // Update verification request
      const { error: reqError } = await supabase
        .from("verification_requests")
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (reqError) throw reqError;

      // Update profile verification status
      if (status === "approved") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_verified: true })
          .eq("id", userId);
        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-verification-requests"] });
      setSelectedItem(null);
      setAdminNotes("");
      toast({ title: "Verification request updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update report
  const updateReport = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "reviewed" | "resolved" | "dismissed";
    }) => {
      const { error } = await supabase
        .from("reports")
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setSelectedItem(null);
      setAdminNotes("");
      toast({ title: "Report updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update ticket
  const updateTicket = useMutation({
    mutationFn: async ({
      id,
      status,
      response,
    }: {
      id: string;
      status: "in_progress" | "resolved" | "closed";
      response?: string;
    }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status,
          admin_response: response || adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      setSelectedItem(null);
      setAdminNotes("");
      toast({ title: "Ticket updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any }> = {
      pending: { className: "bg-yellow-500", icon: Clock },
      open: { className: "bg-blue-500", icon: Clock },
      in_progress: { className: "bg-blue-500", icon: Clock },
      approved: { className: "bg-green-500", icon: CheckCircle },
      resolved: { className: "bg-green-500", icon: CheckCircle },
      rejected: { className: "bg-destructive", icon: XCircle },
      dismissed: { className: "bg-muted", icon: XCircle },
      reviewed: { className: "bg-primary", icon: Eye },
      closed: { className: "bg-muted", icon: CheckCircle },
    };
    const { className, icon: Icon } = variants[status] || variants.pending;
    return (
      <Badge className={`gap-1 ${className}`}>
        <Icon className="h-3 w-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (checkingAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) return null;

  const pendingVerifications = verificationRequests?.filter((r: any) => r.status === "pending").length || 0;
  const pendingReports = reports?.filter((r: any) => r.status === "pending").length || 0;
  const openTickets = tickets?.filter((t: any) => t.status === "open").length || 0;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center h-14 px-4 max-w-screen-xl mx-auto">
            <Shield className="h-6 w-6 text-primary mr-2" />
            <h1 className="font-semibold text-lg">Admin Panel</h1>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-screen-xl mx-auto p-4"
        >
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <BadgeCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingVerifications}</p>
                    <p className="text-sm text-muted-foreground">Pending Verifications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingReports}</p>
                    <p className="text-sm text-muted-foreground">Pending Reports</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <MessageSquare className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{openTickets}</p>
                    <p className="text-sm text-muted-foreground">Open Tickets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="verification" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="verification" className="gap-2">
                <BadgeCheck className="h-4 w-4" />
                Verification
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Support
              </TabsTrigger>
            </TabsList>

            {/* Verification Tab */}
            <TabsContent value="verification" className="space-y-4">
              {verificationRequests?.map((request: any) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={request.profiles?.avatar_url} />
                        <AvatarFallback>
                          <UserCircle className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {request.profiles?.display_name || request.profiles?.username}
                          </h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          @{request.profiles?.username}
                        </p>
                        <div className="mt-2 text-sm">
                          <p><strong>Full Name:</strong> {request.full_name}</p>
                          <p><strong>Email:</strong> {request.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Submitted: {new Date(request.created_at).toLocaleString()}
                          </p>
                        </div>
                        
                        {request.id_document_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => window.open(request.id_document_url, "_blank")}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Document
                          </Button>
                        )}
                        
                        {request.status === "pending" && (
                          <div className="mt-4 space-y-3">
                            <Textarea
                              placeholder="Admin notes (optional)..."
                              value={selectedItem?.id === request.id ? adminNotes : ""}
                              onChange={(e) => {
                                setSelectedItem(request);
                                setAdminNotes(e.target.value);
                              }}
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() =>
                                  updateVerification.mutate({
                                    id: request.id,
                                    status: "approved",
                                    userId: request.user_id,
                                  })
                                }
                                disabled={updateVerification.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  updateVerification.mutate({
                                    id: request.id,
                                    status: "rejected",
                                    userId: request.user_id,
                                  })
                                }
                                disabled={updateVerification.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(!verificationRequests || verificationRequests.length === 0) && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No verification requests
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              {reports?.map((report: any) => (
                <Card key={report.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={report.reporter?.avatar_url} />
                        <AvatarFallback>
                          <UserCircle className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold capitalize">
                            {report.report_type.replace("_", " ")}
                          </h3>
                          {getStatusBadge(report.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Reported by @{report.reporter?.username}
                        </p>
                        <p className="mt-2 text-sm">{report.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(report.created_at).toLocaleString()}
                        </p>
                        
                        {report.status === "pending" && (
                          <div className="mt-4 space-y-3">
                            <Textarea
                              placeholder="Admin notes (optional)..."
                              value={selectedItem?.id === report.id ? adminNotes : ""}
                              onChange={(e) => {
                                setSelectedItem(report);
                                setAdminNotes(e.target.value);
                              }}
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateReport.mutate({
                                    id: report.id,
                                    status: "resolved",
                                  })
                                }
                                disabled={updateReport.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  updateReport.mutate({
                                    id: report.id,
                                    status: "dismissed",
                                  })
                                }
                                disabled={updateReport.isPending}
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(!reports || reports.length === 0) && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No reports
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Support Tickets Tab */}
            <TabsContent value="tickets" className="space-y-4">
              {tickets?.map((ticket: any) => (
                <Card key={ticket.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={ticket.user?.avatar_url} />
                        <AvatarFallback>
                          <UserCircle className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{ticket.subject}</h3>
                          {getStatusBadge(ticket.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From @{ticket.user?.username} • {ticket.category}
                        </p>
                        <p className="mt-2 text-sm">{ticket.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(ticket.created_at).toLocaleString()}
                        </p>
                        
                        {ticket.status === "open" && (
                          <div className="mt-4 space-y-3">
                            <Textarea
                              placeholder="Your response..."
                              value={selectedItem?.id === ticket.id ? adminNotes : ""}
                              onChange={(e) => {
                                setSelectedItem(ticket);
                                setAdminNotes(e.target.value);
                              }}
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateTicket.mutate({
                                    id: ticket.id,
                                    status: "resolved",
                                    response: adminNotes,
                                  })
                                }
                                disabled={updateTicket.isPending || !adminNotes}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Respond & Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  updateTicket.mutate({
                                    id: ticket.id,
                                    status: "in_progress",
                                  })
                                }
                                disabled={updateTicket.isPending}
                              >
                                Mark In Progress
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {ticket.admin_response && (
                          <div className="mt-3 p-3 rounded-lg bg-primary/10 border-l-2 border-primary">
                            <p className="text-sm font-medium">Your Response:</p>
                            <p className="text-sm text-muted-foreground">
                              {ticket.admin_response}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(!tickets || tickets.length === 0) && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No support tickets
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Admin;
