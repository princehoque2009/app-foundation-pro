import { MainLayout } from "@/components/layout/MainLayout";
import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, CircleDot } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleCard } from "@/components/circles/CircleCard";
import { CirclePreviewItem } from "@/components/circles/CirclePreviewItem";
import { CircleFeedPost } from "@/components/circles/CircleFeedPost";
import { CreateCircleDialog } from "@/components/circles/CreateCircleDialog";
import { InsideCirclePage } from "@/components/circles/InsideCirclePage";

const FILTER_TABS = ["For You", "Your Circles", "Trending", "New"];

const Circles = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [activeCircle, setActiveCircle] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("For You");
  const tabsRef = useRef<HTMLDivElement>(null);

  const { data: allCircles, isLoading } = useQuery({
    queryKey: ["circles", user?.id],
    queryFn: async () => {
      const { data: circles } = await supabase.from("community_groups").select("*").order("created_at", { ascending: false });
      if (!circles) return [];
      const { data: memberships } = await supabase.from("community_group_members").select("group_id").eq("user_id", user?.id || "");
      const memberGroupIds = new Set(memberships?.map((m: any) => m.group_id) || []);
      return circles.map((c: any) => ({ ...c, is_member: memberGroupIds.has(c.id) }));
    },
    enabled: !!user?.id,
  });

  // Fetch circle feed posts (from joined circles)
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

  const filteredCircles = useMemo(() => {
    if (!allCircles) return [];
    switch (activeFilter) {
      case "Your Circles": return yourCircles;
      case "Trending": return [...(allCircles || [])].sort((a: any, b: any) => (b.members_count || 0) - (a.members_count || 0));
      case "New": return [...(allCircles || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      default: return allCircles;
    }
  }, [allCircles, activeFilter, yourCircles]);

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
            <button className="p-2 rounded-full hover:bg-muted/60 transition-colors text-muted-foreground">
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="p-2 rounded-full hover:bg-muted/60 transition-colors"
              style={{ color: "#FF5A5F" }}
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div ref={tabsRef} className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                activeFilter === tab
                  ? "bg-[#FF5A5F]/10 text-[#FF5A5F]"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="px-4 space-y-3">
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
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {/* Your Circles preview list */}
            {yourCircles.length > 0 && activeFilter !== "Your Circles" && (
              <section className="mb-4">
                <div className="flex items-center justify-between px-4 mb-1">
                  <h2 className="text-sm font-semibold text-foreground">Your Circles</h2>
                  <button onClick={() => setActiveFilter("Your Circles")} className="text-xs text-[#FF5A5F] font-medium">See All</button>
                </div>
                <div className="px-2">
                  {yourCircles.slice(0, 4).map((c: any) => (
                    <CirclePreviewItem key={c.id} circle={c} onOpen={setActiveCircle} />
                  ))}
                </div>
              </section>
            )}

            {/* Grid/List of circles based on filter */}
            {activeFilter === "Your Circles" && yourCircles.length > 0 && (
              <section className="px-4 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  {yourCircles.map((c: any) => (
                    <CircleCard key={c.id} circle={c} userId={user?.id} onJoin={handleJoin} onOpen={setActiveCircle} />
                  ))}
                </div>
              </section>
            )}

            {activeFilter !== "Your Circles" && filteredCircles.length > 0 && (
              <section className="px-4 mb-4">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  {activeFilter === "Trending" ? "Trending Circles" : activeFilter === "New" ? "New Circles" : "Recommended"}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {(activeFilter === "For You" ? recommended : filteredCircles).slice(0, 6).map((c: any) => (
                    <CircleCard key={c.id} circle={c} userId={user?.id} onJoin={handleJoin} onOpen={setActiveCircle} />
                  ))}
                </div>
              </section>
            )}

            {/* From Your Circles feed */}
            {circleFeedPosts && circleFeedPosts.length > 0 && activeFilter === "For You" && (
              <section className="px-4">
                <h2 className="text-sm font-semibold text-foreground mb-3">From Your Circles</h2>
                <div className="space-y-3">
                  {circleFeedPosts.map((post: any) => {
                    const circle = yourCircles.find((c: any) => c.id === post.group_id);
                    if (!circle) return null;
                    return (
                      <CircleFeedPost
                        key={post.id}
                        post={post}
                        circle={circle}
                        userId={user?.id}
                        isAdmin={circle.created_by === user?.id}
                        onDelete={handleDeletePost}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty state */}
            {(!allCircles || allCircles.length === 0) && (
              <div className="text-center py-16 px-4">
                <CircleDot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No circles yet. Create the first one!</p>
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
