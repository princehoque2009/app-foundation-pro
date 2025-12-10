import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/home/PostCard";
import { useSavedPosts } from "@/hooks/useSavedPosts";
import { motion } from "framer-motion";
import { Bookmark, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Favourites = () => {
  const { savedPosts, isLoading } = useSavedPosts();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center h-14 px-4 max-w-screen-xl mx-auto">
            <Star className="h-6 w-6 text-primary mr-2 fill-primary" />
            <h1 className="font-semibold text-lg">Favourites</h1>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-screen-md mx-auto p-4"
        >
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-64 animate-pulse bg-muted" />
              ))}
            </div>
          ) : savedPosts.length === 0 ? (
            <Card className="p-12 text-center">
              <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-xl mb-2">No saved posts yet</h3>
              <p className="text-muted-foreground mb-6">
                Tap the bookmark icon on any post to save it here
              </p>
              <Button onClick={() => navigate("/")}>
                Explore Posts
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                {savedPosts.length} saved post{savedPosts.length !== 1 ? "s" : ""}
              </p>
              {savedPosts.map((saved: any) => {
                const post = saved.posts;
                if (!post) return null;
                
                return (
                  <PostCard
                    key={saved.id}
                    id={post.id}
                    author={{
                      name: post.profiles?.display_name || post.profiles?.username || "Unknown",
                      avatar: post.profiles?.avatar_url,
                      username: post.profiles?.username || "unknown",
                      isVerified: post.profiles?.is_verified,
                    }}
                    content={post.caption || ""}
                    image={post.media_type === "image" ? post.media_url : undefined}
                    video={post.media_type === "video" ? post.media_url : undefined}
                    likes={post.likes_count || 0}
                    comments={post.comments_count || 0}
                    timestamp={post.created_at}
                  />
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Favourites;
