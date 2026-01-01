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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, UserCircle, Check, Clock, Loader2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const AdminSupport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-support-tickets", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
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

  const respondToTicket = useMutation({
    mutationFn: async ({ ticketId, userId, response, status }: { ticketId: string; userId: string; response: string; status: string }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ 
          admin_response: response, 
          status,
          updated_at: new Date().toISOString() 
        })
        .eq("id", ticketId);
      
      if (error) throw error;

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "support_response",
        target_type: "support_ticket",
        target_id: ticketId,
        details: { response, status },
      });

      // Notify user
      await supabase.rpc("create_notification", {
        p_user_id: userId,
        p_from_user_id: user?.id,
        p_type: "support_response",
        p_title: "Support Response",
        p_message: "Your support ticket has received a response.",
        p_action_url: "/help",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      setSelectedTicket(null);
      setAdminResponse("");
      toast({ title: "Response Sent", description: "The user has been notified." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send response.", variant: "destructive" });
    },
  });

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      account: "bg-blue-500/10 text-blue-600",
      payment: "bg-green-500/10 text-green-600",
      abuse: "bg-red-500/10 text-red-600",
      feature: "bg-purple-500/10 text-purple-600",
      other: "bg-gray-500/10 text-gray-600",
    };
    return colors[category] || colors.other;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Open</Badge>;
      case "in_progress": return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">In Progress</Badge>;
      case "resolved": return <Badge variant="outline" className="bg-green-500/10 text-green-600">Resolved</Badge>;
      case "closed": return <Badge variant="outline" className="bg-gray-500/10 text-gray-600">Closed</Badge>;
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
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {tickets?.length || 0} tickets
        </span>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets?.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No support tickets</p>
            </CardContent>
          </Card>
        ) : (
          tickets?.map((ticket) => (
            <Card key={ticket.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Ticket Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={getCategoryBadge(ticket.category)}>
                        {ticket.category}
                      </Badge>
                      {getStatusBadge(ticket.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={ticket.profile?.avatar_url} />
                        <AvatarFallback><UserCircle className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{ticket.profile?.display_name || ticket.profile?.username}</span>
                    </div>

                    {/* Subject & Description */}
                    <div>
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {ticket.description}
                      </p>
                    </div>

                    {/* Admin Response */}
                    {ticket.admin_response && (
                      <div className="bg-primary/5 border-l-2 border-primary p-3 rounded-r-lg">
                        <p className="text-xs font-medium text-primary mb-1">Admin Response:</p>
                        <p className="text-sm">{ticket.admin_response}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setAdminResponse(ticket.admin_response || "");
                    }}
                  >
                    {ticket.status === "open" ? "Respond" : "View"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Response Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Support Ticket
            </DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedTicket.profile?.avatar_url} />
                    <AvatarFallback><UserCircle className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedTicket.profile?.display_name || selectedTicket.profile?.username}</p>
                    <p className="text-xs text-muted-foreground">@{selectedTicket.profile?.username}</p>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-medium mb-2">{selectedTicket.subject}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>
              </div>

              {/* Admin Response */}
              <div>
                <label className="text-sm font-medium">Your Response</label>
                <Textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Write your response to the user..."
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => respondToTicket.mutate({ 
                    ticketId: selectedTicket.id, 
                    userId: selectedTicket.user_id,
                    response: adminResponse, 
                    status: "in_progress" 
                  })}
                  disabled={respondToTicket.isPending || !adminResponse.trim()}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Mark In Progress
                </Button>
                <Button
                  onClick={() => respondToTicket.mutate({ 
                    ticketId: selectedTicket.id, 
                    userId: selectedTicket.user_id,
                    response: adminResponse, 
                    status: "resolved" 
                  })}
                  disabled={respondToTicket.isPending || !adminResponse.trim()}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Resolve & Respond
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
