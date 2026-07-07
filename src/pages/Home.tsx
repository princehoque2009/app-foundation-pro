import { MainLayout } from "@/components/layout/MainLayout";
import { Stories } from "@/components/home/Stories";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useRoles } from "@/contexts/RolesContext";
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
  const { settings } = useAppSettings();
  const { isAdmin } = useRoles();
  const showStories = isAdmin || settings.stories_enabled !== false;

  return (
    <MainLayout>
      <div className="bg-background min-h-screen select-none">
        {showStories && (
          <div className="border-b border-border/70 py-3">
            <div className="max-w-xl mx-auto px-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  Stories
                </h2>
              </div>
              {isLoading ? <StorySkeleton /> : <Stories />}
            </div>
          </div>
        )}

        <SuggestedAccounts />

        {/* Feed */}
        <div className="max-w-xl mx-auto px-4 py-5">
          <div className="flex items-baseline justify-between mb-4">
            <h1
              className="text-2xl font-semibold tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Today
            </h1>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Latest
            </span>
          </div>

          <SmartFeedAd placement="home_feed" className="mb-6" />
          {isLoading ? (
            <div className="space-y-3">
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground text-sm">{t("home.noPosts")}</p>
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
                  <SmartFeedAd key={`ad-${index}`} placement="home_feed" className="mb-6" />
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

