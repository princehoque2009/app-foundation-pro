import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Users,
  FileText,
  Download,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LabAnalyticsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LabAnalyticsPanel = ({ open, onOpenChange }: LabAnalyticsPanelProps) => {
  const { user } = useAuth();

  // Fetch profile stats
  const { data: profileStats } = useQuery({
    queryKey: ["profile-analytics", user?.id],
    queryFn: async () => {
      const [profile, posts, postsWeek] = await Promise.all([
        supabase
          .from("profiles")
          .select("followers_count, following_count")
          .eq("id", user?.id)
          .single(),
        supabase
          .from("posts")
          .select("id, likes_count, comments_count", { count: "exact" })
          .eq("user_id", user?.id),
        supabase
          .from("posts")
          .select("id", { count: "exact" })
          .eq("user_id", user?.id)
          .gte("created_at", subDays(new Date(), 7).toISOString()),
      ]);

      const totalLikes = posts.data?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;
      const totalComments = posts.data?.reduce((sum, p) => sum + (p.comments_count || 0), 0) || 0;

      return {
        followers: profile.data?.followers_count || 0,
        following: profile.data?.following_count || 0,
        totalPosts: posts.count || 0,
        postsThisWeek: postsWeek.count || 0,
        totalLikes,
        totalComments,
        engagementRate: posts.count ? ((totalLikes + totalComments) / posts.count).toFixed(1) : "0",
      };
    },
    enabled: !!user?.id && open,
  });

  // Fetch pages stats
  const { data: pagesStats } = useQuery({
    queryKey: ["pages-analytics", user?.id],
    queryFn: async () => {
      const { data: pages, error } = await supabase
        .from("pages")
        .select("id, name, followers_count, posts_count")
        .eq("created_by", user?.id);
      
      if (error) throw error;

      const totalFollowers = pages?.reduce((sum, p) => sum + (p.followers_count || 0), 0) || 0;
      const totalPosts = pages?.reduce((sum, p) => sum + (p.posts_count || 0), 0) || 0;

      return {
        pagesCount: pages?.length || 0,
        totalFollowers,
        totalPosts,
        pages: pages || [],
      };
    },
    enabled: !!user?.id && open,
  });

  // Fetch groups stats
  const { data: groupsStats } = useQuery({
    queryKey: ["groups-analytics", user?.id],
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from("community_groups")
        .select("id, name, members_count, posts_count")
        .eq("created_by", user?.id);
      
      if (error) throw error;

      const totalMembers = groups?.reduce((sum, g) => sum + (g.members_count || 0), 0) || 0;
      const totalPosts = groups?.reduce((sum, g) => sum + (g.posts_count || 0), 0) || 0;

      return {
        groupsCount: groups?.length || 0,
        totalMembers,
        totalPosts,
        groups: groups || [],
      };
    },
    enabled: !!user?.id && open,
  });

  const statCards = [
    { icon: Users, label: "Followers", value: profileStats?.followers || 0, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { icon: FileText, label: "Posts", value: profileStats?.totalPosts || 0, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    { icon: Heart, label: "Total Likes", value: profileStats?.totalLikes || 0, color: "text-pink-500", bgColor: "bg-pink-500/10" },
    { icon: MessageCircle, label: "Comments", value: profileStats?.totalComments || 0, color: "text-green-500", bgColor: "bg-green-500/10" },
    { icon: TrendingUp, label: "Engagement", value: `${profileStats?.engagementRate || 0}/post`, color: "text-amber-500", bgColor: "bg-amber-500/10" },
    { icon: Calendar, label: "This Week", value: profileStats?.postsThisWeek || 0, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0 flex-row items-center justify-between">
          <DialogTitle className="font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analytics
          </DialogTitle>
          <Button variant="ghost" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="pages">Pages</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {statCards.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                          <stat.icon className={cn("h-4 w-4", stat.color)} />
                        </div>
                        <div>
                          <p className="text-lg font-bold">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pages" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <FileText className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{pagesStats?.pagesCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Pages</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Users className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{pagesStats?.totalFollowers || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Followers</p>
                    </div>
                  </div>
                </Card>
              </div>

              {pagesStats?.pages && pagesStats.pages.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Your Pages</h4>
                  {pagesStats.pages.map((page) => (
                    <Card key={page.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{page.name}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {page.followers_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {page.posts_count || 0}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pages yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="groups" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Users className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{groupsStats?.groupsCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Groups</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Users className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{groupsStats?.totalMembers || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Members</p>
                    </div>
                  </div>
                </Card>
              </div>

              {groupsStats?.groups && groupsStats.groups.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Your Groups</h4>
                  {groupsStats.groups.map((group) => (
                    <Card key={group.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{group.name}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {group.members_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {group.posts_count || 0}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No groups yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};