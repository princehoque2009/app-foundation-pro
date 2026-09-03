import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { PostCard } from "@/components/home/PostCard";
import { ArchivedPostsModal } from "@/components/ArchivedPostsModal";
import { GridCustomizeSheet } from "@/components/profile/GridCustomizeSheet";
import { useProfileGridPrefs } from "@/hooks/useProfileGridPrefs";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const { prefs, update, reset } = useProfileGridPrefs();

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["user-posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("id, user_id, is_reel, media_type, media_url, caption, likes_count, comments_count, created_at").eq("user_id", user?.id).eq("is_archived", false).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });


  const { data: pinnedPosts } = useQuery({
    queryKey: ["pinned-posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pinned_posts").select("post_id").eq("user_id", user?.id).order("display_order", { ascending: true });
      if (error) throw error;
      return data?.map(p => p.post_id) || [];
    },
    enabled: !!user?.id,
  });

  const totalReactions = useMemo(() => posts?.reduce((acc, post) => acc + (post.likes_count || 0), 0) || 0, [posts]);
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

  const mediaPosts = posts?.filter(post => post.media_url) || [];
  const reelPosts = posts?.filter(post => post.is_reel) || [];
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
    return <MainLayout><div className="max-w-screen-lg mx-auto min-h-screen p-8 text-center"><p className="text-red-500">Failed: {(profileError as any).message}</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <Seo title="Your Profile on Prangon" description="View and manage your Prangon profile, posts, reels and activity." path="/profile" />
      <div className="max-w-screen-lg mx-auto min-h-screen">
        <ProfileHeader profile={profile} userId={user?.id || ""} isOwner={true} postsCount={posts?.length || 0} onEditClick={() => setIsEditDialogOpen(true)} onAnalyticsClick={() => setShowAnalytics(!showAnalytics)} onAboutClick={() => setShowAbout(!showAbout)} isLoading={profileLoading} />
        {showAnalytics && <div className="px-4 sm:px-6 py-4"><LiveInsights profileViews={100} profileViewsChange={10} contentReach={totalReactions*3} contentReachChange={5} totalReactions={totalReactions} reactionsChange={10} totalShares={10} sharesChange={5} /></div>}
        {showAbout && <div className="px-4 sm:px-6 pb-4"><ProfileAboutSection bio={profile?.bio} dateOfBirth={profile?.date_of_birth} createdAt={profile?.created_at} postsCount={posts?.length||0} followersCount={profile?.followers_count??0} followingCount={profile?.following_count??0} country={profile?.country} isVerified={profile?.is_verified} accountType={profile?.account_type} displayName={profile?.display_name} username={profile?.username} socialLinks={profile?.social_links as any} /></div>}
        <div className="flex items-center gap-1 pr-2">
          <div className="flex-1 min-w-0 overflow-x-auto">
            <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Archive" onClick={() => setArchiveOpen(true)}>
            <Archive className="h-4 w-4" />
          </Button>
          <GridCustomizeSheet prefs={prefs} onUpdate={update} onReset={reset} />
        </div>
        <div key={activeTab}>
          {viewMode === "grid" ? <ProfileContentGrid items={creations} activeTab={activeTab} isLoading={postsLoading} prefs={prefs} onItemClick={(item) => navigate(`/post/${item.id}`)} /> : <div className="space-y-4 p-4">{getFilteredPosts().map((post) => <PostCard key={post.id} id={post.id} author={{ name: profile?.display_name||profile?.username||"", avatar: profile?.avatar_url||"", username: profile?.username||"", isVerified: profile?.is_verified||false, userId: profile?.id }} content={post.caption||""} image={post.media_type==="image"?post.media_url||"":undefined} video={post.media_type==="video"?post.media_url||"":undefined} likes={post.likes_count||0} comments={post.comments_count||0} timestamp={post.created_at} />)}{getFilteredPosts().length===0&&<p className="text-center text-muted-foreground py-8">No content yet</p>}</div>}
        </div>
        <ArchivedPostsModal open={archiveOpen} onOpenChange={setArchiveOpen} />

        <EditProfileDialog profile={profile} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
      </div>
    </MainLayout>
  );
};
export default Profile;
