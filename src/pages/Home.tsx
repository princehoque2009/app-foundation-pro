import { MainLayout } from "@/components/layout/MainLayout";
import { Stories } from "@/components/home/Stories";
import { PostCard } from "@/components/home/PostCard";
import { SuggestedAccounts } from "@/components/home/SuggestedAccounts";
import { usePosts } from "@/hooks/usePosts";
import { PostSkeleton, StorySkeleton } from "@/components/ui/Shimmer";
import { SmartFeedAd } from "@/components/ads/SmartFeedAd";
import { Fragment, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CircleFeedPost } from "@/components/circles/CircleFeedPost";
import { useNavigate } from "react-router-dom";

const AD_INTERVAL = 7;

const Home = () => {
  const { data: posts, isLoading } = usePosts(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user's joined circles
  const { data: myCircleMemberships } = useQuery({
    queryKey: ["my-circle-memberships", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_group_members")
        .select("group_id")
        .eq("user_id", user?.id!);
      return data?.map((m: any) => m.group_id) || [];
    },
    enabled: !!user?.id,
  });

  // Fetch circle posts from joined circles
  const { data: circlePosts } = useQuery({
    queryKey: ["home-circle-posts", myCircleMemberships],
    queryFn: async () => {
      if (!myCircleMemberships || myCircleMemberships.length === 0) return [];
      const { data } = await supabase
        .from("community_group_posts")
        .select("*")
        .in("group_id", myCircleMemberships)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!myCircleMemberships && myCircleMemberships.length > 0,
  });

  // Fetch circles info for circle posts
  const circleIds = [...new Set((circlePosts || []).map((p: any) => p.group_id))];
  const { data: circlesMap } = useQuery({
    queryKey: ["home-circles-info", circleIds.join(",")],
    queryFn: async () => {
      if (circleIds.length === 0) return {};
      const { data } = await supabase.from("community_groups").select("*").in("id", circleIds);
      const map: Record<string, any> = {};
      data?.forEach((c: any) => { map[c.id] = c; });
      return map;
    },
    enabled: circleIds.length > 0,
  });

  // Fetch poster profiles for circle posts
  const circlePosterIds = [...new Set((circlePosts || []).map((p: any) => p.user_id))];
  const { data: circlePosterProfiles } = useQuery({
    queryKey: ["home-circle-poster-profiles", circlePosterIds.join(",")],
    queryFn: async () => {
      if (circlePosterIds.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, avatar_url, display_name, username").in("id", circlePosterIds);
      const map: Record<string, any> = {};
      data?.forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: circlePosterIds.length > 0,
  });

  // Merge and sort all posts chronologically
  const mergedFeed = useMemo(() => {
    const regularItems = (posts || []).map((p: any) => ({ type: "post" as const, data: p, time: new Date(p.created_at).getTime() }));
    const circleItems = (circlePosts || []).map((p: any) => ({ type: "circle" as const, data: p, time: new Date(p.created_at).getTime() }));
    return [...regularItems, ...circleItems].sort((a, b) => b.time - a.time);
  }, [posts, circlePosts]);

  const handleDeleteCirclePost = async (postId: string) => {
    await supabase.from("community_group_posts").delete().eq("id", postId);
  };

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-background to-muted/20 min-h-screen select-none">
        <div className="bg-card border-b border-border py-4">
          {isLoading ? <StorySkeleton /> : <Stories />}
        </div>

        <SuggestedAccounts />

        <div className="max-w-2xl mx-auto px-4 py-4">
          {isLoading ? (
            <div className="space-y-4">
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : mergedFeed.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            mergedFeed.map((item, index) => (
              <Fragment key={`${item.type}-${item.data.id}`}>
                {item.type === "post" ? (
                  <PostCard
                    id={item.data.id}
                    author={{
                      name: item.data.profiles?.display_name || item.data.profiles?.username || "Unknown",
                      username: item.data.profiles?.username || "unknown",
                      avatar: item.data.profiles?.avatar_url || undefined,
                      isVerified: item.data.profiles?.is_verified ?? false,
                      userId: item.data.user_id,
                    }}
                    content={item.data.caption || ""}
                    image={item.data.media_type === "image" ? item.data.media_url || undefined : undefined}
                    video={item.data.media_type === "video" ? item.data.media_url || undefined : undefined}
                    mediaItems={item.data.post_media}
                    likes={item.data.likes_count}
                    comments={item.data.comments_count}
                    timestamp={item.data.created_at}
                  />
                ) : (
                  <div className="mb-4">
                    <CircleFeedPost
                      post={item.data}
                      circle={circlesMap?.[item.data.group_id] || { name: "Circle" }}
                      userId={user?.id}
                      isAdmin={circlesMap?.[item.data.group_id]?.created_by === user?.id}
                      onDelete={handleDeleteCirclePost}
                      posterProfile={circlePosterProfiles?.[item.data.user_id]}
                      onOpenCircle={(circle) => navigate("/circles", { state: { openCircleId: circle.id } })}
                    />
                  </div>
                )}
                {(index + 1) % AD_INTERVAL === 0 && index < mergedFeed.length - 1 && (
                  <SmartFeedAd key={`ad-${index}`} className="mb-4" />
                )}
              </Fragment>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
