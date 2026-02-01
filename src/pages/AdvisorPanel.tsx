import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  TrendingUp,
  Users,
  MessageSquare,
  FileText,
  Activity,
  Calendar,
  BarChart3,
  Star,
  Award,
  Sparkles,
  Eye,
  ThumbsUp,
  AlertCircle,
  Lightbulb,
  Send,
  RefreshCw,
  Search,
  Filter,
  Download,
  History,
  UserCheck,
  UserPlus,
  Heart,
  Zap,
  Target,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, LineChart, Line } from "recharts";

const AdvisorPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [guidanceNote, setGuidanceNote] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Fetch user stats
  const { data: userStats, refetch } = useQuery({
    queryKey: ["advisor-user-stats"],
    queryFn: async () => {
      const today = new Date();
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      const [totalUsers, newUsersWeek, newUsersMonth, verifiedUsers, suspendedUsers] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_suspended", true),
      ]);

      return {
        totalUsers: totalUsers.count || 0,
        newUsersWeek: newUsersWeek.count || 0,
        newUsersMonth: newUsersMonth.count || 0,
        verifiedUsers: verifiedUsers.count || 0,
        suspendedUsers: suspendedUsers.count || 0,
        growthRate: totalUsers.count ? ((newUsersWeek.count || 0) / totalUsers.count * 100).toFixed(1) : "0",
      };
    },
    refetchInterval: 60000,
  });

  // Fetch content stats
  const { data: contentStats } = useQuery({
    queryKey: ["advisor-content-stats"],
    queryFn: async () => {
      const weekAgo = subDays(new Date(), 7);

      const [totalPosts, totalReels, totalComments, totalLikes, weekPosts, weekComments] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_reel", true),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.from("likes").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
        supabase.from("comments").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
      ]);

      return {
        totalPosts: totalPosts.count || 0,
        totalReels: totalReels.count || 0,
        totalComments: totalComments.count || 0,
        totalLikes: totalLikes.count || 0,
        weekPosts: weekPosts.count || 0,
        weekComments: weekComments.count || 0,
      };
    },
  });

  // Fetch top performing posts
  const { data: topPosts } = useQuery({
    queryKey: ["advisor-top-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, caption, created_at, media_type, is_reel, likes_count, comments_count, user_id")
        .order("likes_count", { ascending: false })
        .limit(10);

      if (error) throw error;

      const userIds = [...new Set(data?.map((p) => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, display_name, is_verified")
        .in("id", userIds);

      return data?.map((post) => ({
        ...post,
        user: profiles?.find((p) => p.id === post.user_id),
      }));
    },
  });

  // Fetch recent posts for guidance
  const { data: recentPosts } = useQuery({
    queryKey: ["advisor-recent-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, caption, created_at, media_type, is_reel, likes_count, comments_count, user_id")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const userIds = [...new Set(data?.map((p) => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, is_verified")
        .in("id", userIds);

      return data?.map((post) => ({
        ...post,
        user: profiles?.find((p) => p.id === post.user_id),
      }));
    },
  });

  // Fetch profiles to review
  const { data: profilesForReview } = useQuery({
    queryKey: ["advisor-profiles-review", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchQuery) {
        query = query.ilike("username", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch report stats
  const { data: reportStats } = useQuery({
    queryKey: ["advisor-report-stats"],
    queryFn: async () => {
      const [pending, resolved, dismissed] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "resolved"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "dismissed"),
      ]);

      return {
        pending: pending.count || 0,
        resolved: resolved.count || 0,
        dismissed: dismissed.count || 0,
      };
    },
  });

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ["advisor-audit-log", user?.id],
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

  // Send guidance notification
  const sendGuidance = useMutation({
    mutationFn: async ({ postId, userId, message }: { postId: string; userId: string; message: string }) => {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Content Guidance",
        message,
        type: "advisor_guidance",
        from_user_id: user?.id,
        action_url: `/post/${postId}`,
      });

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "guidance_sent",
        target_id: postId,
        target_type: "post",
        details: { message },
      });
    },
    onSuccess: () => {
      toast({ title: "Guidance sent successfully" });
      setSelectedPost(null);
      setGuidanceNote("");
      queryClient.invalidateQueries({ queryKey: ["advisor-audit-log"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  // Send profile feedback
  const sendProfileFeedback = useMutation({
    mutationFn: async ({ userId, message, action }: { userId: string; message: string; action: "feedback" | "recommend_verify" | "flag" }) => {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: action === "recommend_verify" ? "Verification Recommendation" : "Profile Feedback",
        message,
        type: "advisor_feedback",
        from_user_id: user?.id,
        action_url: `/profile/${userId}`,
      });

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: `profile_${action}`,
        target_id: userId,
        target_type: "profile",
        details: { message, action },
      });
    },
    onSuccess: () => {
      toast({ title: "Feedback sent successfully" });
      setSelectedProfile(null);
      setFeedbackNote("");
      queryClient.invalidateQueries({ queryKey: ["advisor-audit-log"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  // Chart data
  const engagementData = [
    { name: "Mon", posts: 45, comments: 120, likes: 450 },
    { name: "Tue", posts: 52, comments: 150, likes: 520 },
    { name: "Wed", posts: 38, comments: 90, likes: 380 },
    { name: "Thu", posts: 65, comments: 180, likes: 650 },
    { name: "Fri", posts: 48, comments: 130, likes: 480 },
    { name: "Sat", posts: 72, comments: 200, likes: 720 },
    { name: "Sun", posts: 58, comments: 160, likes: 580 },
  ];

  const userGrowthData = [
    { name: "Week 1", users: 1200 },
    { name: "Week 2", users: 1450 },
    { name: "Week 3", users: 1680 },
    { name: "Week 4", users: 1920 },
  ];

  const chartConfig = {
    posts: { label: "Posts", color: "hsl(var(--primary))" },
    comments: { label: "Comments", color: "hsl(38 92% 50%)" },
    likes: { label: "Likes", color: "hsl(350 89% 60%)" },
    users: { label: "Users", color: "hsl(var(--primary))" },
  };

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      userStats,
      contentStats,
      reportStats,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advisor_report_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported" });
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
          <h1 className="font-semibold text-lg">Advisor Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowAuditLog(true)}>
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={exportReport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-screen-2xl mx-auto">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats?.totalUsers || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">+{userStats?.newUsersWeek || 0}</p>
                  <p className="text-xs text-muted-foreground">New (7 days)</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10">
                  <FileText className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contentStats?.totalPosts || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Posts</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-500/10">
                  <Heart className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contentStats?.totalLikes || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Likes</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <UserCheck className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats?.verifiedUsers || 0}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card className={`p-4 ${(reportStats?.pending || 0) > 0 ? "ring-2 ring-destructive/50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reportStats?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">Open Reports</p>
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
                <Activity className="h-5 w-5 text-primary" />
                Weekly Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={engagementData}>
                    <defs>
                      <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="posts" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#postsGradient)" />
                    <Area type="monotone" dataKey="likes" stroke="hsl(350 89% 60%)" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-500" />
                User Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userGrowthData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Community Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              Community Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-green-500/10 text-center">
                <p className="text-3xl font-bold text-green-500">85%</p>
                <p className="text-sm text-muted-foreground">Engagement Rate</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 text-center">
                <p className="text-3xl font-bold text-blue-500">92%</p>
                <p className="text-sm text-muted-foreground">Content Quality</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 text-center">
                <p className="text-3xl font-bold text-amber-500">78%</p>
                <p className="text-sm text-muted-foreground">User Retention</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10 text-center">
                <p className="text-3xl font-bold text-purple-500">96%</p>
                <p className="text-sm text-muted-foreground">Safety Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights Tabs */}
        <Tabs defaultValue="top" className="space-y-4">
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger value="top" className="flex-1 lg:flex-initial">
              <Star className="h-4 w-4 mr-2" />
              Top Content
            </TabsTrigger>
            <TabsTrigger value="guidance" className="flex-1 lg:flex-initial">
              <Lightbulb className="h-4 w-4 mr-2" />
              Guidance
            </TabsTrigger>
            <TabsTrigger value="profiles" className="flex-1 lg:flex-initial">
              <Users className="h-4 w-4 mr-2" />
              Profiles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="top">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Performing Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {topPosts?.map((post: any, index: number) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.user?.avatar_url} />
                          <AvatarFallback>{post.user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">@{post.user?.username}</p>
                            {post.user?.is_verified && <CheckCircle className="h-3 w-3 text-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{post.caption || "No caption"}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ThumbsUp className="h-3 w-3" />
                              {post.likes_count || 0}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              {post.comments_count || 0}
                            </span>
                            {post.is_reel && <Badge variant="secondary" className="text-xs">Reel</Badge>}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guidance">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Content Guidance
                  <Badge variant="secondary" className="ml-2 text-xs">Send helpful tips</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {recentPosts?.map((post: any) => (
                      <div
                        key={post.id}
                        className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={post.user?.avatar_url} />
                          <AvatarFallback>{post.user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">@{post.user?.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.caption || "No caption"}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ThumbsUp className="h-3 w-3" /> {post.likes_count}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MessageSquare className="h-3 w-3" /> {post.comments_count}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setSelectedPost(post)}>
                          <Lightbulb className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profiles">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-blue-500" />
                    Profile Review
                  </CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {profilesForReview?.map((profile: any) => (
                      <div
                        key={profile.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedProfile(profile)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback>{profile.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">@{profile.username}</span>
                            {profile.is_verified && <CheckCircle className="h-3 w-3 text-primary" />}
                            {profile.is_suspended && <XCircle className="h-3 w-3 text-destructive" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {profile.followers_count || 0} followers
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Guidance Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-500" />
              Send Content Guidance
            </DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm line-clamp-3">{selectedPost.caption || "No caption"}</p>
                <p className="text-xs text-muted-foreground mt-2">by @{selectedPost.user?.username}</p>
              </div>
              <Textarea
                value={guidanceNote}
                onChange={(e) => setGuidanceNote(e.target.value)}
                placeholder="Enter your guidance or suggestion..."
                rows={4}
              />
              <DialogFooter>
                <Button
                  onClick={() => sendGuidance.mutate({
                    postId: selectedPost.id,
                    userId: selectedPost.user_id,
                    message: guidanceNote,
                  })}
                  disabled={sendGuidance.isPending || !guidanceNote.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Guidance
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Feedback Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Profile Review
            </DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedProfile.avatar_url} />
                  <AvatarFallback>{selectedProfile.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedProfile.display_name || selectedProfile.username}</p>
                  <p className="text-sm text-muted-foreground">@{selectedProfile.username}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{selectedProfile.followers_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{selectedProfile.following_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{selectedProfile.is_verified ? "Yes" : "No"}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
              </div>

              <Textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="Enter feedback or recommendation..."
                rows={3}
              />

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => sendProfileFeedback.mutate({
                    userId: selectedProfile.id,
                    message: feedbackNote || "Your profile has been flagged for review.",
                    action: "flag",
                  })}
                  disabled={sendProfileFeedback.isPending}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Flag
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sendProfileFeedback.mutate({
                    userId: selectedProfile.id,
                    message: feedbackNote || "We recommend you apply for verification!",
                    action: "recommend_verify",
                  })}
                  disabled={sendProfileFeedback.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Recommend Verify
                </Button>
                <Button
                  onClick={() => sendProfileFeedback.mutate({
                    userId: selectedProfile.id,
                    message: feedbackNote,
                    action: "feedback",
                  })}
                  disabled={sendProfileFeedback.isPending || !feedbackNote.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Feedback
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

export default AdvisorPanel;