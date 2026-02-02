import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useCreatePost } from "@/hooks/usePosts";
import {
  Loader2,
  Image as ImageIcon,
  Video,
  X,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Users,
  Globe,
  Plus,
  Check,
  Crop,
  Sparkles,
  Film,
  FileImage,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface MediaItem {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const STEPS = [
  { id: 1, title: "Type", description: "What do you want to create?" },
  { id: 2, title: "Media", description: "Add photos or videos" },
  { id: 3, title: "Edit", description: "Crop and adjust" },
  { id: 4, title: "Caption", description: "Add a description" },
  { id: 5, title: "Audience", description: "Who can see this?" },
];

const Create = () => {
  const navigate = useNavigate();
  const createPost = useCreatePost();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [contentType, setContentType] = useState<"post" | "reel">("post");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<"public" | "friends">("public");
  const [location, setLocation] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `${file.name} exceeds 50MB limit`,
        variant: "destructive",
      });
      return false;
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: `${file.name} must be an image or video`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFilesAdd = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = MAX_FILES - mediaItems.length;

    if (fileArray.length > remainingSlots) {
      toast({
        title: "Too many files",
        description: `Maximum ${MAX_FILES} files allowed.`,
        variant: "destructive",
      });
    }

    const filesToAdd = fileArray.slice(0, remainingSlots).filter(validateFile);

    filesToAdd.forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaItems((prev) => [
          ...prev,
          {
            id,
            file,
            preview: reader.result as string,
            type: file.type.startsWith("video/") ? "video" : "image",
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, [mediaItems.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) handleFilesAdd(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (id: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!caption && mediaItems.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const files = mediaItems.map((item) => item.file);
      createPost.mutate(
        { caption, files: files.length > 0 ? files : undefined, isReel: contentType === "reel" },
        {
          onSuccess: () => {
            setCaption("");
            setMediaItems([]);
            setUploadProgress(100);
            navigate(contentType === "reel" ? "/reels" : "/");
          },
          onError: () => {
            setIsUploading(false);
            setUploadProgress(0);
          },
        }
      );
    } catch {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return mediaItems.length > 0 || contentType === "post";
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 5) {
      // Skip edit step if no media
      if (step === 2 && mediaItems.length === 0) {
        setStep(4);
      } else {
        setStep(step + 1);
      }
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      // Skip edit step if no media
      if (step === 4 && mediaItems.length === 0) {
        setStep(2);
      } else {
        setStep(step - 1);
      }
    } else {
      navigate(-1);
    }
  };

  const acceptedTypes = contentType === "reel" ? "video/*" : "image/*,video/*";

  return (
    <MainLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-semibold text-lg">Create</h1>
            <div className="w-9" />
          </div>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex justify-between items-center mb-2 max-w-md mx-auto">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  step === s.id
                    ? "bg-primary text-primary-foreground"
                    : step > s.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
            ))}
          </div>
          <p className="text-sm text-center text-muted-foreground">
            {STEPS[step - 1].description}
          </p>
        </div>

        {/* Content */}
        <div className="p-4 max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Type Selection */}
              {step === 1 && (
                <div className="space-y-4">
                  <button
                    onClick={() => setContentType("post")}
                    className={cn(
                      "w-full p-6 rounded-2xl flex items-center gap-4 transition-all",
                      contentType === "post"
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <div className="p-3 rounded-xl bg-background">
                      <FileImage className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">Post</h3>
                      <p className="text-sm text-muted-foreground">
                        Share photos, videos, or text with your audience
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setContentType("reel")}
                    className={cn(
                      "w-full p-6 rounded-2xl flex items-center gap-4 transition-all",
                      contentType === "reel"
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <div className="p-3 rounded-xl bg-background">
                      <Film className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">Reel</h3>
                      <p className="text-sm text-muted-foreground">
                        Create short-form video content
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2: Media Selection */}
              {step === 2 && (
                <div className="space-y-4">
                  {mediaItems.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {mediaItems.map((item) => (
                          <div
                            key={item.id}
                            className="relative aspect-square rounded-xl overflow-hidden bg-muted group"
                          >
                            {item.type === "video" ? (
                              <video
                                src={item.preview}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : (
                              <img
                                src={item.preview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            )}
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeMedia(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5">
                              {item.type === "video" ? (
                                <Video className="h-3 w-3" />
                              ) : (
                                <ImageIcon className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        ))}
                        {mediaItems.length < MAX_FILES && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors"
                          >
                            <Plus className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Add</span>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {mediaItems.length}/{MAX_FILES} files added
                      </p>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center gap-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="p-4 rounded-full bg-muted">
                        {contentType === "reel" ? (
                          <Video className="h-10 w-10 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-medium">
                          Tap to add {contentType === "reel" ? "video" : "photos or videos"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Up to {MAX_FILES} files, 50MB each
                        </p>
                      </div>
                      <Button variant="outline" className="rounded-full">
                        Select from gallery
                      </Button>
                    </div>
                  )}

                  {contentType === "post" && mediaItems.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground">
                      Or skip to create a text-only post
                    </p>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptedTypes}
                    onChange={handleInputChange}
                    className="hidden"
                    multiple={contentType !== "reel"}
                  />
                </div>
              )}

              {/* Step 3: Edit/Crop */}
              {step === 3 && mediaItems.length > 0 && (
                <div className="space-y-4">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-muted relative">
                    {mediaItems[0].type === "video" ? (
                      <video
                        src={mediaItems[0].preview}
                        className="w-full h-full object-contain"
                        controls
                      />
                    ) : (
                      <img
                        src={mediaItems[0].preview}
                        alt="Edit preview"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>

                  <div className="flex justify-center gap-4">
                    <Button variant="outline" className="gap-2 rounded-full">
                      <Crop className="h-4 w-4" />
                      Crop
                    </Button>
                    <Button variant="outline" className="gap-2 rounded-full">
                      <Sparkles className="h-4 w-4" />
                      Filters
                    </Button>
                  </div>

                  {mediaItems.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {mediaItems.map((item, index) => (
                        <div
                          key={item.id}
                          className={cn(
                            "shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer transition-all",
                            index === 0 ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
                          )}
                        >
                          {item.type === "video" ? (
                            <video src={item.preview} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={item.preview} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Caption */}
              {step === 4 && (
                <div className="space-y-4">
                  <Textarea
                    placeholder={contentType === "reel" ? "Describe your reel..." : "What's on your mind?"}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="min-h-40 resize-none rounded-xl border-border/50 focus:border-primary bg-muted/30"
                  />
                  <p className={cn(
                    "text-xs text-right",
                    caption.length > 4500 ? "text-amber-500" : "text-muted-foreground",
                    caption.length > 5000 && "text-destructive"
                  )}>
                    {caption.length}/5,000
                  </p>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      placeholder="Add location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Audience */}
              {step === 5 && (
                <div className="space-y-4">
                  <button
                    onClick={() => setAudience("public")}
                    className={cn(
                      "w-full p-4 rounded-xl flex items-center gap-3 transition-all",
                      audience === "public"
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted"
                    )}
                  >
                    <Globe className="h-5 w-5" />
                    <div className="text-left">
                      <h4 className="font-medium text-sm">Public</h4>
                      <p className="text-xs text-muted-foreground">
                        Anyone can see this
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => setAudience("friends")}
                    className={cn(
                      "w-full p-4 rounded-xl flex items-center gap-3 transition-all",
                      audience === "friends"
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted"
                    )}
                  >
                    <Users className="h-5 w-5" />
                    <div className="text-left">
                      <h4 className="font-medium text-sm">Friends Only</h4>
                      <p className="text-xs text-muted-foreground">
                        Only your friends can see
                      </p>
                    </div>
                  </button>

                  {/* Preview */}
                  {mediaItems.length > 0 && (
                    <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Preview</p>
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                          {mediaItems[0].type === "video" ? (
                            <video src={mediaItems[0].preview} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={mediaItems[0].preview} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{caption || "No caption"}</p>
                          {location && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Upload Progress */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Actions */}
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t border-border">
          <div className="flex gap-3 max-w-2xl mx-auto">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-12"
              onClick={handleBack}
            >
              {step === 1 ? "Cancel" : (
                <>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </>
              )}
            </Button>
            <Button
              className="flex-1 rounded-xl h-12"
              disabled={!canProceed() || createPost.isPending || isUploading}
              onClick={handleNext}
            >
              {createPost.isPending || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Posting...
                </>
              ) : step === 5 ? (
                "Share"
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Create;
