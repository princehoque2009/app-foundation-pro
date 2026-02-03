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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  FileText,
  Users,
  ChevronRight,
  Globe,
  Lock,
  Sparkles,
  Search,
  LayoutGrid,
  List,
  BarChart3,
  Settings,
  Filter,
  Clock,
  TrendingUp,
  UserCircle,
  RefreshCw,
  Palette,
  DollarSign,
  Shield,
  Cog,
  Zap,
} from "lucide-react";
import { CreatePageDialog } from "@/components/lab/CreatePageDialog";
import { CreateGroupDialog } from "@/components/lab/CreateCommunityGroupDialog";
import { LabIdentitySwitcher } from "@/components/lab/LabIdentitySwitcher";
import { LabAnalyticsPanel } from "@/components/lab/LabAnalyticsPanel";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type SortMode = "newest" | "active" | "name";

const Lab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showIdentitySwitcher, setShowIdentitySwitcher] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch current user profile
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's pages
  const { data: pages, isLoading: loadingPages, refetch: refetchPages } = useQuery({
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
  const { data: groups, isLoading: loadingGroups, refetch: refetchGroups } = useQuery({
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

  // Filter and sort pages
  const filteredPages = pages?.filter(page => 
    page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (sortMode === "newest") {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    } else if (sortMode === "name") {
      return a.name.localeCompare(b.name);
    } else {
      return (b.followers_count || 0) - (a.followers_count || 0);
    }
  });

  // Filter and sort groups
  const filteredGroups = groups?.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (sortMode === "newest") {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    } else if (sortMode === "name") {
      return a.name.localeCompare(b.name);
    } else {
      return (b.members_count || 0) - (a.members_count || 0);
    }
  });

  const handleRefresh = () => {
    refetchPages();
    refetchGroups();
  };

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

  // Feature cards for quick actions
  const featureCards = [
    { 
      id: "create-page", 
      icon: FileText, 
      label: "Create Page", 
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      onClick: () => setShowCreatePage(true),
    },
    { 
      id: "create-group", 
      icon: Users, 
      label: "Create Group", 
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      onClick: () => setShowCreateGroup(true),
    },
    { 
      id: "switch-identity", 
      icon: RefreshCw, 
      label: "Switch Identity", 
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      onClick: () => setShowIdentitySwitcher(true),
    },
    { 
      id: "analytics", 
      icon: BarChart3, 
      label: "Analytics", 
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      onClick: () => setShowAnalytics(true),
    },
  ];

  const renderPageCard = (page: any, isOwned: boolean = true) => (
    <Card
      key={page.id}
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-all",
        viewMode === "grid" ? "p-3" : "p-4"
      )}
      onClick={() => navigate(`/page/${page.id}`)}
    >
      <div className={cn(
        "flex gap-3",
        viewMode === "grid" ? "flex-col items-center text-center" : "items-center"
      )}>
        <Avatar className={cn(
          "rounded-xl",
          viewMode === "grid" ? "h-16 w-16" : "h-12 w-12"
        )}>
          <AvatarImage src={page.logo_url || ""} />
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
            <FileText className={viewMode === "grid" ? "h-6 w-6" : "h-5 w-5"} />
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          "min-w-0",
          viewMode === "grid" ? "" : "flex-1"
        )}>
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm truncate">
              {page.name}
            </h4>
            {isOwned && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Owner</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
            {page.privacy === "public" ? (
              <Globe className="h-3 w-3" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
            {page.followers_count || 0} followers
          </p>
        </div>
        {viewMode === "list" && isOwned && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowAnalytics(true);
              }}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/page/${page.id}/settings`);
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        {viewMode === "list" && !isOwned && (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </Card>
  );

  const renderGroupCard = (group: any, isOwned: boolean = true) => (
    <Card
      key={group.id}
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-all",
        viewMode === "grid" ? "p-3" : "p-4"
      )}
      onClick={() => navigate(`/community/${group.id}`)}
    >
      <div className={cn(
        "flex gap-3",
        viewMode === "grid" ? "flex-col items-center text-center" : "items-center"
      )}>
        <Avatar className={cn(
          "rounded-xl",
          viewMode === "grid" ? "h-16 w-16" : "h-12 w-12"
        )}>
          <AvatarImage src={group.logo_url || ""} />
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
            <Users className={viewMode === "grid" ? "h-6 w-6" : "h-5 w-5"} />
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          "min-w-0",
          viewMode === "grid" ? "" : "flex-1"
        )}>
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm truncate">
              {group.name}
            </h4>
            {isOwned && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Owner</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
            {group.privacy === "public" ? (
              <Globe className="h-3 w-3" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
            {group.members_count || 0} members
          </p>
        </div>
        {viewMode === "list" && isOwned && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowAnalytics(true);
              }}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/community/${group.id}/settings`);
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        {viewMode === "list" && !isOwned && (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </Card>
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <h1 className="font-semibold text-lg leading-tight">Lab</h1>
                <p className="text-[10px] text-muted-foreground leading-none">Create & manage your presence</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active Identity Badge */}
        <div className="px-4 py-3 border-b border-border">
          <button
            onClick={() => setShowIdentitySwitcher(true)}
            className="flex items-center gap-3 p-3 w-full rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback>
                <UserCircle className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">{profile?.display_name || profile?.username}</p>
              <p className="text-xs text-muted-foreground">Active Identity · Personal Account</p>
            </div>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            {featureCards.map((card) => (
              <motion.button
                key={card.id}
                whileTap={{ scale: 0.95 }}
                onClick={card.onClick}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
              >
                <div className={cn("p-2 rounded-xl", card.bgColor)}>
                  <card.icon className={cn("h-5 w-5", card.color)} />
                </div>
                <span className="text-[11px] font-medium text-center leading-tight">{card.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Search & Controls */}
        <div className="px-4 py-3 border-b border-border bg-background">
          <div className="flex gap-2 max-w-screen-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages & groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-0"
              />
            </div>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setSortMode("newest")}
                    className={cn(sortMode === "newest" && "bg-muted")}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Newest
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortMode("active")}
                    className={cn(sortMode === "active" && "bg-muted")}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Most Active
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortMode("name")}
                    className={cn(sortMode === "name" && "bg-muted")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    By Name
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-screen-xl mx-auto">
          <Tabs defaultValue="pages" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="pages" className="gap-2">
                <FileText className="h-4 w-4" />
                Pages
                {pages && pages.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pages.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2">
                <Users className="h-4 w-4" />
                Groups
                {groups && groups.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{groups.length}</Badge>
                )}
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
                    <div className={cn(
                      viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"
                    )}>
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
                  ) : filteredPages && filteredPages.length > 0 ? (
                    <div className={cn(
                      viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"
                    )}>
                      {filteredPages.map((page) => renderPageCard(page, true))}
                    </div>
                  ) : (
                    <Card className="p-6 text-center">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">
                        {searchQuery ? "No pages match your search" : "You haven't created any pages yet"}
                      </p>
                      {!searchQuery && (
                        <Button
                          size="sm"
                          onClick={() => setShowCreatePage(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Create Page
                        </Button>
                      )}
                    </Card>
                  )}
                </motion.div>

                {/* Following Pages */}
                {followedPages && followedPages.length > 0 && (
                  <motion.div variants={itemVariants}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                      Following
                    </h3>
                    <div className={cn(
                      viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"
                    )}>
                      {followedPages.map((page: any) => renderPageCard(page, false))}
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
                    <div className={cn(
                      viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"
                    )}>
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
                  ) : filteredGroups && filteredGroups.length > 0 ? (
                    <div className={cn(
                      viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"
                    )}>
                      {filteredGroups.map((group) => renderGroupCard(group, true))}
                    </div>
                  ) : (
                    <Card className="p-6 text-center">
                      <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">
                        {searchQuery ? "No groups match your search" : "You haven't created any groups yet"}
                      </p>
                      {!searchQuery && (
                        <Button
                          size="sm"
                          onClick={() => setShowCreateGroup(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Create Group
                        </Button>
                      )}
                    </Card>
                  )}
                </motion.div>

                {/* Joined Groups */}
                {joinedGroups && joinedGroups.filter((g: any) => g?.created_by !== user?.id).length > 0 && (
                  <motion.div variants={itemVariants}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                      Joined
                    </h3>
                    <div className={cn(
                      viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"
                    )}>
                      {joinedGroups.filter((g: any) => g?.created_by !== user?.id).map((group: any) => renderGroupCard(group, false))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <CreatePageDialog open={showCreatePage} onOpenChange={setShowCreatePage} />
      <CreateGroupDialog open={showCreateGroup} onOpenChange={setShowCreateGroup} />
      <LabIdentitySwitcher open={showIdentitySwitcher} onOpenChange={setShowIdentitySwitcher} />
      <LabAnalyticsPanel open={showAnalytics} onOpenChange={setShowAnalytics} />
    </MainLayout>
  );
};

export default Lab;