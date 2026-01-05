import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Filter,
  Star,
  Zap,
  FileText,
  User,
  ChevronRight,
  Inbox,
  Archive,
} from "lucide-react";

// Predefined response templates
const responseTemplates = [
  { id: 1, title: "Account Issue", text: "Thank you for reaching out. We've reviewed your account issue and..." },
  { id: 2, title: "Technical Problem", text: "We apologize for the inconvenience. Our team has identified the issue and..." },
  { id: 3, title: "Feature Request", text: "Thank you for your suggestion! We appreciate your feedback and will consider..." },
  { id: 4, title: "General Inquiry", text: "Thank you for contacting Prangon Support. Regarding your inquiry..." },
];

const SupportPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch support tickets with user profiles
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support-tickets", statusFilter, priorityFilter],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles for tickets
      const userIds = [...new Set(data?.map((t) => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, display_name")
        .in("id", userIds);

      return data?.map((ticket) => ({
        ...ticket,
        user: profiles?.find((p) => p.id === ticket.user_id),
      }));
    },
  });

  // Respond to ticket mutation
  const respondMutation = useMutation({
    mutationFn: async ({
      ticketId,
      response,
      newStatus,
    }: {
      ticketId: string;
      response: string;
      newStatus: string;
    }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          admin_response: response,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      // Create notification for user
      await supabase.from("notifications").insert({
        user_id: selectedTicket.user_id,
        title: "Support Response",
        message: `Your support ticket "${selectedTicket.subject}" has been ${newStatus === "resolved" ? "resolved" : "updated"}.`,
        type: "support_response",
        from_user_id: user?.id,
      });

      // Log support action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "support_ticket_responded",
        target_id: ticketId,
        target_type: "support_ticket",
        details: { response, new_status: newStatus, internal_notes: internalNotes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setSelectedTicket(null);
      setResponse("");
      setInternalNotes("");
      toast({ title: "Response sent successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "closed":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "open":
        return "destructive";
      case "in_progress":
        return "default";
      case "resolved":
        return "secondary";
      case "closed":
        return "outline";
      default:
        return "outline";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "account":
        return <User className="h-4 w-4" />;
      case "technical":
        return <Zap className="h-4 w-4" />;
      case "billing":
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleRespond = (newStatus: string) => {
    if (!selectedTicket) return;
    respondMutation.mutate({
      ticketId: selectedTicket.id,
      response,
      newStatus,
    });
  };

  const applyTemplate = (template: typeof responseTemplates[0]) => {
    setResponse(template.text);
    toast({ title: "Template applied", description: template.title });
  };

  const filteredTickets = tickets?.filter((ticket) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.subject?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.user?.username?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const openCount = tickets?.filter((t) => t.status === "open").length || 0;
  const inProgressCount = tickets?.filter((t) => t.status === "in_progress").length || 0;
  const resolvedCount = tickets?.filter((t) => t.status === "resolved").length || 0;

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
          <h1 className="font-semibold text-lg">Support Panel</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-screen-xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("open")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-yellow-500/10">
                  <Inbox className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCount}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("in_progress")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inProgressCount}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("resolved")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <Archive className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{resolvedCount}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Search & Filter */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Tickets List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5" />
              Support Tickets
              <Badge variant="secondary" className="ml-2">{filteredTickets?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading tickets...
                  </div>
                ) : filteredTickets?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No tickets found</p>
                  </div>
                ) : (
                  filteredTickets?.map((ticket: any) => (
                    <motion.div
                      key={ticket.id}
                      whileHover={{ scale: 1.01 }}
                      className="p-4 rounded-xl border border-border hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={ticket.user?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {ticket.user?.username?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(ticket.status)}
                            <span className="font-medium text-sm truncate">
                              {ticket.subject}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              {getCategoryIcon(ticket.category)}
                              {ticket.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              by @{ticket.user?.username || "unknown"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={getStatusBadgeVariant(ticket.status)}
                            className="shrink-0"
                          >
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog
        open={!!selectedTicket}
        onOpenChange={() => setSelectedTicket(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-8 flex items-center gap-2">
              {getStatusIcon(selectedTicket?.status)}
              {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedTicket.user?.avatar_url} />
                  <AvatarFallback>
                    {selectedTicket.user?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {selectedTicket.user?.display_name || selectedTicket.user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{selectedTicket.user?.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getCategoryIcon(selectedTicket.category)}
                  {selectedTicket.category}
                </Badge>
                <Badge variant={getStatusBadgeVariant(selectedTicket.status)}>
                  {selectedTicket.status.replace("_", " ")}
                </Badge>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Description</p>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {selectedTicket.description}
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                Submitted:{" "}
                {format(new Date(selectedTicket.created_at), "MMM d, yyyy h:mm a")}
              </div>

              {selectedTicket.admin_response && (
                <>
                  <Separator />
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium mb-1 text-primary">Previous Response</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTicket.admin_response}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              {/* Quick Templates */}
              <div>
                <p className="text-sm font-medium mb-2">Quick Templates</p>
                <div className="flex flex-wrap gap-2">
                  {responseTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => applyTemplate(template)}
                    >
                      {template.title}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Response Input */}
              <div>
                <p className="text-sm font-medium mb-2">Your Response</p>
                <Textarea
                  placeholder="Type your response..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Internal Notes */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  Internal Notes
                  <Badge variant="secondary" className="text-xs">Hidden from user</Badge>
                </p>
                <Textarea
                  placeholder="Add internal notes (not visible to user)..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  className="bg-muted/30"
                />
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => handleRespond("in_progress")}
                  disabled={respondMutation.isPending || !response.trim()}
                  className="w-full sm:w-auto"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  In Progress
                </Button>
                <Button
                  onClick={() => handleRespond("resolved")}
                  disabled={respondMutation.isPending || !response.trim()}
                  className="w-full sm:w-auto"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Resolve & Send
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportPanel;
