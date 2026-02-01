import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Play, Tag, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaItem {
  id: string;
  type: "image" | "video" | "reel";
  thumbnail?: string;
  caption?: string;
  likes: number;
}

interface ProfileContentGridProps {
  items: MediaItem[];
  activeTab: string;
  isLoading?: boolean;
  onItemClick?: (item: MediaItem) => void;
}

export const ProfileContentGrid = ({
  items,
  activeTab,
  isLoading,
  onItemClick,
}: ProfileContentGridProps) => {
  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    if (activeTab === "media") return items.filter(i => i.type === "image" || i.type === "video");
    if (activeTab === "reels") return items.filter(i => i.type === "reel" || i.type === "video");
    return items;
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
            {item.thumbnail ? (
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
