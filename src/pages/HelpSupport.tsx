import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  HelpCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

const HelpSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  
  const [reportType, setReportType] = useState("");
  const [reportDescription, setReportDescription] = useState("");

  // Fetch user's support tickets
  const { data: tickets } = useQuery({
    queryKey: ["support-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's reports
  const { data: reports } = useQuery({
    queryKey: ["user-reports", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("reporter_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const submitTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user?.id,
        subject,
        description,
        category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setSubject("");
      setDescription("");
      setCategory("");
      toast({
        title: "Support ticket submitted",
        description: "We'll get back to you as soon as possible.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitReport = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user?.id,
        report_type: reportType,
        description: reportDescription,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-reports"] });
      setReportType("");
      setReportDescription("");
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep Prangon safe.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      open: { color: "bg-blue-500", icon: Clock },
      in_progress: { color: "bg-yellow-500", icon: Clock },
      pending: { color: "bg-yellow-500", icon: Clock },
      resolved: { color: "bg-green-500", icon: CheckCircle },
      closed: { color: "bg-muted", icon: CheckCircle },
      reviewed: { color: "bg-blue-500", icon: CheckCircle },
      dismissed: { color: "bg-muted", icon: CheckCircle },
    };
    const { color, icon: Icon } = variants[status] || variants.pending;
    return (
      <Badge className={`gap-1 ${color}`}>
        <Icon className="h-3 w-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-semibold text-lg">Help & Support</h1>
            <div className="w-9" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-screen-xl mx-auto p-4"
        >
          <Tabs defaultValue="support" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="support" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Support
              </TabsTrigger>
              <TabsTrigger value="report" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Report
              </TabsTrigger>
              <TabsTrigger value="policies" className="gap-2">
                <FileText className="h-4 w-4" />
                Policies
              </TabsTrigger>
            </TabsList>

            {/* Support Tab */}
            <TabsContent value="support" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    Contact Support
                  </CardTitle>
                  <CardDescription>
                    Need help? Submit a ticket and we'll respond as soon as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account Issue</SelectItem>
                        <SelectItem value="technical">Technical Problem</SelectItem>
                        <SelectItem value="billing">Billing Question</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                    />
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please provide details about your issue..."
                      rows={4}
                    />
                  </div>
                  
                  <Button
                    onClick={() => submitTicket.mutate()}
                    disabled={!category || !subject || !description || submitTicket.isPending}
                    className="w-full"
                  >
                    {submitTicket.isPending ? "Submitting..." : "Submit Ticket"}
                  </Button>
                </CardContent>
              </Card>

              {/* Previous Tickets */}
              {tickets && tickets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Tickets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tickets.map((ticket: any) => (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{ticket.subject}</h4>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {ticket.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(ticket.status)}
                        </div>
                        {ticket.admin_response && (
                          <div className="mt-3 p-3 rounded-lg bg-primary/10 border-l-2 border-primary">
                            <p className="text-sm font-medium">Admin Response:</p>
                            <p className="text-sm text-muted-foreground">
                              {ticket.admin_response}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Report Tab */}
            <TabsContent value="report" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Report a Problem
                  </CardTitle>
                  <CardDescription>
                    Report content or behavior that violates our community guidelines.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger>
                        <SelectValue placeholder="What are you reporting?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="harassment">Harassment or Bullying</SelectItem>
                        <SelectItem value="hate_speech">Hate Speech</SelectItem>
                        <SelectItem value="violence">Violence or Threats</SelectItem>
                        <SelectItem value="nudity">Nudity or Sexual Content</SelectItem>
                        <SelectItem value="false_info">False Information</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Describe the issue in detail..."
                      rows={4}
                    />
                  </div>
                  
                  <Button
                    onClick={() => submitReport.mutate()}
                    disabled={!reportType || !reportDescription || submitReport.isPending}
                    className="w-full"
                    variant="destructive"
                  >
                    {submitReport.isPending ? "Submitting..." : "Submit Report"}
                  </Button>
                </CardContent>
              </Card>

              {/* Previous Reports */}
              {reports && reports.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Reports</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {reports.map((report: any) => (
                      <div
                        key={report.id}
                        className="p-4 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium capitalize">
                              {report.report_type.replace("_", " ")}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {report.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(report.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(report.status)}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Policies Tab */}
            <TabsContent value="policies" className="space-y-4">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium">Terms of Service</h3>
                        <p className="text-sm text-muted-foreground">
                          Our terms and conditions
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium">Privacy Policy</h3>
                        <p className="text-sm text-muted-foreground">
                          How we handle your data
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium">Community Guidelines</h3>
                        <p className="text-sm text-muted-foreground">
                          Rules for our community
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default HelpSupport;
