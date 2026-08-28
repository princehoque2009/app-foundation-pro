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
  currentNitroCoverUrl?: string | null;
  isOwner: boolean;
  onImageClick?: (url: string) => void;
  theme?: string;
}

const COVER_TRANSFORM = "c_fill,ar_16:9,g_auto,w_1200";
const COVER_PLACEHOLDER_TRANSFORM = "c_fill,ar_16:9,g_auto,w_32,e_blur:1000";

export const CoverPhotoUploader = ({ userId, currentCoverUrl, currentNitroCoverUrl, isOwner, onImageClick, theme = 'default' }: CoverPhotoUploaderProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingIsNitro, setPendingIsNitro] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({ blob, isNitro }: { blob: Blob; isNitro: boolean }) => {
      if (!isCloudinaryConfigured()) throw new Error("Cloudinary not configured");
      const result = await uploadToCloudinary(blob, { folder: `prangon/covers/${userId}` });
      const updateField = isNitro ? { nitro_cover_url: result.secure_url } : { cover_photo_url: result.secure_url };
      const { error } = await supabase.from("profiles").update(updateField).eq("id", userId);
      if (error) throw error;
      return result.secure_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: pendingIsNitro ? "Nitro banner updated!" : "Cover photo updated!" });
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
    const isNitroTheme = theme === 'nitro';
    if (isGif && !isNitroTheme) {
      toast({ title: "GIF only for Nitro", description: "Switch to Nitro theme to use GIF", variant: "destructive" });
      return;
    }
    if (isGif && isNitroTheme) {
      setPendingIsNitro(true);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setIsImageLoaded(false);
      uploadMutation.mutate({ blob: file, isNitro: true });
      e.target.value = "";
      return;
    }
    if (isNitroTheme) {
      setPendingIsNitro(true);
      setCropSrc(URL.createObjectURL(file));
    } else {
      setPendingIsNitro(false);
      setCropSrc(URL.createObjectURL(file));
    }
    e.target.value = "";
  };

  const handleCropComplete = useCallback((blob: Blob) => {
    setCropSrc(null);
    const objectUrl = URL.createObjectURL(blob);
    setPreviewUrl(objectUrl);
    setIsImageLoaded(false);
    uploadMutation.mutate({ blob, isNitro: pendingIsNitro });
  }, [uploadMutation, pendingIsNitro]);

  const activeCoverRaw = theme === 'nitro' ? (currentNitroCoverUrl || currentCoverUrl) : currentCoverUrl;
  const rawUrl = previewUrl || activeCoverRaw;
  const isGifCover = activeCoverRaw?.toLowerCase().includes('.gif');
  const displayUrl = previewUrl || (isGifCover ? activeCoverRaw : optimizeCloudinaryUrl(activeCoverRaw, COVER_TRANSFORM));
  const placeholderUrl = !previewUrl && !isGifCover ? optimizeCloudinaryUrl(activeCoverRaw, COVER_PLACEHOLDER_TRANSFORM) : null;

  return (
    <>
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
        <AnimatePresence mode="wait">
          {displayUrl ? (
            <motion.div key={displayUrl} initial={{ opacity: 0 }} animate={{ opacity: isImageLoaded ? 1 : 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
              <img src={displayUrl} alt="Cover" className="w-full h-full object-cover cursor-pointer" onLoad={() => setIsImageLoaded(true)} onClick={() => rawUrl && onImageClick?.(rawUrl)} />
            </motion.div>
          ) : <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />}
        </AnimatePresence>
        {placeholderUrl && !isImageLoaded && <img src={placeholderUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-[1.02]" />}
        {uploadMutation.isPending && <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center"><div className="flex flex-col items-center gap-2"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="text-xs">{pendingIsNitro ? "Uploading Nitro banner..." : "Uploading..."}</span></div></div>}
        {isOwner && !uploadMutation.isPending && (
          <Button variant="secondary" size="sm" className={cn("absolute bottom-3 right-3 gap-1.5 rounded-full z-20 bg-background/80 backdrop-blur-sm shadow-lg text-xs")} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            <Camera className="h-3.5 w-3.5" /><span className="hidden sm:inline">{theme === 'nitro' ? (currentNitroCoverUrl ? "Change Nitro Banner" : "Add Nitro Banner") : "Edit Cover"}</span>
          </Button>
        )}
        <input ref={fileInputRef} type="file" accept={theme === 'nitro' ? "image/*,image/gif" : "image/*"} className="hidden" onChange={handleFileSelect} />
      </div>
      {cropSrc && <ImageCropDialog open={!!cropSrc} onOpenChange={(v) => !v && setCropSrc(null)} imageSrc={cropSrc} aspectRatio={16/9} shape="rect" onCropComplete={handleCropComplete} />}
    </>
  );
};
