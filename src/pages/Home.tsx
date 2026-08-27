import { Seo } from "@/components/seo/Seo";
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
      <Seo title="Prangon — Next-Generation Social Networking" description="Share moments, create reels, join private Circles and chat in real time on Prangon." path="/" />
      <h1 className="sr-only">Prangon — share moments, reels and Circles with your people</h1>
      <div className="min-h-screen">
        {showStories && (
          <div className="max-w-[640px] mx-auto">
            {isLoading ? <div className="p-4"><StorySkeleton /></div> : <Stories />}
          </div>
        )}
        <div className="max-w-[640px] mx-auto px-0 sm:px-3">
          <div className="px-4 sm:px-0 py-2"><SuggestedAccounts /></div>
        </div>
        <div className="max-w-[640px] mx-auto px-3 sm:px-4 py-4 space-y-5">
          <SmartFeedAd placement="home_feed" className="rounded-[20px] overflow-hidden" />
          {isLoading ? (
            <div className="space-y-5"><PostSkeleton /><PostSkeleton /><PostSkeleton /></div>
          ) : !posts || posts.length === 0 ? (
            <div className="empty-state border border-dashed border-border/60 rounded-[28px] bg-card/50 backdrop-blur-sm py-20">
              <div className="empty-state-icon"><span className="text-2xl">📸</span></div>
              <p className="text-[15px] font-medium text-foreground">No posts yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[260px] mx-auto">{t("home.noPosts")} Follow people to see their moments here.</p>
            </div>
          ) : (
            posts.map((post: any, index: number) => (
              <Fragment key={post.id}>
                <PostCard id={post.id} author={{ name: post.profiles?.display_name || post.profiles?.username || "Unknown", username: post.profiles?.username || "unknown", avatar: post.profiles?.avatar_url || undefined, isVerified: post.profiles?.is_verified ?? false, userId: post.user_id, }} content={post.caption || ""} image={post.media_type === "image" ? post.media_url || undefined : undefined} video={post.media_type === "video" ? post.media_url || undefined : undefined} mediaItems={post.post_media} likes={post.likes_count} comments={post.comments_count} timestamp={post.created_at} />
                {(index + 1) % AD_INTERVAL === 0 && index < posts.length - 1 && <SmartFeedAd key={`ad-${index}`} placement="home_feed" className="rounded-[28px] overflow-hidden border border-border/50" />}
              </Fragment>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};
export default Home;
