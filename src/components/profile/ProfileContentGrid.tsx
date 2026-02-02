import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Play, Tag, FileText, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaItem {
  id: string;
  type: "image" | "video" | "reel";
  thumbnail?: string;
  caption?: string;
  likes: number;
  isPinned?: boolean;
}

interface ProfileContentGridProps {
  items: MediaItem[];
  activeTab: string;
  isLoading?: boolean;
  onItemClick?: (item: MediaItem) => void;
}

// Generate video thumbnail from video URL
const VideoThumbnail = ({ src, alt }: { src: string; alt: string }) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = src;
    video.muted = true;
    video.preload = "metadata";

    video.onloadeddata = () => {
      video.currentTime = 1; // Seek to 1 second for better thumbnail
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 320;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbnail(canvas.toDataURL("image/jpeg", 0.8));
        }
      } catch (e) {
        setError(true);
      }
    };

    video.onerror = () => setError(true);

    return () => {
      video.src = "";
    };
  }, [src]);

  if (error || !thumbnail) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Play className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={thumbnail}
      alt={alt}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
  );
};

export const ProfileContentGrid = ({
  items,
  activeTab,
  isLoading,
  onItemClick,
}: ProfileContentGridProps) => {
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (activeTab === "media") filtered = items.filter(i => i.type === "image" || i.type === "video");
    if (activeTab === "reels") filtered = items.filter(i => i.type === "reel" || i.type === "video");
    
    // Sort pinned items first
    return [...filtered].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [items, activeTab]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-none" />
        ))}
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          {activeTab === "media" ? (
            <Image className="h-8 w-8 text-muted-foreground" />
          ) : activeTab === "reels" ? (
            <Play className="h-8 w-8 text-muted-foreground" />
          ) : activeTab === "tagged" ? (
            <Tag className="h-8 w-8 text-muted-foreground" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          {activeTab === "media" && "No media yet"}
          {activeTab === "reels" && "No reels yet"}
          {activeTab === "tagged" && "No tagged posts"}
          {activeTab === "all" && "No posts yet"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {activeTab === "media" && "When you share photos and videos, they will appear here."}
          {activeTab === "reels" && "Short videos you create will show up here."}
          {activeTab === "tagged" && "Posts you're tagged in will appear here."}
          {activeTab === "all" && "Share your first post to get started!"}
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-3 gap-0.5 sm:gap-1"
      >
        {filteredItems.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            onClick={() => onItemClick?.(item)}
            className={cn(
              "relative aspect-square overflow-hidden group",
              "bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
            )}
          >
            {/* Render content based on type */}
            {item.type === "video" || item.type === "reel" ? (
              item.thumbnail ? (
                <VideoThumbnail src={item.thumbnail} alt={item.caption || "Video"} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              )
            ) : item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.caption || "Post"}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Video/Reel indicator */}
            {(item.type === "video" || item.type === "reel") && (
              <div className="absolute top-2 right-2">
                <Play className="h-5 w-5 text-white drop-shadow-lg fill-white/20" />
              </div>
            )}

            {/* Pinned indicator */}
            {item.isPinned && (
              <div className="absolute top-2 left-2 bg-primary/90 rounded-full p-1">
                <Pin className="h-3 w-3 text-primary-foreground" />
              </div>
            )}

            {/* Hover overlay */}
            <div className={cn(
              "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100",
              "transition-opacity duration-200 flex items-center justify-center gap-4"
            )}>
              <div className="flex items-center gap-1 text-white font-semibold text-sm">
                <span>❤️</span>
                <span>{item.likes}</span>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};
