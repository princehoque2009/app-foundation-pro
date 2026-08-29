import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ImageCropDialog } from "@/components/circles/ImageCropDialog";
import { uploadToCloudinary, optimizeCloudinaryUrl, isCloudinaryConfigured } from "@/lib/cloudinary";

interface CoverPhotoUploaderProps {
  userId: string;
  currentCoverUrl?: string | null;
  isOwner: boolean;
  onImageClick?: (url: string) => void;
  theme?: string;
}

const COVER_TRANSFORM = "c_fill,ar_16:9,g_auto,w_1200";
const COVER_PLACEHOLDER_TRANSFORM = "c_fill,ar_16:9,g_auto,w_32,e_blur:1000";

export const CoverPhotoUploader = ({ userId, currentCoverUrl, isOwner, onImageClick, theme = 'default' }: CoverPhotoUploaderProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      if (!isCloudinaryConfigured()) throw new Error("Cloudinary not configured");
      const result = await uploadToCloudinary(blob, { folder: `prangon/covers/${userId}` });
      const { error } = await supabase.from("profiles").update({ cover_photo_url: result.secure_url }).eq("id", userId);
      if (error) throw error;
      return result.secure_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Cover photo updated!" });
      setPreviewUrl(null);
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setPreviewUrl(null);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image", variant: "destructive" });
      return;
    }
    const isGif = file.type === "image/gif";
    // 2-in-1: GIF only allowed on Nitro theme
    if (isGif && theme !== 'nitro') {
      toast({ title: "GIF only for Nitro", description: "Switch to Nitro theme to use GIF covers", variant: "destructive" });
      return;
    }
    if (isGif && theme === 'nitro') {
      // GIF direct upload to keep animation
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setIsImageLoaded(false);
      uploadMutation.mutate(file);
      e.target.value = "";
      return;
    }
    // Normal image
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleCropComplete = useCallback((blob: Blob) => {
    setCropSrc(null);
    const objectUrl = URL.createObjectURL(blob);
    setPreviewUrl(objectUrl);
    setIsImageLoaded(false);
    uploadMutation.mutate(blob);
  }, [uploadMutation]);

  const rawUrl = previewUrl || currentCoverUrl;
  const isGifCover = currentCoverUrl?.toLowerCase().includes('.gif');
  // 2-in-1: if GIF and not nitro, hide in uploader preview? show but with note
  const isGifHidden = isGifCover && theme !== 'nitro';
  const displayUrl = previewUrl || (isGifCover ? currentCoverUrl : optimizeCloudinaryUrl(currentCoverUrl, COVER_TRANSFORM));
  const placeholderUrl = !previewUrl && !isGifCover ? optimizeCloudinaryUrl(currentCoverUrl, COVER_PLACEHOLDER_TRANSFORM) : null;

  return (
    <>
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
        <AnimatePresence mode="wait">
          {displayUrl && !isGifHidden ? (
            <motion.div key={displayUrl} initial={{ opacity: 0 }} animate={{ opacity: isImageLoaded ? 1 : 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
              <img src={displayUrl} alt="Cover" className="w-full h-full object-cover cursor-pointer" onLoad={() => setIsImageLoaded(true)} onClick={() => rawUrl && onImageClick?.(rawUrl)} />
            </motion.div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              {isGifHidden ? <span className="text-[11px] text-muted-foreground bg-background/80 px-3 py-1 rounded-full">GIF hidden on {theme} • Switch to Nitro to show</span> : null}
            </div>
          )}
        </AnimatePresence>
        {placeholderUrl && !isImageLoaded && !isGifHidden && <img src={placeholderUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-[1.02]" />}
        {uploadMutation.isPending && <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {isOwner && !uploadMutation.isPending && (
          <Button variant="secondary" size="sm" className={cn("absolute bottom-3 right-3 gap-1.5 rounded-full z-20 bg-background/80 backdrop-blur-sm shadow-lg text-xs p-0")} asChild>
            <label htmlFor={`cover-input-${userId}`} className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 h-full">
              <Camera className="h-3.5 w-3.5" /><span className="hidden sm:inline">{theme === 'nitro' ? (currentCoverUrl ? "Change Banner (GIF allowed)" : "Add Banner (GIF)") : "Edit Cover"}</span>
            </label>
          </Button>
        )}
        <input ref={fileInputRef} id={`cover-input-${userId}`} type="file" accept={theme === 'nitro' ? "image/*,image/gif" : "image/*"} className="sr-only" tabIndex={-1} onChange={handleFileSelect} />
      </div>
      {cropSrc && <ImageCropDialog open={!!cropSrc} onOpenChange={(v) => !v && setCropSrc(null)} imageSrc={cropSrc} aspectRatio={16/9} shape="rect" onCropComplete={handleCropComplete} />}
    </>
  );
};
