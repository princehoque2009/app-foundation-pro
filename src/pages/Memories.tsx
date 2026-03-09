import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Clock, ArrowLeft, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PostCard } from "@/components/home/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { format, subYears } from "date-fns";

const Memories = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();

  const { data: memories, isLoading } = useQuery({
    queryKey: ["memories", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Look for posts from this day in previous years (up to 5 years back)
      const results: { year: number; posts: any[] }[] = [];

      for (let y = 1; y <= 5; y++) {
        const targetDate = subYears(today, y);
        const dayStart = format(targetDate, "yyyy-MM-dd") + "T00:00:00";
        const dayEnd = format(targetDate, "yyyy-MM-dd") + "T23:59:59";

        const { data } = await supabase
          .from("posts")
          .select(`*, profiles!posts_user_id_fkey(id, username, display_name, avatar_url, is_verified)`)
          .eq("user_id", user!.id)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd)
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          results.push({ year: y, posts: data });
        }
      }

      return results;
    },
  });

  const totalMemories = memories?.reduce((sum, g) => sum + g.posts.length, 0) || 0;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center h-14 px-4 max-w-screen-xl mx-auto gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <Clock className="h-5 w-5 text-foreground" />
            <h1 className="font-semibold text-lg">Memories</h1>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-screen-md mx-auto p-4"
        >
          {/* Today's date banner */}
          <Card className="p-4 mb-6 text-center bg-gradient-to-br from-[#FF5A5F]/10 to-[#FF8A5C]/10 border-[#FF5A5F]/20">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-[#FF5A5F]" />
            <p className="text-sm font-medium text-foreground">
              {format(today, "MMMM d")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalMemories > 0
                ? `${totalMemories} memor${totalMemories === 1 ? "y" : "ies"} from this day`
                : "See what you posted on this day in past years"}
            </p>
          </Card>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : !memories || memories.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-xl mb-2">No memories yet</h3>
              <p className="text-muted-foreground">
                Your posts from this day in previous years will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {memories.map((group) => (
                <div key={group.year}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#FF5A5F]">{group.year}y</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {group.year} year{group.year > 1 ? "s" : ""} ago
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(subYears(today, group.year), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {group.posts.map((post: any) => (
                      <PostCard
                        key={post.id}
                        id={post.id}
                        author={{
                          name: post.profiles?.display_name || post.profiles?.username || "You",
                          avatar: post.profiles?.avatar_url,
                          username: post.profiles?.username || "you",
                          isVerified: post.profiles?.is_verified,
                        }}
                        content={post.caption || ""}
                        image={post.media_type === "image" ? post.media_url : undefined}
                        video={post.media_type === "video" ? post.media_url : undefined}
                        likes={post.likes_count || 0}
                        comments={post.comments_count || 0}
                        timestamp={post.created_at}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Memories;
