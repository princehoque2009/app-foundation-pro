import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ImageCropDialog } from "@/components/circles/ImageCropDialog";

interface CoverPhotoUploaderProps {
  userId: string;
  currentCoverUrl?: string | null;
  isOwner: boolean;
  onImageClick?: (url: string) => void;
}

export const CoverPhotoUploader = ({
  userId,
  currentCoverUrl,
  isOwner,
  onImageClick,
}: CoverPhotoUploaderProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const fileName = `cover-${userId}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("cover-photos")
        .upload(fileName, blob, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("cover-photos").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_photo_url: urlData.publicUrl })
        .eq("id", userId);
      if (updateError) throw updateError;

      return urlData.publicUrl;
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
  };

  const handleCropComplete = useCallback((blob: Blob) => {
    setCropSrc(null);
    const objectUrl = URL.createObjectURL(blob);
    setPreviewUrl(objectUrl);
    setIsImageLoaded(false);
    uploadMutation.mutate(blob);
  }, [uploadMutation]);

  const displayUrl = previewUrl || currentCoverUrl;
  const isUploading = uploadMutation.isPending;

  return (
    <>
      <div className="relative h-36 sm:h-48 w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
        <AnimatePresence mode="wait">
          {displayUrl ? (
            <motion.div
              key={displayUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: isImageLoaded ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <img
                src={displayUrl}
                alt="Cover"
                className="w-full h-full object-cover"
                onLoad={() => setIsImageLoaded(true)}
              />
            </motion.div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />
          )}
        </AnimatePresence>

        {displayUrl && !isImageLoaded && (
          <div className="absolute inset-0 shimmer" />
        )}

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
            className={cn(
              "absolute bottom-3 right-3 gap-1.5 rounded-full z-20",
              "bg-background/80 backdrop-blur-sm shadow-lg",
              "hover:bg-background/90 transition-all",
              "text-xs font-medium"
            )}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit Cover</span>
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {cropSrc && (
        <ImageCropDialog
          open={!!cropSrc}
          onOpenChange={(v) => !v && setCropSrc(null)}
          imageSrc={cropSrc}
          aspectRatio={3}
          shape="rect"
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
};
