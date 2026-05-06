import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from "lucide-react";

export interface ViewerItem {
  url: string;
  type: "image" | "video";
  id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: ViewerItem[];
  startId?: string;
}

export const FullscreenMediaViewer = ({ open, onOpenChange, items, startId }: Props) => {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return;
    const start = items.findIndex((i) => i.id === startId);
    setIndex(start >= 0 ? start : 0);
    setZoom(1);
  }, [open, startId, items]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(items.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length, onOpenChange]);

  const item = items[index];
  if (!item) return null;

  const handleDownload = async () => {
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `prangon-${item.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(item.url, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95 border-0 rounded-none flex items-center justify-center">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-30 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="absolute top-4 left-4 z-30 flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10 rounded-full bg-black/50 text-white border-0 hover:bg-black/70"
            onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10 rounded-full bg-black/50 text-white border-0 hover:bg-black/70"
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10 rounded-full bg-black/50 text-white border-0 hover:bg-black/70"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>

        {index > 0 && (
          <button
            onClick={() => { setIndex(index - 1); setZoom(1); }}
            className="absolute left-4 z-30 h-12 w-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {index < items.length - 1 && (
          <button
            onClick={() => { setIndex(index + 1); setZoom(1); }}
            className="absolute right-4 z-30 h-12 w-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        <div className="w-full h-full overflow-auto flex items-center justify-center">
          {item.type === "image" ? (
            <img
              src={item.url}
              alt=""
              style={{ transform: `scale(${zoom})`, transition: "transform 0.2s" }}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          ) : (
            <video src={item.url} controls autoPlay className="max-w-full max-h-full" />
          )}
        </div>

        {items.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-black/50 text-white text-xs">
            {index + 1} / {items.length}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
