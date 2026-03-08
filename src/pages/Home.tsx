import { MainLayout } from "@/components/layout/MainLayout";
import { Stories } from "@/components/home/Stories";
import { PostCard } from "@/components/home/PostCard";
import { SuggestedAccounts } from "@/components/home/SuggestedAccounts";
import { usePosts } from "@/hooks/usePosts";
import { PostSkeleton, StorySkeleton } from "@/components/ui/Shimmer";
import { SmartFeedAd } from "@/components/ads/SmartFeedAd";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

const AD_INTERVAL = 7;

const Home = () => {
  const { data: posts, isLoading } = usePosts(false);
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-background to-muted/20 min-h-screen select-none">
        <div className="bg-card border-b border-border py-4">
          {isLoading ? <StorySkeleton /> : <Stories />}
        </div>

        <SuggestedAccounts />

        <div className="max-w-2xl mx-auto px-4 py-4">
          {isLoading ? (
            <div className="space-y-4">
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("home.noPosts")}</p>
            </div>
          ) : (
            posts.map((post: any, index: number) => (
              <Fragment key={post.id}>
                <PostCard
                  id={post.id}
                  author={{
                    name: post.profiles?.display_name || post.profiles?.username || "Unknown",
                    username: post.profiles?.username || "unknown",
                    avatar: post.profiles?.avatar_url || undefined,
                    isVerified: post.profiles?.is_verified ?? false,
                    userId: post.user_id,
                  }}
                  content={post.caption || ""}
                  image={post.media_type === "image" ? post.media_url || undefined : undefined}
                  video={post.media_type === "video" ? post.media_url || undefined : undefined}
                  mediaItems={post.post_media}
                  likes={post.likes_count}
                  comments={post.comments_count}
                  timestamp={post.created_at}
                />
                {(index + 1) % AD_INTERVAL === 0 && index < posts.length - 1 && (
                  <SmartFeedAd key={`ad-${index}`} className="mb-4" />
                )}
              </Fragment>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
