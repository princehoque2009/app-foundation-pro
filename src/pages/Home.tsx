import { MainLayout } from "@/components/layout/MainLayout";
import { Stories } from "@/components/home/Stories";
import { PostCard } from "@/components/home/PostCard";
import { usePosts } from "@/hooks/usePosts";
import { Loader2 } from "lucide-react";

const Home = () => {
  const { data: posts, isLoading } = usePosts(false);

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-background to-muted/20 min-h-screen">
        {/* Stories Section */}
        <div className="bg-card border-b border-border py-4">
          <Stories />
        </div>

        {/* Posts Feed */}
        <div className="max-w-2xl mx-auto px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            posts?.map((post) => (
              <PostCard
                key={post.id}
                id={post.id}
                author={{
                  name: post.profiles.display_name || post.profiles.username,
                  username: post.profiles.username,
                  avatar: post.profiles.avatar_url || undefined,
                }}
                content={post.caption || ""}
                image={post.media_type === "image" ? post.media_url || undefined : undefined}
                video={post.media_type === "video" ? post.media_url || undefined : undefined}
                likes={post.likes_count}
                comments={post.comments_count}
                timestamp={post.created_at}
              />
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
