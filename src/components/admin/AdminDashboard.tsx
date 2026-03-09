import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, Flag, BadgeCheck, MessageSquare, TrendingUp, Activity,
  Eye, CircleDot, Image, Megaphone, Wallet,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { AdminActivityFeed } from "./AdminActivityFeed";
import { AdminOnlineUsers } from "./AdminOnlineUsers";

export const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalPosts },
        { count: pendingReports },
        { count: pendingVerifications },
        { count: supportTickets },
        { count: newUsersToday },
        { count: totalCircles },
        { count: totalStories },
        { count: activeAds },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from("community_groups").select("*", { count: "exact", head: true }),
        supabase.from("stories").select("*", { count: "exact", head: true }),
        supabase.from("advertisements").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);

      return {
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        pendingReports: pendingReports || 0,
        pendingVerifications: pendingVerifications || 0,
        supportTickets: supportTickets || 0,
        newUsersToday: newUsersToday || 0,
        totalCircles: totalCircles || 0,
        totalStories: totalStories || 0,
        activeAds: activeAds || 0,
      };
    },
  });

  // Mock data for charts (in production, fetch from DB)
  const userGrowthData = [
    { name: "Mon", users: 12 },
    { name: "Tue", users: 19 },
    { name: "Wed", users: 15 },
    { name: "Thu", users: 25 },
    { name: "Fri", users: 32 },
    { name: "Sat", users: 28 },
    { name: "Sun", users: 35 },
  ];

  const postActivityData = [
    { name: "Mon", posts: 45 },
    { name: "Tue", posts: 52 },
    { name: "Wed", posts: 38 },
    { name: "Thu", posts: 65 },
    { name: "Fri", posts: 48 },
    { name: "Sat", posts: 72 },
    { name: "Sun", posts: 58 },
  ];

  const reportsByCategory = [
    { name: "Spam", value: 35, color: "hsl(var(--chart-1))" },
    { name: "Harassment", value: 25, color: "hsl(var(--chart-2))" },
    { name: "Hate Speech", value: 15, color: "hsl(var(--chart-3))" },
    { name: "Fake Info", value: 15, color: "hsl(var(--chart-4))" },
    { name: "Other", value: 10, color: "hsl(var(--chart-5))" },
  ];

  const chartConfig = {
    users: { label: "Users", color: "hsl(var(--primary))" },
    posts: { label: "Posts", color: "hsl(var(--chart-2))" },
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      change: `+${stats?.newUsersToday || 0} today`,
    },
    {
      title: "Total Posts",
      value: stats?.totalPosts || 0,
      icon: FileText,
    },
    {
      title: "Circles",
      value: stats?.totalCircles || 0,
      icon: CircleDot,
    },
    {
      title: "Stories",
      value: stats?.totalStories || 0,
      icon: Image,
    },
    {
      title: "Pending Reports",
      value: stats?.pendingReports || 0,
      icon: Flag,
      urgent: (stats?.pendingReports || 0) > 0,
    },
    {
      title: "Verifications",
      value: stats?.pendingVerifications || 0,
      icon: BadgeCheck,
    },
    {
      title: "Support Tickets",
      value: stats?.supportTickets || 0,
      icon: MessageSquare,
    },
    {
      title: "Active Ads",
      value: stats?.activeAds || 0,
      icon: Megaphone,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <Card key={i} className={`border-0 shadow-sm hover:shadow-md transition-all ${stat.urgent ? 'ring-2 ring-destructive/50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-muted">
                  <stat.icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  {stat.change && (
                    <p className="text-xs text-primary font-medium mt-0.5">{stat.change}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Panels Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <AdminActivityFeed />
        <AdminOnlineUsers />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-foreground" />
              User Growth (This Week)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#userGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Post Activity Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-foreground" />
              Post Activity (This Week)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={postActivityData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="posts"
                    fill="hsl(var(--chart-2))"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Reports by Category */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Flag className="h-5 w-5 text-foreground" />
            Reports by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportsByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {reportsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4">
              {reportsByCategory.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
