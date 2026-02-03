import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PanelStatsGrid, PanelStatItem } from "./PanelStatsGrid";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  FileText,
  Globe,
  Lock,
  Trash2,
  Eye,
  Settings,
  Search,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Crown,
  UserPlus,
  TrendingUp,
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  privacy: string;
  members_count: number;
  posts_count: number;
  created_at: string;
  created_by: string;
  creator?: {
    username: string;
    avatar_url?: string;
  };
}

interface Page {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  privacy: string;
  followers_count: number;
  posts_count: number;
  created_at: string;
  created_by: string;
  creator?: {
    username: string;
    avatar_url?: string;
  };
}

export const GroupsPagesPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch groups
  const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_groups")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const creatorIds = [...new Set(data?.map((g) => g.created_by) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", creatorIds);

      return data?.map((group) => ({
        ...group,
        creator: profiles?.find((p) => p.id === group.created_by),
      })) as Group[];
    },
  });

  // Fetch pages
  const { data: pages, isLoading: pagesLoading, refetch: refetchPages } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const creatorIds = [...new Set(data?.map((p) => p.created_by) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", creatorIds);

      return data?.map((page) => ({
        ...page,
        creator: profiles?.find((p) => p.id === page.created_by),
      })) as Page[];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin-groups-pages-stats"],
    queryFn: async () => {
      const [totalGroups, publicGroups, totalPages, publicPages] = await Promise.all([
        supabase.from("community_groups").select("*", { count: "exact", head: true }),
        supabase.from("community_groups").select("*", { count: "exact", head: true }).eq("privacy", "public"),
        supabase.from("pages").select("*", { count: "exact", head: true }),
        supabase.from("pages").select("*", { count: "exact", head: true }).eq("privacy", "public"),
      ]);

      return {
        totalGroups: totalGroups.count || 0,
        publicGroups: publicGroups.count || 0,
        totalPages: totalPages.count || 0,
        publicPages: publicPages.count || 0,
      };
    },
  });

  // Delete mutations
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("community_groups").delete().eq("id", groupId);
      if (error) throw error;

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "group_deleted",
        target_id: groupId,
        target_type: "community_group",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin-groups-pages-stats"] });
      setShowDeleteDialog(false);
      setSelectedGroup(null);
      toast({ title: "Group deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.from("pages").delete().eq("id", pageId);
      if (error) throw error;

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "page_deleted",
        target_id: pageId,
        target_type: "page",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-groups-pages-stats"] });
      setShowDeleteDialog(false);
      setSelectedPage(null);
      toast({ title: "Page deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredGroups = groups?.filter((g) => {
    if (searchQuery) {
      return g.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const filteredPages = pages?.filter((p) => {
    if (searchQuery) {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const statsItems: PanelStatItem[] = [
    {
      label: "Total Groups",
      value: stats?.totalGroups || 0,
      icon: Users,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Public Groups",
      value: stats?.publicGroups || 0,
      icon: Globe,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Total Pages",
      value: stats?.totalPages || 0,
      icon: FileText,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Public Pages",
      value: stats?.publicPages || 0,
      icon: Globe,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <PanelStatsGrid stats={statsItems} columns={4} />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => activeTab === "groups" ? refetchGroups() : refetchPages()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            Groups ({groups?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-2">
            <FileText className="h-4 w-4" />
            Pages ({pages?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        <TabsContent value="groups" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {groupsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredGroups?.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No groups found
                    </div>
                  ) : (
                    filteredGroups?.map((group) => (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedGroup(group)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-lg">
                              <AvatarImage src={group.logo_url} />
                              <AvatarFallback className="rounded-lg">{group.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{group.name}</span>
                                <Badge variant={group.privacy === "public" ? "secondary" : "outline"}>
                                  {group.privacy === "public" ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                                  {group.privacy}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">{group.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {group.members_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {group.posts_count}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {pagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredPages?.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No pages found
                    </div>
                  ) : (
                    filteredPages?.map((page) => (
                      <motion.div
                        key={page.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedPage(page)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-lg">
                              <AvatarImage src={page.logo_url} />
                              <AvatarFallback className="rounded-lg">{page.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{page.name}</span>
                                <Badge variant={page.privacy === "public" ? "secondary" : "outline"}>
                                  {page.privacy === "public" ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                                  {page.privacy}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">{page.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <UserPlus className="h-4 w-4" />
                              {page.followers_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {page.posts_count}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Group Detail Dialog */}
      <Dialog open={!!selectedGroup && !showDeleteDialog} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent>
          {selectedGroup && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 rounded-lg">
                    <AvatarImage src={selectedGroup.logo_url} />
                    <AvatarFallback className="rounded-lg">{selectedGroup.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selectedGroup.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      Created by @{selectedGroup.creator?.username}
                    </p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm">{selectedGroup.description || "No description"}</p>
                <div className="flex gap-3">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {selectedGroup.members_count} members
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" />
                    {selectedGroup.posts_count} posts
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {selectedGroup.privacy === "public" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {selectedGroup.privacy}
                  </Badge>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => window.open(`/groups/${selectedGroup.id}`, "_blank")}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Group
                </Button>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Page Detail Dialog */}
      <Dialog open={!!selectedPage && !showDeleteDialog} onOpenChange={() => setSelectedPage(null)}>
        <DialogContent>
          {selectedPage && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 rounded-lg">
                    <AvatarImage src={selectedPage.logo_url} />
                    <AvatarFallback className="rounded-lg">{selectedPage.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selectedPage.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      Created by @{selectedPage.creator?.username}
                    </p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm">{selectedPage.description || "No description"}</p>
                <div className="flex gap-3">
                  <Badge variant="secondary" className="gap-1">
                    <UserPlus className="h-3 w-3" />
                    {selectedPage.followers_count} followers
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" />
                    {selectedPage.posts_count} posts
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {selectedPage.privacy === "public" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {selectedPage.privacy}
                  </Badge>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => window.open(`/pages/${selectedPage.id}`, "_blank")}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Page
                </Button>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. All posts and members will be removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedGroup) {
                  deleteGroupMutation.mutate(selectedGroup.id);
                } else if (selectedPage) {
                  deletePageMutation.mutate(selectedPage.id);
                }
              }}
              disabled={deleteGroupMutation.isPending || deletePageMutation.isPending}
            >
              {(deleteGroupMutation.isPending || deletePageMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
