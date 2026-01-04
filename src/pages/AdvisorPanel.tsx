import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  MessageSquare,
  FileText,
  Activity,
  Calendar,
  BarChart3,
} from "lucide-react";

const AdvisorPanel = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("7d");

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ["advisor-user-stats"],
    queryFn: async () => {
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { count: newUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      const { count: verifiedUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_verified", true);

      return {
        totalUsers: totalUsers || 0,
        newUsers: newUsers || 0,
        verifiedUsers: verifiedUsers || 0,
      };
    },
  });

  // Fetch content stats
  const { data: contentStats } = useQuery({
    queryKey: ["advisor-content-stats"],
    queryFn: async () => {
      const { count: totalPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      const { count: totalReels } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("is_reel", true);

      const { count: totalComments } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true });

      return {
        totalPosts: totalPosts || 0,
        totalReels: totalReels || 0,
        totalComments: totalComments || 0,
      };
    },
  });

  // Fetch recent activity
  const { data: recentPosts } = useQuery({
    queryKey: ["advisor-recent-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, caption, created_at, media_type, is_reel")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch report trends
  const { data: reportStats } = useQuery({
    queryKey: ["advisor-report-stats"],
    queryFn: async () => {
      const { count: pendingReports } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: resolvedReports } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "resolved");

      return {
        pending: pendingReports || 0,
        resolved: resolvedReports || 0,
      };
    },
  });

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
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userStats?.totalUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">+{userStats?.newUsers || 0}</p>
                <p className="text-xs text-muted-foreground">New (7 days)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contentStats?.totalPosts || 0}</p>
                <p className="text-xs text-muted-foreground">Total Posts</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <MessageSquare className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {contentStats?.totalComments || 0}
                </p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Insights Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="activity" className="flex-1">
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex-1">
              <BarChart3 className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5" />
                  Recent Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {recentPosts?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent posts
                      </div>
                    ) : (
                      recentPosts?.map((post: any) => (
                        <div
                          key={post.id}
                          className="p-3 rounded-lg border border-border"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm line-clamp-2">
                                {post.caption || "No caption"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(
                                  new Date(post.created_at),
                                  "MMM d, h:mm a"
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {post.media_type || "text"}
                              </Badge>
                              {post.is_reel && (
                                <Badge variant="secondary" className="text-xs">
                                  Reel
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">User Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Verified Users</span>
                    <span className="font-semibold">
                      {userStats?.verifiedUsers || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Verification Rate</span>
                    <span className="font-semibold">
                      {userStats?.totalUsers
                        ? (
                            ((userStats.verifiedUsers || 0) /
                              userStats.totalUsers) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Content Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Total Reels</span>
                    <span className="font-semibold">
                      {contentStats?.totalReels || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Reels Percentage</span>
                    <span className="font-semibold">
                      {contentStats?.totalPosts
                        ? (
                            ((contentStats.totalReels || 0) /
                              contentStats.totalPosts) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Report Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                    <span className="text-sm">Pending Reports</span>
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600">{reportStats?.pending || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <span className="text-sm">Resolved Reports</span>
                    <Badge variant="outline" className="bg-green-500/20 text-green-600">{reportStats?.resolved || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvisorPanel;
