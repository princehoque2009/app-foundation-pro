import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, UserPlus, UserMinus, Clock } from "lucide-react";
import { ProfileAboutSection } from "@/components/profile/ProfileAboutSection";
import { ProfileActionsDropdown } from "@/components/profile/ProfileActionsDropdown";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { ProfileContentGrid } from "@/components/profile/ProfileContentGrid";
import { PostCard } from "@/components/home/PostCard";
import { toast } from "@/hooks/use-toast";
import { useConversations } from "@/hooks/useConversations";
import { motion, AnimatePresence } from "framer-motion";

const UserProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { createConversation } = useConversations();
  const [activeTab, setActiveTab] = useState("all");

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

  // Check friendship status
  const { data: friendship } = useQuery({
    queryKey: ["friendship", user?.id, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("user_id", user?.id)
        .eq("friend_id", userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!userId && user.id !== userId,
  });

  // Check pending friend request
  const { data: pendingRequest } = useQuery({
    queryKey: ["friend-request", user?.id, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("from_user_id", user?.id)
        .eq("to_user_id", userId)
        .eq("status", "pending")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!userId && user.id !== userId,
  });

  // Fetch user's posts
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Transform posts into creations format
  const creations = useMemo(() => {
    return posts?.map(post => ({
      id: post.id,
      type: post.is_reel ? "reel" as const : post.media_type === "video" ? "video" as const : "image" as const,
      thumbnail: post.media_url || undefined,
      caption: post.caption || undefined,
      likes: post.likes_count || 0,
      isPinned: false,
    })) || [];
  }, [posts]);

  const regularPosts = posts?.filter(post => !post.is_reel) || [];
  const reelPosts = posts?.filter(post => post.is_reel) || [];
  const mediaPosts = posts?.filter(post => post.media_url) || [];

  const tabs = [
    { id: "all", label: "All", count: posts?.length || 0 },
    { id: "media", label: "Media", count: mediaPosts.length },
    { id: "reels", label: "Reels", count: reelPosts.length },
  ];

  const sendFriendRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          from_user_id: user?.id,
          to_user_id: userId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-request"] });
      toast({ title: "Friend request sent!" });
    },
  });

  const unfriend = useMutation({
    mutationFn: async () => {
      const { error: error1 } = await supabase
        .from("friendships")
        .delete()
        .eq("user_id", user?.id)
        .eq("friend_id", userId);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from("friendships")
        .delete()
        .eq("user_id", userId)
        .eq("friend_id", user!.id);

      if (error2) throw error2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship"] });
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
      toast({ title: "Removed from friends" });
    },
  });

  const handleMessage = async () => {
    if (!userId) return;
    const conversationId = await createConversation.mutateAsync(userId);
    navigate(`/messages?conversation=${conversationId}`);
  };

  if (user?.id === userId) {
    navigate("/profile");
    return null;
  }

  // Loading skeleton
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
      <div className="max-w-screen-lg mx-auto bg-background min-h-screen">
        {/* Profile Header */}
        <ProfileHeader
          profile={profile}
          userId={userId!}
          isOwner={false}
          postsCount={posts?.length || 0}
          isLoading={profileLoading}
        />

        {/* Action Buttons for Other Users */}
        <div className="px-4 sm:px-6 pb-4 flex items-center gap-2 border-b border-border">
          {friendship ? (
            <>
              <Button onClick={handleMessage} className="flex-1 rounded-full gap-2">
                <MessageCircle className="h-4 w-4" />
                Message
              </Button>
              <Button 
                variant="outline" 
                onClick={() => unfriend.mutate()}
                className="rounded-full gap-2"
              >
                <UserMinus className="h-4 w-4" />
                Unfriend
              </Button>
            </>
          ) : pendingRequest ? (
            <Button disabled variant="secondary" className="flex-1 rounded-full gap-2">
              <Clock className="h-4 w-4" />
              Request Sent
            </Button>
          ) : (
            <Button 
              onClick={() => sendFriendRequest.mutate()}
              className="flex-1 rounded-full gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Friend
            </Button>
          )}
          
          {profile && (
            <ProfileActionsDropdown
              userId={userId!}
              username={profile.username}
              onMessageClick={handleMessage}
            />
          )}
        </div>

        {/* About Section */}
        <div className="px-4 sm:px-6 py-4">
          <ProfileAboutSection
            bio={profile?.bio}
            dateOfBirth={profile?.date_of_birth}
            createdAt={profile?.created_at}
            postsCount={posts?.length || 0}
            followersCount={profile?.followers_count || 0}
            followingCount={profile?.following_count || 0}
            country={profile?.country}
          />
        </div>

        {/* Profile Tabs */}
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />

        {/* Content Grid */}
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
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </MainLayout>
  );
};

export default UserProfile;
