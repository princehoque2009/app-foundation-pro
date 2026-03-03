import { MainLayout } from "@/components/layout/MainLayout";
import { ReelCard } from "@/components/reels/ReelCard";
import { usePosts } from "@/hooks/usePosts";
import { Loader2 } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";

const Reels = () => {
  const { data: reels, isLoading } = usePosts(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const newIndex = Math.round(scrollTop / height);
    if (newIndex !== activeIndex) setActiveIndex(newIndex);
  }, [activeIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <MainLayout showHeader={false} showBottomNav={true}>
      <div
        ref={containerRef}
        className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide overscroll-none"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-[100dvh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reels?.length === 0 ? (
          <div className="flex items-center justify-center h-[100dvh] text-center px-4">
            <p className="text-muted-foreground">No reels yet. Be the first to create one!</p>
          </div>
        ) : (
          reels?.map((reel, index) => (
            <ReelCard
              key={reel.id}
              id={reel.id}
              author={{
                name: reel.profiles.display_name || reel.profiles.username,
                username: reel.profiles.username,
                avatar: reel.profiles.avatar_url || undefined,
              }}
              caption={reel.caption || undefined}
              videoUrl={reel.media_url || ""}
              likes={reel.likes_count}
              comments={reel.comments_count}
              timestamp={reel.created_at}
              isInView={index === activeIndex}
            />
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default Reels;
