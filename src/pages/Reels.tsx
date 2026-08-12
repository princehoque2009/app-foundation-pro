import { ReelCard } from "@/components/reels/ReelCard";
import { usePosts } from "@/hooks/usePosts";
import { Loader2, ArrowLeft, Camera } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const Reels = () => {
  const { data: reels, isLoading } = usePosts(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number>();
  const navigate = useNavigate();

  const wake = useCallback(() => {
    setChromeVisible(true);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setChromeVisible(false), 2600);
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
    <div className="fixed inset-0 bg-black">
      {/* Floating top chrome — replaces the bottom bar so nothing overlaps the feed */}
      <AnimatePresence>
        {chromeVisible && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3"
            style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
          >
            <button
              onClick={() => navigate("/")}
              aria-label="Back"
              className="lg-glass-strong lg-press lg-focus pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="reel-text-shadow text-[15px] font-semibold text-white">Reels</span>
            <button
              onClick={() => navigate("/create")}
              aria-label="Create reel"
              className="lg-glass-strong lg-press lg-focus pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-white"
            >
              <Camera className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-white/70">No reels yet. Be the first to create one!</p>
            <button
              onClick={() => navigate("/create")}
              className="lg-glass-strong lg-press rounded-full px-5 py-2 text-sm font-semibold text-white"
            >
              Create a reel
            </button>
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
    </div>
  );
};

export default Reels;
