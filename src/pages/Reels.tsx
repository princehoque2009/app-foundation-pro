import { MainLayout } from "@/components/layout/MainLayout";
import { ReelCard } from "@/components/reels/ReelCard";
import { usePosts } from "@/hooks/usePosts";
import { Loader2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";

const Reels = () => {
  const { data: reels, isLoading } = usePosts(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const height = window.innerHeight;
      const newIndex = Math.round(scrollTop / height);
      setActiveIndex(newIndex);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <MainLayout showHeader={false} showBottomNav={true}>
      <div 
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reels?.length === 0 ? (
          <div className="flex items-center justify-center h-screen text-center px-4">
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
