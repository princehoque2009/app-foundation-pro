import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { ProfileAboutSection } from "@/components/profile/ProfileAboutSection";
import { LiveInsights } from "@/components/profile/LiveInsights";
import { Seo } from "@/components/seo/Seo";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { ProfileContentGrid } from "@/components/profile/ProfileContentGrid";
import { PostViewDialog } from "@/components/profile/PostViewDialog";
import { PostCard } from "@/components/home/PostCard";
import { motion, AnimatePresence } from "framer-motion";

const PROFILE_STALE_TIME = 30_000;

const Profile = () => {
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      // Try with profile_theme, fallback without it if column doesn't exist (prevents all-black crash)
      let data, error;
      try {
        const res = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, cover_photo_url, bio, date_of_birth, created_at, followers_count, following_count, country, is_verified, account_type, social_links, profile_theme")
          .eq("id", user?.id)
          .single();
        data = res.data; error = res.error;
        if (error && error.message?.includes("profile_theme")) throw error;
      } catch (e) {
        console.warn("profile_theme column missing, fallback query", e);
        const res2 = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, cover_photo_url, bio, date_of_birth, created_at, followers_count, following_count, country, is_verified, account_type, social_links")
          .eq("id", user?.id)
          .single();
        data = res2.data; error = res2.error;
        if (data) (data as any).profile_theme = 'default';
      }
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 2 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["user-posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, is_reel, media_type, media_url, caption, likes_count, comments_count, created_at")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 2 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const { data: pinnedPosts } = useQuery({
    queryKey: ["pinned-posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pinned_posts")
        .select("post_id")
        .eq("user_id", user?.id)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data?.map(p => p.post_id) || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 2 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const totalReactions = useMemo(() => {
    return posts?.reduce((acc, post) => acc + (post.likes_count || 0), 0) || 0;
  }, [posts]);

  const creations = useMemo(() => {
    const pinnedSet = new Set(pinnedPosts || []);
    return posts?.map(post => ({
      id: post.id,
      type: post.is_reel ? "reel" as const : post.media_type === "video" ? "video" as const : "image" as const,
      thumbnail: post.media_url || undefined,
      caption: post.caption || undefined,
      likes: post.likes_count || 0,
      isPinned: pinnedSet.has(post.id),
    })) || [];
  }, [posts, pinnedPosts]);

  const regularPosts = posts?.filter(post => !post.is_reel) || [];
  const reelPosts = posts?.filter(post => post.is_reel) || [];
  const mediaPosts = posts?.filter(post => post.media_url) || [];

  const tabs = [
    { id: "all", label: "All", count: posts?.length || 0 },
    { id: "media", label: "Media", count: mediaPosts.length },
    { id: "reels", label: "Reels", count: reelPosts.length },
  ];

  const getFilteredPosts = () => {
    switch (activeTab) {
      case "media": return mediaPosts;
      case "reels": return reelPosts;
      default: return posts || [];
    }
  };

  if (profileError) {
    return (
      <MainLayout>
        <div className="max-w-screen-lg mx-auto min-h-screen p-8 text-center">
          <p className="text-muted-foreground">Failed to load profile: {(profileError as any)?.message}</p>
          <p className="text-xs mt-2">If this is about profile_theme column, run SQL: ALTER TABLE profiles ADD COLUMN profile_theme TEXT DEFAULT 'default';</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Seo title="Your Profile on Prangon" description="Manage your Prangon profile: update your cover photo, bio and social links, and review the posts, reels and Circles you have shared." path="/profile" />
      <div className="max-w-screen-lg mx-auto bg-transparent min-h-screen">
        <ProfileHeader profile={profile} userId={user?.id || ""} isOwner={true} postsCount={posts?.length || 0} onEditClick={() => setIsEditDialogOpen(true)} onAnalyticsClick={() => setShowAnalytics(!showAnalytics)} onAboutClick={() => setShowAbout(!showAbout)} isLoading={profileLoading} />

        <AnimatePresence>
          {showAnalytics && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-4 sm:px-6 py-4">
                <LiveInsights profileViews={Math.floor(Math.random() * 500) + 50} profileViewsChange={Math.floor(Math.random() * 40) - 10} contentReach={totalReactions * 3} contentReachChange={Math.floor(Math.random() * 30) - 5} totalReactions={totalReactions} reactionsChange={Math.floor(Math.random() * 25)} totalShares={Math.floor(totalReactions * 0.2)} sharesChange={Math.floor(Math.random() * 20) - 5} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAbout && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-4 sm:px-6 pb-4">
                <ProfileAboutSection bio={profile?.bio} dateOfBirth={profile?.date_of_birth} createdAt={profile?.created_at} postsCount={posts?.length || 0} followersCount={profile?.followers_count || 0} followingCount={profile?.following_count || 0} country={profile?.country} isVerified={profile?.is_verified} accountType={profile?.account_type} displayName={profile?.display_name} username={profile?.username} socialLinks={(profile as any)?.social_links} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

        <div key={activeTab}>
            {viewMode === "grid" ? (
              <ProfileContentGrid items={creations} activeTab={activeTab} isLoading={postsLoading} onItemClick={(item) => setSelectedPostId(item.id)} />
            ) : (
              <div className="space-y-4 p-4">
                {getFilteredPosts().map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    author={{
                      name: profile?.display_name || profile?.username || "",
                      avatar: profile?.avatar_url || "",
                      username: profile?.username || "",
                      isVerified: profile?.is_verified || false,
                      userId: profile?.id,
                    }}
                    content={post.caption || ""}
                    image={post.media_type === "image" ? post.media_url || "" : undefined}
                    video={post.media_type === "video" ? post.media_url || "" : undefined}
                    likes={post.likes_count || 0}
                    comments={post.comments_count || 0}
                    timestamp={post.created_at}
                  />
                ))}
                {getFilteredPosts().length === 0 && <p className="text-center text-muted-foreground py-8">No content yet</p>}
              </div>
            )}
          </div>

        <EditProfileDialog profile={profile} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
        <PostViewDialog postId={selectedPostId} open={!!selectedPostId} onOpenChange={(open) => !open && setSelectedPostId(null)} />
      </div>
    </MainLayout>
  );
};

export default Profile;
