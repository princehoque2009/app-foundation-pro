import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface MediaItem {
  id: string;
  media_url: string;
  media_type: string;
  display_order: number;
}

interface MediaCarouselProps {
  media: MediaItem[];
  onDoubleClick?: () => void;
  className?: string;
}

export const MediaCarousel = ({ media, onDoubleClick, className }: MediaCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  if (!media || media.length === 0) return null;

  const currentMedia = media[currentIndex];
  const hasMultiple = media.length > 1;

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
    setIsImageLoaded(false);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
    setIsImageLoaded(false);
  };

  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "left" && currentIndex < media.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsImageLoaded(false);
    } else if (direction === "right" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsImageLoaded(false);
    }
  };

  return (
    <div
      className={cn(
        "relative bg-muted/50 overflow-hidden cursor-pointer group",
        className
      )}
      onDoubleClick={onDoubleClick}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full"
          drag={hasMultiple ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) handleSwipe("left");
            else if (info.offset.x > 50) handleSwipe("right");
          }}
        >
          {currentMedia.media_type === "video" ? (
            <div className="relative">
              <video
                src={currentMedia.media_url}
                controls
                className="w-full max-h-[500px]"
                preload="metadata"
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          ) : (
            <>
              {!isImageLoaded && (
                <div className="w-full h-80 shimmer" />
              )}
              <img
                src={currentMedia.media_url}
                alt={`Post media ${currentIndex + 1}`}
                className={cn(
                  "w-full object-cover max-h-[500px] transition-opacity duration-200 pointer-events-none select-none",
                  isImageLoaded ? "opacity-100" : "opacity-0 h-0"
                )}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onLoad={() => setIsImageLoaded(true)}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {hasMultiple && (
        <>
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity",
              currentIndex === 0 && "hidden"
            )}
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity",
              currentIndex === media.length - 1 && "hidden"
            )}
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {media.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white w-3"
                  : "bg-white/50 hover:bg-white/75"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
                setIsImageLoaded(false);
              }}
            />
          ))}
        </div>
      )}

      {/* Counter Badge */}
      {hasMultiple && (
        <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5">
          <span className="text-xs font-medium">
            {currentIndex + 1}/{media.length}
          </span>
        </div>
      )}
    </div>
  );
};