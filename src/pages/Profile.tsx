import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, UserCircle } from "lucide-react";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { ProfileAboutSection } from "@/components/profile/ProfileAboutSection";
import { LiveInsights } from "@/components/profile/LiveInsights";
import { ProfileCreations } from "@/components/profile/ProfileCreations";
import { PostCard } from "@/components/home/PostCard";
import { toast } from "@/hooks/use-toast";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch profile
  const { data: profile } = useQuery({
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
  const { data: posts } = useQuery({
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

  // Calculate total reactions across all posts
  const totalReactions = useMemo(() => {
    return posts?.reduce((acc, post) => acc + (post.likes_count || 0), 0) || 0;
  }, [posts]);

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
              <Button onClick={() => setIsEditDialogOpen(true)}>
                Edit Profile
              </Button>
              <Button variant="outline" asChild>
                <a href="/settings">
                  <Settings className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Live Insights - Private, Owner Only */}
        <div className="mb-6">
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

        {/* About Section - Publicly Visible */}
        <div className="mb-6">
          <ProfileAboutSection
            bio={profile?.bio}
            dateOfBirth={profile?.date_of_birth}
            createdAt={profile?.created_at}
            postsCount={posts?.length || 0}
            followersCount={profile?.followers_count || 0}
            followingCount={profile?.following_count || 0}
          />
        </div>

        {/* Creations Section */}
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

        <EditProfileDialog 
          profile={profile}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      </div>
    </MainLayout>
  );
};

export default Profile;
