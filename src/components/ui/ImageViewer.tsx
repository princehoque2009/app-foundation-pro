import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  src: string;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageViewer = ({ src, alt, open, onOpenChange }: ImageViewerProps) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastDistance = useRef<number | null>(null);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!open) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  }, [open]);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const newScale = Math.min(5, Math.max(1, scale - e.deltaY * 0.002));
    setScale(newScale);
    if (newScale <= 1) setTranslate({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistance.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1 && scale > 1) {
      isDragging.current = true;
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDistance.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.min(5, Math.max(1, scale * (distance / lastDistance.current)));
      setScale(newScale);
      lastDistance.current = distance;
      if (newScale <= 1) setTranslate({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging.current && lastTouch.current && scale > 1) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    lastDistance.current = null;
    isDragging.current = false;
    lastTouch.current = null;
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none w-screen h-screen p-0 border-0 bg-black/95 rounded-none [&>button]:hidden"
        onInteractOutside={() => onOpenChange(false)}
      >
        {/* Back / Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 left-4 z-50 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center backdrop-blur-sm"
          aria-label="Go back"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Image container */}
        <div
          className="flex items-center justify-center w-full h-full overflow-hidden touch-none"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <motion.img
            src={src}
            alt={alt || "Full view"}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
              transition: isDragging.current ? "none" : "transform 0.15s ease-out",
            }}
            draggable={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
