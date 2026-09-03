import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Play, Tag, FileText, Pin, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_GRID_PREFS, type ProfileGridPrefs } from "@/hooks/useProfileGridPrefs";

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
  prefs?: ProfileGridPrefs;
}

const colClass = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" } as const;
const gapClass = { none: "gap-[2px]", xs: "gap-1", sm: "gap-1.5", md: "gap-2", lg: "gap-3" } as const;
const radiusClass = { none: "rounded-none", sm: "rounded-[4px]", md: "rounded-md", lg: "rounded-xl" } as const;
const shapeClass = { square: "aspect-square", portrait: "aspect-[3/4]", landscape: "aspect-[4/3]", auto: "aspect-square" } as const;
const masonryColClass = { 2: "columns-2", 3: "columns-3", 4: "columns-4", 5: "columns-5" } as const;


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
  prefs = DEFAULT_GRID_PREFS,
}: ProfileContentGridProps) => {
  const pinnedFirst = prefs.pinnedFirst;
  const isMasonry = prefs.layout === "masonry";
  const gridClass = isMasonry
    ? cn(masonryColClass[prefs.columns], gapClass[prefs.gap], "[column-fill:_balance]")
    : cn("grid", colClass[prefs.columns], gapClass[prefs.gap]);
  const tileClass = cn(shapeClass[prefs.shape], radiusClass[prefs.radius]);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (activeTab === "media") filtered = items.filter(i => i.type === "image" || i.type === "video");
    if (activeTab === "reels") filtered = items.filter(i => i.type === "reel" || i.type === "video");
    
    if (!pinnedFirst) return filtered;
    // Sort pinned items first
    return [...filtered].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [items, activeTab, pinnedFirst]);

  if (isLoading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className={cn(tileClass)} />
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
        className={gridClass}
      >
        {filteredItems.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            onClick={() => onItemClick?.(item)}
            className={cn(
              "relative overflow-hidden group bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset",
              isMasonry
                ? cn("block w-full mb-[inherit] break-inside-avoid", radiusClass[prefs.radius], index % 3 === 1 ? "aspect-[3/4]" : index % 3 === 2 ? "aspect-[4/5]" : "aspect-square")
                : tileClass
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
            {prefs.showTypeIcon && (item.type === "video" || item.type === "reel") && (
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

            {/* Stats overlay */}
            {prefs.overlay !== "never" && (
              <div className={cn(
                "absolute inset-0 bg-black/40 transition-opacity duration-200 flex items-center justify-center gap-4",
                prefs.overlay === "always" ? "opacity-100 bg-gradient-to-t from-black/60 via-transparent to-transparent items-end justify-start p-2" : "opacity-0 group-hover:opacity-100"
              )}>
                <div className="flex items-center gap-1 text-white font-semibold text-xs drop-shadow">
                  <Heart className="h-3.5 w-3.5 fill-white" />
                  <span>{item.likes}</span>
                </div>
              </div>
            )}

            {/* Caption preview */}
            {prefs.showCaption && item.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5 text-left">
                <p className="text-[10px] leading-tight text-white line-clamp-1">{item.caption}</p>
              </div>
            )}

          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};
