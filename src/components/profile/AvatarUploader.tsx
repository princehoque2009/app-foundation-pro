import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Camera, Image, Check, Loader2, UserCircle } from "lucide-react";
import { ImageCropDialog } from "@/components/circles/ImageCropDialog";

interface AvatarUploaderProps {
  currentAvatar?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (url: string) => void;
}

export const AvatarUploader = ({
  currentAvatar,
  open,
  onOpenChange,
  onSuccess,
}: AvatarUploaderProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      setUploadProgress(10);
      const fileName = `avatar-${user?.id}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      setUploadProgress(60);

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user?.id);
      if (updateError) throw updateError;
      setUploadProgress(100);

      return urlData.publicUrl;
    },
    onSuccess: (url) => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profile photo updated!" });
      onSuccess?.(url);
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 400);
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadProgress(0);
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
    uploadMutation.mutate(blob);
  }, [uploadMutation]);

  const resetForm = () => {
    setCropSrc(null);
    setUploadProgress(0);
  };

  const isUploading = uploadMutation.isPending;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!isUploading) {
            if (!v) resetForm();
            onOpenChange(v);
          }
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Change Profile Photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current avatar preview */}
            <div className="flex justify-center relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={currentAvatar} />
                <AvatarFallback>
                  <UserCircle className="h-16 w-16 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="bg-background/80 rounded-full p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <Progress value={uploadProgress} className="w-24 h-1.5 mt-2" />
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              id="avatar-uploader-input"
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              onChange={handleFileSelect}
            />

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 p-0"
                asChild
                disabled={isUploading}
              >
                <label htmlFor="avatar-uploader-input" className="flex items-center justify-center gap-2 w-full h-full cursor-pointer px-4 py-2">
                  <Image className="h-4 w-4" />
                  Choose from Gallery
                </label>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 p-0"
                asChild
                disabled={isUploading}
              >
                <label htmlFor="avatar-uploader-input" className="flex items-center justify-center gap-2 w-full h-full cursor-pointer px-4 py-2">
                  <Camera className="h-4 w-4" />
                  Take Photo
                </label>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop dialog */}
      {cropSrc && (
        <ImageCropDialog
          open={!!cropSrc}
          onOpenChange={(v) => !v && setCropSrc(null)}
          imageSrc={cropSrc}
          aspectRatio={1}
          shape="round"
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
};
