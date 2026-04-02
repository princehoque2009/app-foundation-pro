import { MainLayout } from "@/components/layout/MainLayout";
import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CircleDot, Plus, Search, X, TrendingUp, Sparkles, Clock, Users, Mail, Check, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CircleCard } from "@/components/circles/CircleCard";
import { CirclePreviewItem } from "@/components/circles/CirclePreviewItem";
import { CircleFeedPost } from "@/components/circles/CircleFeedPost";
import { CreateCircleDialog } from "@/components/circles/CreateCircleDialog";
import { InsideCirclePage } from "@/components/circles/InsideCirclePage";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SmartFeedAd } from "@/components/ads/SmartFeedAd";

const FILTER_TABS = ["For You", "Your Circles", "Trending", "New"];
const CATEGORIES = ["All", "Technology", "Education", "Gaming", "Business", "Science", "Lifestyle", "Sports", "Music", "Art", "Health", "Travel", "General"];

const Circles = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [activeCircle, setActiveCircle] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("For You");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allCircles, isLoading } = useQuery({
    queryKey: ["circles", user?.id],
    queryFn: async () => {
      const { data: circles } = await supabase.from("community_groups").select("*").order("created_at", { ascending: false });
      if (!circles) return [];
      const { data: memberCounts } = await supabase.from("community_group_members").select("group_id");
      const countMap: Record<string, number> = {};
      memberCounts?.forEach((m: any) => { countMap[m.group_id] = (countMap[m.group_id] || 0) + 1; });

      const { data: memberships } = await supabase.from("community_group_members").select("group_id").eq("user_id", user?.id || "");
      const memberGroupIds = new Set(memberships?.map((m: any) => m.group_id) || []);

      // Get recent post counts for activity
      const { data: recentPosts } = await supabase
        .from("community_group_posts")
        .select("group_id, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      const recentMap: Record<string, number> = {};
      recentPosts?.forEach((p: any) => { recentMap[p.group_id] = (recentMap[p.group_id] || 0) + 1; });

      return circles.map((c: any) => ({
        ...c,
        is_member: memberGroupIds.has(c.id),
        members_count: countMap[c.id] || 0,
        recent_posts: recentMap[c.id] || 0,
      }));
    },
    enabled: !!user?.id,
  });

  const yourCircles = useMemo(() => allCircles?.filter((c: any) => c.is_member) || [], [allCircles]);
  const recommended = useMemo(() => allCircles?.filter((c: any) => !c.is_member) || [], [allCircles]);

  const { data: circleFeedPosts } = useQuery({
    queryKey: ["circle-feed-posts", yourCircles.map((c: any) => c.id)],
    queryFn: async () => {
      if (yourCircles.length === 0) return [];
      const ids = yourCircles.map((c: any) => c.id);
      const { data } = await supabase
        .from("community_group_posts")
        .select("*")
        .in("group_id", ids)
        .order("created_at", { ascending: false })
        .limit(20) as any;
      return data || [];
    },
    enabled: yourCircles.length > 0,
  });

  const feedPosterIds = [...new Set((circleFeedPosts || []).map((p: any) => p.user_id))];
  const { data: feedPosterProfiles } = useQuery({
    queryKey: ["feed-poster-profiles", feedPosterIds.join(",")],
    queryFn: async () => {
      if (feedPosterIds.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, avatar_url, display_name, username, is_verified").in("id", feedPosterIds as string[]);
      const map: Record<string, any> = {};
      data?.forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: feedPosterIds.length > 0,
  });

  // Fetch pending circle invitations
  const { data: pendingInvitations } = useQuery({
    queryKey: ["circle-invitations", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: invites } = await supabase
        .from("circle_invitations" as any)
        .select("*")
        .eq("invited_user_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!invites || invites.length === 0) return [];

      // Get circle details
      const circleIds = [...new Set(invites.map((i: any) => i.circle_id))];
      const { data: circles } = await supabase
        .from("community_groups")
        .select("id, name, logo_url, banner_url, privacy, category, members_count")
        .in("id", circleIds as string[]);

      // Get inviter profiles
      const inviterIds = [...new Set(invites.map((i: any) => i.invited_by))];
      const { data: inviters } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", inviterIds as string[]);

      const circleMap: Record<string, any> = {};
      circles?.forEach((c: any) => { circleMap[c.id] = c; });
      const inviterMap: Record<string, any> = {};
      inviters?.forEach((p: any) => { inviterMap[p.id] = p; });

      return invites.map((inv: any) => ({
        ...inv,
        circle: circleMap[inv.circle_id],
        inviter: inviterMap[inv.invited_by],
      }));
    },
  });

  const respondToInvitation = async (invitationId: string, circleId: string, accept: boolean) => {
    if (accept) {
      // Join the circle
      await supabase.from("community_group_members").insert({
        group_id: circleId,
        user_id: user?.id!,
        role: "member",
      });
    }
    // Update invitation status
    await supabase
      .from("circle_invitations" as any)
      .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
      .eq("id", invitationId);

    queryClient.invalidateQueries({ queryKey: ["circle-invitations"] });
    queryClient.invalidateQueries({ queryKey: ["circles"] });
    toast({ title: accept ? "Joined circle!" : "Invitation declined" });
  };

  const filteredCircles = useMemo(() => {
    if (!allCircles) return [];
    let list = allCircles;
    
    // Apply category filter
    if (activeCategory !== "All") {
      list = list.filter((c: any) => c.category === activeCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c: any) => 
        c.name?.toLowerCase().includes(q) || 
        c.description?.toLowerCase().includes(q) || 
        c.category?.toLowerCase().includes(q)
      );
    }

    switch (activeFilter) {
      case "Your Circles": return list.filter((c: any) => c.is_member);
      case "Trending": return [...list].sort((a: any, b: any) => (b.members_count || 0) - (a.members_count || 0));
      case "New": return [...list].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      default: return list;
    }
  }, [allCircles, activeFilter, activeCategory, searchQuery]);

  const recentlyActive = useMemo(() => 
    [...(allCircles || [])].filter((c: any) => c.recent_posts > 0).sort((a: any, b: any) => b.recent_posts - a.recent_posts).slice(0, 6),
    [allCircles]
  );

  const trendingCircles = useMemo(() => 
    [...(allCircles || [])].sort((a: any, b: any) => (b.members_count || 0) - (a.members_count || 0)).slice(0, 6),
    [allCircles]
  );

  const handleJoin = async (circle: any) => {
    if (circle.is_member) {
      await supabase.from("community_group_members").delete().eq("group_id", circle.id).eq("user_id", user?.id);
      toast({ title: "Left circle" });
    } else {
      await supabase.from("community_group_members").insert({ group_id: circle.id, user_id: user?.id!, role: "member" });
      toast({ title: "Joined circle!" });
    }
    queryClient.invalidateQueries({ queryKey: ["circles"] });
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from("community_group_posts").delete().eq("id", postId);
    queryClient.invalidateQueries({ queryKey: ["circle-feed-posts"] });
  };

  if (activeCircle) {
    return <InsideCirclePage circle={activeCircle} userId={user?.id} onBack={() => { setActiveCircle(null); queryClient.invalidateQueries({ queryKey: ["circles"] }); }} />;
  }

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto pb-24">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h1 className="text-xl font-bold text-foreground">Circles</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-full hover:bg-muted/60 transition-colors text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="p-2 rounded-full hover:bg-muted/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center text-primary"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden px-4 pb-2"
            >
              <Input
                placeholder="Search circles by name, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full bg-muted/60 border-0 h-10 text-sm"
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Tabs */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveFilter(tab); setActiveCategory("All"); }}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                activeFilter === tab
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Category Chips */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 border ${
                activeCategory === cat
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border/50 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="px-4 space-y-3">
            {/* Skeleton for horizontal section */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3].map(i => (
                  <div key={i} className="min-w-[160px]">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-3 w-20 mt-2" />
                    <Skeleton className="h-2.5 w-14 mt-1" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-2.5">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : searchQuery.trim() ? (
          /* Search Results */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4">
            <p className="text-xs text-muted-foreground mb-3">{filteredCircles.length} results for "{searchQuery}"</p>
            {filteredCircles.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No circles found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredCircles.map((c: any) => (
                  <CircleCard key={c.id} circle={c} userId={user?.id} onJoin={handleJoin} onOpen={setActiveCircle} />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {/* Pending Invitations */}
            {pendingInvitations && pendingInvitations.length > 0 && (
              <section className="mb-5 px-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Circle Invitations</h2>
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {pendingInvitations.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingInvitations.map((inv: any) => (
                    <Card key={inv.id} className="p-3.5 border-border/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarImage src={inv.circle?.logo_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                            {inv.circle?.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{inv.circle?.name || "Circle"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Invited by {inv.inviter?.display_name || inv.inviter?.username || "someone"}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            className="rounded-full h-8 px-3 text-xs"
                            onClick={() => respondToInvitation(inv.id, inv.circle_id, true)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full h-8 px-2.5 text-xs"
                            onClick={() => respondToInvitation(inv.id, inv.circle_id, false)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Your Circles - Horizontal scroll */}
            {yourCircles.length > 0 && activeFilter === "For You" && (
              <section className="mb-5">
                <div className="flex items-center justify-between px-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Your Circles</h2>
                  </div>
                  <button onClick={() => setActiveFilter("Your Circles")} className="text-xs text-primary font-medium">See All</button>
                </div>
                <div className="px-4 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                    {yourCircles.slice(0, 8).map((c: any) => (
                      <CirclePreviewItem key={c.id} circle={c} onOpen={setActiveCircle} variant="compact" />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Recently Active */}
            {recentlyActive.length > 0 && activeFilter === "For You" && (
              <section className="mb-5">
                <div className="flex items-center gap-1.5 px-4 mb-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-bold text-foreground">Recently Active</h2>
                </div>
                <div className="px-4">
                  {recentlyActive.slice(0, 3).map((c: any) => (
                    <CirclePreviewItem key={c.id} circle={c} onOpen={setActiveCircle} variant="list" />
                  ))}
                </div>
              </section>
            )}

            {/* Trending Circles */}
            {trendingCircles.length > 0 && activeFilter === "For You" && (
              <section className="mb-5">
                <div className="flex items-center gap-1.5 px-4 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-sm font-bold text-foreground">Trending</h2>
                </div>
                <div className="px-4 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-3" style={{ minWidth: "max-content" }}>
                    {trendingCircles.map((c: any) => (
                      <div key={c.id} className="w-[160px] shrink-0">
                        <CircleCard circle={c} userId={user?.id} onJoin={handleJoin} onOpen={setActiveCircle} compact />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Recommended / Filtered Grid */}
            {activeFilter === "For You" && recommended.length > 0 && (
              <section className="px-4 mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-foreground">Recommended</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {recommended.slice(0, 6).map((c: any) => (
                    <CircleCard key={c.id} circle={c} userId={user?.id} onJoin={handleJoin} onOpen={setActiveCircle} />
                  ))}
                </div>
              </section>
            )}

            {/* Your Circles full grid */}
            {activeFilter === "Your Circles" && (
              <section className="px-4 mb-4">
                {yourCircles.length === 0 ? (
                  <div className="text-center py-12">
                    <CircleDot className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">You haven't joined any circles yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredCircles.map((c: any) => (
                      <CircleCard key={c.id} circle={c} userId={user?.id} onJoin={handleJoin} onOpen={setActiveCircle} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Trending / New full grid */}
            {(activeFilter === "Trending" || activeFilter === "New") && (
              <section className="px-4 mb-4">
                <h2 className="text-sm font-bold text-foreground mb-3">
                  {activeFilter === "Trending" ? "Trending Circles" : "Newest Circles"}
                </h2>
                {filteredCircles.length === 0 ? (
                  <div className="text-center py-12">
                    <CircleDot className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No circles in this category</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredCircles.map((c: any) => (
                      <CircleCard key={c.id} circle={c} userId={user?.id} onJoin={handleJoin} onOpen={setActiveCircle} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* From Your Circles Feed */}
            {circleFeedPosts && circleFeedPosts.length > 0 && activeFilter === "For You" && (
              <section className="px-4">
                <h2 className="text-sm font-bold text-foreground mb-3">From Your Circles</h2>
                <SmartFeedAd placement="circles" className="mb-3" />
                <div className="space-y-3">
                  {circleFeedPosts.map((post: any) => {
                    const circle = yourCircles.find((c: any) => c.id === post.group_id);
                    if (!circle) return null;
                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CircleFeedPost
                          post={post}
                          circle={circle}
                          userId={user?.id}
                          isAdmin={circle.created_by === user?.id}
                          onDelete={handleDeletePost}
                          posterProfile={feedPosterProfiles?.[post.user_id]}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Global Empty */}
            {(!allCircles || allCircles.length === 0) && (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <CircleDot className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-foreground font-semibold text-sm">No circles yet</p>
                <p className="text-muted-foreground text-xs mt-1">Create the first community circle!</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                >
                  Create Circle
                </button>
              </div>
            )}
          </motion.div>
        )}

        <CreateCircleDialog open={showCreate} onOpenChange={setShowCreate} userId={user?.id} />
      </div>
    </MainLayout>
  );
};

export default Circles;
