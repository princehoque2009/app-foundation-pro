import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CoverPhotoUploaderProps {
  userId: string;
  currentCoverUrl?: string | null;
  isOwner: boolean;
  className?: string;
}

export const CoverPhotoUploader = ({
  userId,
  currentCoverUrl,
  isOwner,
  className,
}: CoverPhotoUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsLoading(true);

      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("cover-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("cover-photos")
        .getPublicUrl(uploadData.path);

      // Update profile
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
      setIsLoading(false);
    },
    onError: (error: Error) => {
      console.error("Cover photo upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  return (
    <div
      className={cn(
        "relative w-full h-32 sm:h-40 md:h-48 lg:h-56 overflow-hidden rounded-t-lg bg-gradient-to-br from-primary/20 to-primary/5",
        className
      )}
    >
      {/* Cover Image */}
      {currentCoverUrl ? (
        <>
          {/* Skeleton/blur placeholder while loading */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img
            src={currentCoverUrl}
            alt="Cover photo"
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
            {isOwner && (
              <p className="text-sm opacity-50">Add a cover photo</p>
            )}
          </div>
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

      {/* Edit Button - Owner Only */}
      {isOwner && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-3 right-3 gap-2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {currentCoverUrl ? "Change" : "Add Cover"}
          </Button>
        </>
      )}
    </div>
  );
};
