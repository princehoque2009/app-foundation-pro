import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Camera,
  Upload,
  Image,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  Loader2,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState([1]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(10);

      // Compress and crop image
      const processedBlob = await processImage(file);
      setUploadProgress(40);

      // Upload to Supabase Storage (avatars bucket, same pattern as cover photos)
      const fileExt = "jpg";
      const fileName = `avatar-${user?.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, processedBlob, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user?.id);

      if (updateError) throw updateError;
      setUploadProgress(100);

      return publicUrl;
    },
    onSuccess: (url) => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profile photo updated!" });
      onSuccess?.(url);
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const processImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        // Calculate crop dimensions (square, centered)
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        // Output size
        const outputSize = 400;
        canvas.width = outputSize;
        canvas.height = outputSize;

        // Apply zoom
        const scale = zoom[0];
        const scaledSize = size / scale;
        const scaledX = x + (size - scaledSize) / 2;
        const scaledY = y + (size - scaledSize) / 2;

        ctx?.drawImage(
          img,
          scaledX,
          scaledY,
          scaledSize,
          scaledSize,
          0,
          0,
          outputSize,
          outputSize
        );

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to process image"));
          },
          "image/jpeg",
          0.9
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

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

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setZoom([1]);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setZoom([1]);
    setUploadProgress(0);
  };

  const isUploading = uploadMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isUploading) {
          if (!v) resetForm();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!preview ? (
            // Select Photo
            <div className="space-y-4">
              <div className="flex justify-center">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={currentAvatar} />
                  <AvatarFallback>
                    <UserCircle className="h-16 w-16 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-4 w-4" />
                  Choose from Gallery
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    // TODO: Camera capture
                    fileInputRef.current?.click();
                  }}
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            // Crop & Preview
            <div className="space-y-4">
              <div className="relative">
                {/* Preview with crop mask */}
                <div className="relative w-full aspect-square rounded-full overflow-hidden bg-muted mx-auto max-w-[240px]">
                  <img
                    src={preview}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      transform: `scale(${zoom[0]})`,
                      transformOrigin: "center",
                    }}
                  />
                </div>

                {/* Upload Progress Overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-full max-w-[240px] mx-auto aspect-square">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <Progress value={uploadProgress} className="w-24 h-1.5" />
                  </div>
                )}
              </div>

              {/* Zoom Control */}
              {!isUploading && (
                <div className="flex items-center gap-3 px-4">
                  <ZoomOut className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={zoom}
                    onValueChange={setZoom}
                    min={1}
                    max={3}
                    step={0.1}
                    className="flex-1"
                  />
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetForm}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
