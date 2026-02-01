import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CoverPhotoUploaderProps {
  userId: string;
  currentCoverUrl?: string | null;
  isOwner: boolean;
}

export const CoverPhotoUploader = ({
  userId,
  currentCoverUrl,
  isOwner,
}: CoverPhotoUploaderProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `cover-${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("cover-photos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("cover-photos")
        .getPublicUrl(fileName);

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
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setPreviewUrl(null);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsImageLoaded(false);
    
    // Upload the file
    uploadMutation.mutate(file);
  };

  const displayUrl = previewUrl || currentCoverUrl;
  const isUploading = uploadMutation.isPending;

  return (
    <div className="relative h-36 sm:h-48 w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
      {/* Cover Image */}
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

      {/* Loading placeholder with blur */}
      {displayUrl && !isImageLoaded && (
        <div className="absolute inset-0 shimmer" />
      )}

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </div>
        </div>
      )}

      {/* Edit Button - Owner Only */}
      {isOwner && !isUploading && (
        <Button
          variant="secondary"
          size="sm"
          className={cn(
            "absolute bottom-3 right-3 gap-1.5 rounded-full",
            "bg-background/80 backdrop-blur-sm shadow-lg",
            "hover:bg-background/90 transition-all",
            "text-xs font-medium"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Edit Cover</span>
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};
