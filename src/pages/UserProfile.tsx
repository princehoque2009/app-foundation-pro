import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, MessageCircle, UserPlus, UserMinus } from "lucide-react";
import { PostCard } from "@/components/home/PostCard";
import { ProfileAboutSection } from "@/components/profile/ProfileAboutSection";
import { ProfileCreations } from "@/components/profile/ProfileCreations";
import { toast } from "@/hooks/use-toast";
import { useConversations } from "@/hooks/useConversations";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

const UserProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { createConversation } = useConversations();

  // Fetch profile
  const { data: profile } = useQuery({
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
  const { data: posts } = useQuery({
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
      // Delete both directions of friendship
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

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-card rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback>
                <UserCircle className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {profile?.display_name || profile?.username}
                {profile?.is_verified && <VerifiedBadge size="lg" />}
              </h1>
              <p className="text-muted-foreground">@{profile?.username}</p>
              {profile?.bio && (
                <p className="mt-2 text-sm">{profile.bio}</p>
              )}
              
              <div className="flex gap-6 mt-4">
                <div>
                  <span className="font-bold">{posts?.length || 0}</span>
                  <span className="text-muted-foreground ml-1">Posts</span>
                </div>
                <div>
                  <span className="font-bold">{profile?.followers_count || 0}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
                <div>
                  <span className="font-bold">{profile?.following_count || 0}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {friendship ? (
                <>
                  <Button onClick={handleMessage}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button variant="outline" onClick={() => unfriend.mutate()}>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Unfriend
                  </Button>
                </>
              ) : pendingRequest ? (
                <Button disabled>Request Sent</Button>
              ) : (
                <Button onClick={() => sendFriendRequest.mutate()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* About Section - Publicly Visible */}
        <div className="mb-6">
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

        {/* Creations Section - Publicly Visible */}
        <div className="mb-6">
          <ProfileCreations
            creations={creations}
            totalPosts={regularPosts.length}
            totalReels={reelPosts.length}
          />
        </div>

        {/* Posts Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="space-y-4 mt-4">
            {regularPosts.map((post) => (
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
            {regularPosts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No posts yet</p>
            )}
          </TabsContent>
          
          <TabsContent value="reels" className="space-y-4 mt-4">
            {reelPosts.map((post) => (
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
            {reelPosts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No reels yet</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default UserProfile;
