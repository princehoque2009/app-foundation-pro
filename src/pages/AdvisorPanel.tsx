import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from "recharts";

const AdvisorPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [guidanceNote, setGuidanceNote] = useState("");

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ["advisor-user-stats"],
    queryFn: async () => {
      const today = new Date();
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      const [totalUsers, newUsersWeek, newUsersMonth, verifiedUsers] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
      ]);

      return {
        totalUsers: totalUsers.count || 0,
        newUsersWeek: newUsersWeek.count || 0,
        newUsersMonth: newUsersMonth.count || 0,
        verifiedUsers: verifiedUsers.count || 0,
        growthRate: totalUsers.count ? ((newUsersWeek.count || 0) / totalUsers.count * 100).toFixed(1) : "0",
      };
    },
  });

  // Fetch content stats
  const { data: contentStats } = useQuery({
    queryKey: ["advisor-content-stats"],
    queryFn: async () => {
      const weekAgo = subDays(new Date(), 7);

      const [totalPosts, totalReels, totalComments, weekPosts] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_reel", true),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
      ]);

      return {
        totalPosts: totalPosts.count || 0,
        totalReels: totalReels.count || 0,
        totalComments: totalComments.count || 0,
        weekPosts: weekPosts.count || 0,
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

      // Fetch user profiles
      const userIds = [...new Set(data?.map((p) => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, display_name")
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
        .select("id, caption, created_at, media_type, is_reel, likes_count, user_id")
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;

      const userIds = [...new Set(data?.map((p) => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      return data?.map((post) => ({
        ...post,
        user: profiles?.find((p) => p.id === post.user_id),
      }));
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
      queryClient.invalidateQueries({ queryKey: ["admin-logs"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  // Mock chart data
  const engagementData = [
    { name: "Mon", engagement: 450 },
    { name: "Tue", engagement: 520 },
    { name: "Wed", engagement: 380 },
    { name: "Thu", engagement: 650 },
    { name: "Fri", engagement: 480 },
    { name: "Sat", engagement: 720 },
    { name: "Sun", engagement: 580 },
  ];

  const chartConfig = {
    engagement: { label: "Engagement", color: "hsl(var(--primary))" },
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
          <h1 className="font-semibold text-lg">Advisor Panel</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-screen-xl mx-auto">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3">
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
                  <MessageSquare className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contentStats?.totalComments || 0}</p>
                  <p className="text-xs text-muted-foreground">Comments</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Engagement Chart */}
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
                    <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#engagementGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Insights Tabs */}
        <Tabs defaultValue="top" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="top" className="flex-1">
              <Star className="h-4 w-4 mr-2" />
              Top Content
            </TabsTrigger>
            <TabsTrigger value="guidance" className="flex-1">
              <Lightbulb className="h-4 w-4 mr-2" />
              Guidance
            </TabsTrigger>
            <TabsTrigger value="health" className="flex-1">
              <BarChart3 className="h-4 w-4 mr-2" />
              Health
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
                <ScrollArea className="h-[350px]">
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
                          <AvatarFallback>
                            {post.user?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            @{post.user?.username}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {post.caption || "No caption"}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ThumbsUp className="h-3 w-3" />
                              {post.likes_count || 0}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              {post.comments_count || 0}
                            </span>
                            {post.is_reel && (
                              <Badge variant="secondary" className="text-xs">Reel</Badge>
                            )}
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
                <ScrollArea className="h-[350px]">
                  <div className="space-y-3">
                    {recentPosts?.map((post: any) => (
                      <div
                        key={post.id}
                        className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={post.user?.avatar_url} />
                          <AvatarFallback>
                            {post.user?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">@{post.user?.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {post.caption || "No caption"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => setSelectedPost(post)}
                        >
                          <Lightbulb className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Community Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Verified Users</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{userStats?.verifiedUsers || 0}</span>
                      <Badge variant="outline" className="text-xs">
                        {userStats?.totalUsers ? ((userStats.verifiedUsers / userStats.totalUsers) * 100).toFixed(1) : 0}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Weekly Growth Rate</span>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      +{userStats?.growthRate || 0}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Content This Week</span>
                    <span className="font-semibold">{contentStats?.weekPosts || 0} posts</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Report Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                    <span className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      Pending Reports
                    </span>
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                      {reportStats?.pending || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <span className="text-sm">Resolved Reports</span>
                    <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
                      {reportStats?.resolved || 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Guidance Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Send Guidance
            </DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedPost.user?.avatar_url} />
                    <AvatarFallback>{selectedPost.user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">@{selectedPost.user?.username}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedPost.caption || "No caption"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Guidance Message</p>
                <Textarea
                  placeholder="Share helpful tips or suggestions for improving their content..."
                  value={guidanceNote}
                  onChange={(e) => setGuidanceNote(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This will be sent as a friendly notification to the user.
                </p>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => sendGuidance.mutate({
                    postId: selectedPost.id,
                    userId: selectedPost.user_id,
                    message: guidanceNote,
                  })}
                  disabled={!guidanceNote.trim() || sendGuidance.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Guidance
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvisorPanel;
