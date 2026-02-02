import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { ProfileAboutSection } from "@/components/profile/ProfileAboutSection";
import { LiveInsights } from "@/components/profile/LiveInsights";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { ProfileContentGrid } from "@/components/profile/ProfileContentGrid";
import { PostViewDialog } from "@/components/profile/PostViewDialog";
import { PostCard } from "@/components/home/PostCard";
import { motion, AnimatePresence } from "framer-motion";

const Profile = () => {
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAbout, setShowAbout] = useState(true);

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
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

  // Fetch user's posts
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["user-posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(*)")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch pinned posts
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
  });

  // Calculate total reactions across all posts
  const totalReactions = useMemo(() => {
    return posts?.reduce((acc, post) => acc + (post.likes_count || 0), 0) || 0;
  }, [posts]);

  // Transform posts into creations format for grid view
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
      case "media":
        return mediaPosts;
      case "reels":
        return reelPosts;
      default:
        return posts || [];
    }
  };

  return (
    <MainLayout>
      <div className="max-w-screen-lg mx-auto bg-background min-h-screen">
        {/* Profile Header with Hero/Identity/Action Layers */}
        <ProfileHeader
          profile={profile}
          userId={user?.id || ""}
          isOwner={true}
          postsCount={posts?.length || 0}
          onEditClick={() => setIsEditDialogOpen(true)}
          onAnalyticsClick={() => setShowAnalytics(!showAnalytics)}
          onAboutClick={() => setShowAbout(!showAbout)}
          isLoading={profileLoading}
        />

        {/* Live Insights - Private, Owner Only, Collapsible */}
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-6 py-4">
                <LiveInsights
                  profileViews={Math.floor(Math.random() * 500) + 50}
                  profileViewsChange={Math.floor(Math.random() * 40) - 10}
                  contentReach={totalReactions * 3}
                  contentReachChange={Math.floor(Math.random() * 30) - 5}
                  totalReactions={totalReactions}
                  reactionsChange={Math.floor(Math.random() * 25)}
                  totalShares={Math.floor(totalReactions * 0.2)}
                  sharesChange={Math.floor(Math.random() * 20) - 5}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* About Section - Publicly Visible, Collapsible */}
        <AnimatePresence>
          {showAbout && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-6 pb-4">
                <ProfileAboutSection
                  bio={profile?.bio}
                  dateOfBirth={profile?.date_of_birth}
                  createdAt={profile?.created_at}
                  postsCount={posts?.length || 0}
                  followersCount={profile?.followers_count || 0}
                  followingCount={profile?.following_count || 0}
                  country={profile?.country}
                  isVerified={profile?.is_verified}
                  accountType={profile?.account_type}
                  displayName={profile?.display_name}
                  username={profile?.username}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Tabs */}
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === "grid" ? (
              <ProfileContentGrid
                items={creations}
                activeTab={activeTab}
                isLoading={postsLoading}
                onItemClick={(item) => setSelectedPostId(item.id)}
              />
            ) : (
              <div className="space-y-4 p-4">
                {getFilteredPosts().map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    author={{
                      name: post.profiles.display_name || post.profiles.username,
                      avatar: post.profiles.avatar_url || "",
                      username: post.profiles.username,
                    }}
                    content={post.caption || ""}
                    image={post.media_type === "image" ? post.media_url || "" : undefined}
                    video={post.media_type === "video" ? post.media_url || "" : undefined}
                    likes={post.likes_count || 0}
                    comments={post.comments_count || 0}
                    timestamp={post.created_at}
                  />
                ))}
                {getFilteredPosts().length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No content yet</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <EditProfileDialog 
          profile={profile}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />

        <PostViewDialog
          postId={selectedPostId}
          open={!!selectedPostId}
          onOpenChange={(open) => !open && setSelectedPostId(null)}
        />
      </div>
    </MainLayout>
  );
};

export default Profile;
