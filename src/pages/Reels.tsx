import { MainLayout } from "@/components/layout/MainLayout";
import { ReelCard } from "@/components/reels/ReelCard";
import { usePosts } from "@/hooks/usePosts";
import { Loader2 } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";

const Reels = () => {
  const { data: reels, isLoading } = usePosts(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dimmed, setDimmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number>();

  const wake = useCallback(() => {
    setDimmed(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setDimmed(true), 2000);
  }, []);

  useEffect(() => {
    wake();
    return () => window.clearTimeout(idleTimer.current);
  }, [wake]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const newIndex = Math.round(container.scrollTop / container.clientHeight);
    setActiveIndex((prev) => (newIndex !== prev ? newIndex : prev));
    wake();
  }, [wake]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <MainLayout showHeader={false} showBottomNav navCollapsed navDimmed={dimmed}>
      <div
        ref={containerRef}
        onPointerDown={wake}
        className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll overscroll-none scrollbar-hide bg-black"
      >
        {isLoading ? (
          <div className="flex h-[100dvh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reels?.length === 0 ? (
          <div className="flex h-[100dvh] items-center justify-center px-4 text-center">
            <p className="text-muted-foreground">No reels yet. Be the first to create one!</p>
          </div>
        ) : (
          reels?.map((reel, index) => (
            <ReelCard
              key={reel.id}
              id={reel.id}
              authorId={reel.user_id}
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
              mounted={Math.abs(index - activeIndex) <= 1}
              onInteract={wake}
            />
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default Reels;
