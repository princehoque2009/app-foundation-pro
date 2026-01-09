import { useState } from "react";
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

        {/* About Section - Publicly Visible */}
        <ProfileAboutSection
          bio={profile?.bio}
          dateOfBirth={profile?.date_of_birth}
          createdAt={profile?.created_at}
          postsCount={posts?.length || 0}
          followersCount={profile?.followers_count || 0}
          followingCount={profile?.following_count || 0}
        />

        {/* Posts Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="space-y-4 mt-4">
            {posts?.filter(post => !post.is_reel).map((post) => (
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
            {(!posts || posts.filter(post => !post.is_reel).length === 0) && (
              <p className="text-center text-muted-foreground py-8">No posts yet</p>
            )}
          </TabsContent>
          
          <TabsContent value="reels" className="space-y-4 mt-4">
            {posts?.filter(post => post.is_reel).map((post) => (
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
            {(!posts || posts.filter(post => post.is_reel).length === 0) && (
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
