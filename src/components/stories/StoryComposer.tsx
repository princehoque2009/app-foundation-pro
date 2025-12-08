import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useStories } from "@/hooks/useStories";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Image,
  Upload,
  X,
  Type,
  Sticker,
  Globe,
  Users,
  Lock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StoryComposer = ({ open, onOpenChange }: StoryComposerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [textOverlay, setTextOverlay] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [audience, setAudience] = useState("public");
  const [uploadProgress, setUploadProgress] = useState(0);
  const { uploadStory } = useStories();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file under 50MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image or video",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Simulate progress for UX
    setUploadProgress(10);
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      await uploadStory.mutateAsync(selectedFile);
      setUploadProgress(100);
      clearInterval(progressInterval);
      
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setTextOverlay("");
    setShowTextInput(false);
    setAudience("public");
    setUploadProgress(0);
  };

  const isUploading = uploadStory.isPending || uploadProgress > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isUploading) {
          resetForm();
        }
        if (!isUploading) {
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-md p-0 bg-black overflow-hidden">
        <AnimatePresence mode="wait">
          {!preview ? (
            // Upload Screen
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 min-h-[60vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-lg font-semibold">Create Story</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[9/16] max-h-[50vh] border-2 border-dashed border-white/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-white/50 transition-colors"
                >
                  <div className="p-4 rounded-full bg-white/10 mb-4">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white font-medium">Upload Photo or Video</p>
                  <p className="text-white/60 text-sm mt-1">Max 50MB</p>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-4 w-4" />
                    Gallery
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() => {
                      // TODO: Camera capture
                      fileInputRef.current?.click();
                    }}
                  >
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </motion.div>
          ) : (
            // Preview & Edit Screen
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative min-h-[80vh] flex flex-col"
            >
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreview(null)}
                className="absolute top-4 left-4 z-20 text-white hover:bg-white/10"
                disabled={isUploading}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Preview */}
              <div className="flex-1 relative flex items-center justify-center bg-black">
                {selectedFile?.type.startsWith("image/") ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <video
                    src={preview}
                    controls
                    className="max-w-full max-h-[70vh]"
                  />
                )}

                {/* Text Overlay */}
                {textOverlay && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-white text-2xl font-bold text-center px-4 py-2 bg-black/50 rounded-lg">
                      {textOverlay}
                    </p>
                  </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin mb-4" />
                    <Progress value={uploadProgress} className="w-48 h-2" />
                    <p className="text-white text-sm mt-2">Uploading...</p>
                  </div>
                )}
              </div>

              {/* Edit Tools */}
              {!isUploading && (
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20",
                      showTextInput && "bg-primary"
                    )}
                    onClick={() => setShowTextInput(!showTextInput)}
                  >
                    <Type className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <Sticker className="h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* Text Input */}
              <AnimatePresence>
                {showTextInput && !isUploading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-32 left-4 right-4"
                  >
                    <Input
                      value={textOverlay}
                      onChange={(e) => setTextOverlay(e.target.value)}
                      placeholder="Add text..."
                      className="bg-white/10 border-0 text-white placeholder:text-white/50 text-center"
                      autoFocus
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Actions */}
              {!isUploading && (
                <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                  {/* Audience Selector */}
                  <div className="mb-4">
                    <RadioGroup
                      value={audience}
                      onValueChange={setAudience}
                      className="flex justify-center gap-2"
                    >
                      <div className="flex items-center">
                        <RadioGroupItem
                          value="public"
                          id="public"
                          className="hidden"
                        />
                        <Label
                          htmlFor="public"
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors",
                            audience === "public"
                              ? "bg-white text-black"
                              : "bg-white/10 text-white"
                          )}
                        >
                          <Globe className="h-3.5 w-3.5" />
                          Public
                        </Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem
                          value="friends"
                          id="friends"
                          className="hidden"
                        />
                        <Label
                          htmlFor="friends"
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors",
                            audience === "friends"
                              ? "bg-white text-black"
                              : "bg-white/10 text-white"
                          )}
                        >
                          <Users className="h-3.5 w-3.5" />
                          Friends
                        </Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem
                          value="close_friends"
                          id="close_friends"
                          className="hidden"
                        />
                        <Label
                          htmlFor="close_friends"
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors",
                            audience === "close_friends"
                              ? "bg-white text-black"
                              : "bg-white/10 text-white"
                          )}
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Close Friends
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button
                    onClick={handleUpload}
                    className="w-full rounded-full"
                    size="lg"
                  >
                    Share Story
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
