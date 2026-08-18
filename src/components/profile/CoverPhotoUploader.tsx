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
}

const COVER_TRANSFORM = "c_fill,ar_16:9,g_auto,w_1200";
const COVER_PLACEHOLDER_TRANSFORM = "c_fill,ar_16:9,g_auto,w_32,e_blur:1000";

export const CoverPhotoUploader = ({ userId, currentCoverUrl, isOwner, onImageClick }: CoverPhotoUploaderProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      if (!isCloudinaryConfigured()) {
        throw new Error("Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env.");
      }
      const result = await uploadToCloudinary(blob, { folder: `prangon/covers/${userId}` });
      const { error: updateError } = await supabase.from("profiles").update({ cover_photo_url: result.secure_url }).eq("id", userId);
      if (updateError) throw updateError;
      return result.secure_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
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
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }
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
  const displayUrl = previewUrl || optimizeCloudinaryUrl(currentCoverUrl, COVER_TRANSFORM);
  const placeholderUrl = !previewUrl ? optimizeCloudinaryUrl(currentCoverUrl, COVER_PLACEHOLDER_TRANSFORM) : null;
  const isUploading = uploadMutation.isPending;

  return (
    <>
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
        <AnimatePresence mode="wait">
          {displayUrl ? (
            <motion.div key={displayUrl} initial={{ opacity: 0 }} animate={{ opacity: isImageLoaded ? 1 : 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
              <img
                src={displayUrl}
                alt="Cover"
                className="w-full h-full object-cover cursor-pointer"
                onLoad={() => setIsImageLoaded(true)}
                onClick={() => rawUrl && onImageClick?.(rawUrl)}
              />
            </motion.div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />
          )}
        </AnimatePresence>

        {placeholderUrl && !isImageLoaded && (
          <img src={placeholderUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-[1.02]" />
        )}
        {displayUrl && !isImageLoaded && !placeholderUrl && <div className="absolute inset-0 shimmer" />}

        {isUploading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Uploading...</span>
            </div>
          </div>
        )}

        {isOwner && !isUploading && (
          <Button
            variant="secondary"
            size="sm"
            className={cn("absolute bottom-3 right-3 gap-1.5 rounded-full z-20", "bg-background/80 backdrop-blur-sm shadow-lg", "hover:bg-background/90 transition-all", "text-xs font-medium")}
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit Cover</span>
          </Button>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {cropSrc && (
        <ImageCropDialog open={!!cropSrc} onOpenChange={(v) => !v && setCropSrc(null)} imageSrc={cropSrc} aspectRatio={16 / 9} shape="rect" onCropComplete={handleCropComplete} />
      )}
    </>
  );
};
