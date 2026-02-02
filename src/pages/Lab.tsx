import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  FileText,
  Users,
  ChevronRight,
  Globe,
  Lock,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { CreatePageDialog } from "@/components/lab/CreatePageDialog";
import { CreateGroupDialog } from "@/components/lab/CreateCommunityGroupDialog";

const Lab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Fetch user's pages
  const { data: pages, isLoading: loadingPages } = useQuery({
    queryKey: ["my-pages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's community groups
  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ["my-community-groups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_groups")
        .select("*")
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch joined groups
  const { data: joinedGroups } = useQuery({
    queryKey: ["joined-community-groups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_group_members")
        .select(`
          group_id,
          role,
          community_groups (*)
        `)
        .eq("user_id", user?.id);
      if (error) throw error;
      return data?.map((m) => ({ ...m.community_groups, memberRole: m.role })) || [];
    },
    enabled: !!user?.id,
  });

  // Fetch followed pages
  const { data: followedPages } = useQuery({
    queryKey: ["followed-pages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_members")
        .select(`
          page_id,
          role,
          pages (*)
        `)
        .eq("user_id", user?.id);
      if (error) throw error;
      return data?.map((m) => ({ ...m.pages, memberRole: m.role })) || [];
    },
    enabled: !!user?.id,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
            <h1 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Lab
            </h1>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreatePage(true)}
                className="gap-1.5"
              >
                <FileText className="h-4 w-4" />
                Page
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateGroup(true)}
                className="gap-1.5"
              >
                <Users className="h-4 w-4" />
                Group
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-screen-xl mx-auto">
          <Tabs defaultValue="pages" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="pages" className="gap-2">
                <FileText className="h-4 w-4" />
                Pages
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2">
                <Users className="h-4 w-4" />
                Groups
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pages">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {/* Your Pages */}
                <motion.div variants={itemVariants}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                    Your Pages
                  </h3>
                  {loadingPages ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Card key={i} className="p-4 animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-muted rounded-xl" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-1/2" />
                              <div className="h-3 bg-muted rounded w-1/3" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : pages && pages.length > 0 ? (
                    <div className="space-y-2">
                      {pages.map((page) => (
                        <Card
                          key={page.id}
                          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/page/${page.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-xl">
                              <AvatarImage src={page.logo_url || ""} />
                              <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                                <FileText className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {page.name}
                              </h4>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                {page.privacy === "public" ? (
                                  <Globe className="h-3 w-3" />
                                ) : (
                                  <Lock className="h-3 w-3" />
                                )}
                                {page.followers_count || 0} followers
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-6 text-center">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">
                        You haven't created any pages yet
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowCreatePage(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Page
                      </Button>
                    </Card>
                  )}
                </motion.div>

                {/* Following Pages */}
                {followedPages && followedPages.length > 0 && (
                  <motion.div variants={itemVariants}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                      Following
                    </h3>
                    <div className="space-y-2">
                      {followedPages.map((page: any) => (
                        <Card
                          key={page.id}
                          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/page/${page.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-xl">
                              <AvatarImage src={page.logo_url || ""} />
                              <AvatarFallback className="rounded-xl bg-muted">
                                <FileText className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {page.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {page.category || "Page"}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="groups">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {/* Your Groups */}
                <motion.div variants={itemVariants}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                    Your Groups
                  </h3>
                  {loadingGroups ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Card key={i} className="p-4 animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-muted rounded-xl" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-1/2" />
                              <div className="h-3 bg-muted rounded w-1/3" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : groups && groups.length > 0 ? (
                    <div className="space-y-2">
                      {groups.map((group) => (
                        <Card
                          key={group.id}
                          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/community/${group.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-xl">
                              <AvatarImage src={group.logo_url || ""} />
                              <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                                <Users className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {group.name}
                              </h4>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                {group.privacy === "public" ? (
                                  <Globe className="h-3 w-3" />
                                ) : (
                                  <Lock className="h-3 w-3" />
                                )}
                                {group.members_count || 0} members
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-6 text-center">
                      <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">
                        You haven't created any groups yet
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowCreateGroup(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Group
                      </Button>
                    </Card>
                  )}
                </motion.div>

                {/* Joined Groups */}
                {joinedGroups && joinedGroups.length > 0 && (
                  <motion.div variants={itemVariants}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                      Joined
                    </h3>
                    <div className="space-y-2">
                      {joinedGroups.map((group: any) => (
                        <Card
                          key={group.id}
                          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/community/${group.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-xl">
                              <AvatarImage src={group.logo_url || ""} />
                              <AvatarFallback className="rounded-xl bg-muted">
                                <Users className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {group.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {group.category || "Group"} · {group.memberRole}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CreatePageDialog open={showCreatePage} onOpenChange={setShowCreatePage} />
      <CreateGroupDialog open={showCreateGroup} onOpenChange={setShowCreateGroup} />
    </MainLayout>
  );
};

export default Lab;
