import { useState } from "react";
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
  RefreshCw,
  Search,
  Download,
  Activity,
  TrendingUp,
  Users,
  Timer,
  BarChart3,
  History,
  Sparkles,
  HelpCircle,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Predefined response templates
const responseTemplates = [
  { id: 1, title: "Account Issue", text: "Thank you for reaching out. We've reviewed your account issue and have taken the following steps to help resolve it:" },
  { id: 2, title: "Technical Problem", text: "We apologize for the inconvenience caused by this technical issue. Our team has identified the problem and implemented a fix." },
  { id: 3, title: "Feature Request", text: "Thank you for your valuable suggestion! We appreciate your feedback and have added it to our product roadmap for consideration." },
  { id: 4, title: "General Inquiry", text: "Thank you for contacting Prangon Support. We're happy to help with your inquiry." },
  { id: 5, title: "Password Reset", text: "We've processed your password reset request. Please check your email for further instructions." },
  { id: 6, title: "Verification Help", text: "Regarding your verification request, we've reviewed your submitted documents and have the following update:" },
];

const SupportPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showSystemHealth, setShowSystemHealth] = useState(false);

  // Fetch support tickets with user profiles
  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ["support-tickets", statusFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

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
    refetchInterval: 30000,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["support-stats"],
    queryFn: async () => {
      const today = new Date();
      const weekAgo = subDays(today, 7);

      const [open, inProgress, resolved, todayTickets, avgResponseTime] = await Promise.all([
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "resolved"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString().split("T")[0]),
        supabase.from("support_tickets").select("created_at, updated_at").eq("status", "resolved").gte("created_at", weekAgo.toISOString()),
      ]);

      // Calculate average response time
      let avgTime = 0;
      if (avgResponseTime.data && avgResponseTime.data.length > 0) {
        const totalTime = avgResponseTime.data.reduce((acc, t) => {
          return acc + (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime());
        }, 0);
        avgTime = Math.round(totalTime / avgResponseTime.data.length / (1000 * 60 * 60)); // hours
      }

      return {
        open: open.count || 0,
        inProgress: inProgress.count || 0,
        resolved: resolved.count || 0,
        todayTickets: todayTickets.count || 0,
        avgResponseTime: avgTime,
      };
    },
  });

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ["support-audit-log", user?.id],
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

  // Respond to ticket mutation
  const respondMutation = useMutation({
    mutationFn: async ({ ticketId, response, newStatus }: { ticketId: string; response: string; newStatus: string }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          admin_response: response,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: selectedTicket.user_id,
        title: "Support Response",
        message: `Your support ticket "${selectedTicket.subject}" has been ${newStatus === "resolved" ? "resolved" : "updated"}.`,
        type: "support_response",
        from_user_id: user?.id,
      });

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
      queryClient.invalidateQueries({ queryKey: ["support-stats"] });
      setSelectedTicket(null);
      setResponse("");
      setInternalNotes("");
      toast({ title: "Response sent successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "closed": return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "open": return "destructive";
      case "in_progress": return "default";
      case "resolved": return "secondary";
      case "closed": return "outline";
      default: return "outline";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "account": return <User className="h-4 w-4" />;
      case "technical": return <Zap className="h-4 w-4" />;
      case "billing": return <FileText className="h-4 w-4" />;
      case "feature": return <Sparkles className="h-4 w-4" />;
      case "general": return <HelpCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleRespond = (newStatus: string) => {
    if (!selectedTicket) return;
    respondMutation.mutate({ ticketId: selectedTicket.id, response, newStatus });
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

  const exportTickets = () => {
    const csv = [
      ["ID", "Subject", "Category", "Status", "User", "Created At", "Description"].join(","),
      ...(tickets || []).map((t) => [
        t.id,
        `"${t.subject?.replace(/"/g, '""') || ""}"`,
        t.category,
        t.status,
        t.user?.username || "",
        t.created_at,
        `"${t.description?.replace(/"/g, '""') || ""}"`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Tickets exported" });
  };

  // Chart data
  const ticketTrendData = [
    { name: "Mon", tickets: 8, resolved: 6 },
    { name: "Tue", tickets: 12, resolved: 10 },
    { name: "Wed", tickets: 6, resolved: 6 },
    { name: "Thu", tickets: 15, resolved: 12 },
    { name: "Fri", tickets: 10, resolved: 8 },
    { name: "Sat", tickets: 4, resolved: 4 },
    { name: "Sun", tickets: 3, resolved: 3 },
  ];

  const categoryData = [
    { name: "Account", value: 35, color: "hsl(var(--primary))" },
    { name: "Technical", value: 25, color: "hsl(var(--destructive))" },
    { name: "Feature", value: 20, color: "hsl(142 76% 36%)" },
    { name: "General", value: 20, color: "hsl(38 92% 50%)" },
  ];

  const chartConfig = {
    tickets: { label: "Tickets", color: "hsl(var(--primary))" },
    resolved: { label: "Resolved", color: "hsl(142 76% 36%)" },
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
          <h1 className="font-semibold text-lg">Support Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowSystemHealth(true)}>
              <Server className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowAuditLog(true)}>
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-screen-2xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className={`p-4 cursor-pointer ${(stats?.open || 0) > 0 ? "ring-2 ring-yellow-500/50" : ""}`} onClick={() => setStatusFilter("open")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-yellow-500/10">
                  <Inbox className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.open || 0}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 cursor-pointer" onClick={() => setStatusFilter("in_progress")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.inProgress || 0}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 cursor-pointer" onClick={() => setStatusFilter("resolved")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <Archive className="h-5 w-5 text-green-500" />
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
                <div className="p-2 rounded-xl bg-purple-500/10">
                  <Activity className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.todayTickets || 0}</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <Timer className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.avgResponseTime || 0}h</p>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Ticket Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ticketTrendData}>
                    <defs>
                      <linearGradient id="ticketsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="tickets" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ticketsGradient)" />
                    <Area type="monotone" dataKey="resolved" stroke="hsl(142 76% 36%)" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {categoryData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40">
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <Star className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="account">Account</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportTickets}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
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
                  <div className="text-center py-8 text-muted-foreground">Loading tickets...</div>
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
                          <AvatarFallback className="text-xs">{ticket.user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(ticket.status)}
                            <span className="font-medium text-sm truncate">{ticket.subject}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              {getCategoryIcon(ticket.category)}
                              {ticket.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                            </span>
                            <span className="text-xs text-muted-foreground">by @{ticket.user?.username || "unknown"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={getStatusBadgeVariant(ticket.status)} className="shrink-0">
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
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-8 flex items-center gap-2">
              {getStatusIcon(selectedTicket?.status)}
              {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedTicket.user?.avatar_url} />
                  <AvatarFallback>{selectedTicket.user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selectedTicket.user?.display_name || selectedTicket.user?.username}</p>
                  <p className="text-xs text-muted-foreground">@{selectedTicket.user?.username}</p>
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
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">{selectedTicket.description}</p>
              </div>

              <div className="text-xs text-muted-foreground">
                Submitted: {format(new Date(selectedTicket.created_at), "MMM d, yyyy h:mm a")}
              </div>

              {selectedTicket.admin_response && (
                <>
                  <Separator />
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium mb-1 text-primary">Previous Response</p>
                    <p className="text-sm text-muted-foreground">{selectedTicket.admin_response}</p>
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

              <div className="space-y-2">
                <p className="text-sm font-medium">Response</p>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Internal Notes (not visible to user)</p>
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  rows={2}
                  className="bg-muted/30"
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleRespond("in_progress")}
                  disabled={respondMutation.isPending || !response}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Mark In Progress
                </Button>
                <Button
                  onClick={() => handleRespond("resolved")}
                  disabled={respondMutation.isPending || !response}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Resolve & Respond
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* System Health Dialog */}
      <Dialog open={showSystemHealth} onOpenChange={setShowSystemHealth}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health Monitor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Wifi className="h-5 w-5 text-green-500" />
                <span>API Status</span>
              </div>
              <Badge variant="secondary">Operational</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-green-500" />
                <span>Database</span>
              </div>
              <Badge variant="secondary">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-green-500" />
                <span>Storage</span>
              </div>
              <Badge variant="secondary">85% Available</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-500" />
                <span>Active Sessions</span>
              </div>
              <Badge variant="secondary">127 online</Badge>
            </div>
          </div>
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
                    <p className="text-xs text-muted-foreground mt-1">{JSON.stringify(log.details).slice(0, 100)}...</p>
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

export default SupportPanel;