import { useState, useMemo } from "react";
import { pushNewFollower } from "@/lib/push";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, UserPlus, UserMinus, Clock, Info, Lock } from "lucide-react";
import { ProfileAboutSection } from "@/components/profile/ProfileAboutSection";
import { ProfileActionsDropdown } from "@/components/profile/ProfileActionsDropdown";
import { Seo } from "@/components/seo/Seo";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { ProfileContentGrid } from "@/components/profile/ProfileContentGrid";
import { useProfileGridPrefs } from "@/hooks/useProfileGridPrefs";
import { toast } from "@/hooks/use-toast";
import { useConversations } from "@/hooks/useConversations";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const UserProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { createConversation } = useConversations();
  const [activeTab, setActiveTab] = useState("all");
  const [showAbout, setShowAbout] = useState(false);
  const { prefs: gridPrefs } = useProfileGridPrefs();

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Check if current user follows this profile
  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", user?.id, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("friendships")
        .select("id")
        .eq("user_id", user?.id)
        .eq("friend_id", userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id && !!userId && user.id !== userId,
  });




  // Fetch user's posts
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles!posts_user_id_fkey(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch pinned posts
  const { data: pinnedPosts } = useQuery({
    queryKey: ["pinned-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pinned_posts")
        .select("post_id")
        .eq("user_id", userId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data?.map(p => p.post_id) || [];
    },
    enabled: !!userId,
  });

  // All accounts are public — content is always viewable
  const canViewContent = true;


  // Transform posts
  const creations = useMemo(() => {
    if (!canViewContent) return [];
    const pinnedSet = new Set(pinnedPosts || []);
    return posts?.map(post => ({
      id: post.id,
      type: post.is_reel ? "reel" as const : post.media_type === "video" ? "video" as const : "image" as const,
      thumbnail: post.media_url || undefined,
      caption: post.caption || undefined,
      likes: post.likes_count || 0,
      isPinned: pinnedSet.has(post.id),
    })) || [];
  }, [posts, pinnedPosts, canViewContent]);

  const mediaPosts = canViewContent ? (posts?.filter(post => post.media_url) || []) : [];
  const reelPosts = canViewContent ? (posts?.filter(post => post.is_reel) || []) : [];

  const tabs = [
    { id: "all", label: "All", count: canViewContent ? (posts?.length || 0) : 0 },
    { id: "media", label: "Media", count: mediaPosts.length },
    { id: "reels", label: "Reels", count: reelPosts.length },
  ];

  // Follow — instant for everyone (all accounts are public)
  const followMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from("friend_requests")
        .delete()
        .eq("from_user_id", user?.id)
        .eq("to_user_id", userId);

      const { error } = await supabase
        .from("friend_requests")
        .insert({ from_user_id: user?.id, to_user_id: userId, status: "accepted" });
      if (error) throw error;
      void pushNewFollower(userId as string, user?.id as string);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["is-following", user?.id, userId] });
      queryClient.setQueryData(["is-following", user?.id, userId], true);
    },
    onError: (error: any) => {
      queryClient.setQueryData(["is-following", user?.id, userId], false);
      toast({ title: "Could not follow", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Following!" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following"] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["followers-following"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from("friendships")
        .delete()
        .eq("user_id", user?.id)
        .eq("friend_id", userId);
      await supabase
        .from("friend_requests")
        .delete()
        .eq("from_user_id", user?.id)
        .eq("to_user_id", userId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["is-following", user?.id, userId] });
      queryClient.setQueryData(["is-following", user?.id, userId], false);
    },
    onSuccess: () => {
      toast({ title: "Unfollowed" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following"] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["followers-following"] });
    },
  });





  const handleMessage = async () => {
    if (!userId) return;
    try {
      // Try to ensure conversation exists via secure RPC
      await createConversation.mutateAsync(userId);
    } catch (err: any) {
      // Log but don't block - Messages page will also try to create via useDirectConversation RPC
      console.warn("createConversation failed, navigating anyway:", err?.message);
    }
    // Always navigate - Messages page expects ?friend= param
    // The chat window itself will call get_or_create_direct_conversation RPC to ensure convo exists
    navigate(`/messages?friend=${userId}`);
  };

  if (user?.id === userId) {
    navigate("/profile");
    return null;
  }

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="max-w-screen-lg mx-auto">
          <Skeleton className="h-48 w-full" />
          <div className="px-4 py-6">
            <div className="flex gap-4 -mt-16">
              <Skeleton className="h-28 w-28 rounded-full" />
              <div className="flex-1 pt-20 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Seo
        title={`${profile?.display_name || profile?.username || "Profile"} (@${profile?.username || "user"}) on Prangon`}
        description={(profile?.bio || `See posts, reels and Circles shared by ${profile?.display_name || profile?.username || "this member"} on Prangon.`).slice(0, 160)}
        path={`/profile/${userId}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: profile?.display_name || profile?.username,
            alternateName: profile?.username,
            description: profile?.bio || undefined,
            image: profile?.avatar_url || undefined,
            url: `https://prangon.lovable.app/profile/${userId}`,
          },
        }}
      />
      <div className="max-w-screen-lg mx-auto bg-transparent min-h-screen">
        <ProfileHeader
          profile={profile}
          userId={userId!}
          isOwner={false}
          postsCount={canViewContent ? (posts?.length || 0) : 0}
          isLoading={profileLoading}
        />

        {/* Action Buttons */}
        <div className="px-4 sm:px-6 pb-4 flex items-center gap-2 border-b border-border">
          {isFollowing ? (
            <>
              <Button onClick={handleMessage} className="flex-1 rounded-full gap-2">
                <MessageCircle className="h-4 w-4" />
                Message
              </Button>
              <Button
                variant="outline"
                onClick={() => unfollowMutation.mutate()}
                className="rounded-full gap-2"
              >
                <UserMinus className="h-4 w-4" />
                Following
              </Button>
            </>
          ) : (
            <Button
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className="flex-1 rounded-full gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Follow
            </Button>
          )}


          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setShowAbout(!showAbout)}
          >
            <Info className={cn("h-4 w-4 transition-colors", showAbout && "text-primary")} />
          </Button>

          {profile && (
            <ProfileActionsDropdown
              userId={userId!}
              username={profile.username}
              onMessageClick={handleMessage}
            />
          )}
        </div>

        {/* About Section */}
        <AnimatePresence>
          {showAbout && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="px-4 sm:px-6 py-4">
                <ProfileAboutSection
                  bio={profile?.bio}
                  dateOfBirth={profile?.date_of_birth}
                  createdAt={profile?.created_at}
                  postsCount={canViewContent ? (posts?.length || 0) : 0}
                  followersCount={profile?.followers_count || 0}
                  followingCount={profile?.following_count || 0}
                  country={profile?.country}
                  isVerified={profile?.is_verified}
                  accountType={profile?.account_type}
                  displayName={profile?.display_name}
                  username={profile?.username}
                  socialLinks={(profile as any)?.social_links}
                />

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content: gated for private accounts */}
        {canViewContent ? (
          <>
            <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileContentGrid
                  items={creations}
                  activeTab={activeTab}
                  isLoading={postsLoading}
                  prefs={gridPrefs}
                  onItemClick={(item) => navigate(`/post/${item.id}`)}
                />
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">This account is private</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              Follow to see their photos and videos.
            </p>
          </div>
        )}
      </div>

      <PostViewDialog
        postId={selectedPostId}
        open={!!selectedPostId}
        onOpenChange={(open) => !open && setSelectedPostId(null)}
      />
    </MainLayout>
  );
};

export default UserProfile;
