import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useStories } from "@/hooks/useStories";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Image, Upload, X, Globe, Users, Lock, Loader2, Video, Plus, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StoryEditorCanvas, TextElement, StickerElement, DrawingPath } from "./StoryEditorCanvas";

interface StoryComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_VIDEO_DURATION = 30;

interface StorySlide {
  file: File;
  preview: string;
  mediaType: "image" | "video";
  editorData: {
    texts: TextElement[];
    stickers: StickerElement[];
    drawings: DrawingPath[];
    filter: string;
  } | null;
}

type Step = "pick" | "edit" | "preview";

export const StoryComposer = ({ open, onOpenChange }: StoryComposerProps) => {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraPhotoRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("pick");
  const [slides, setSlides] = useState<StorySlide[]>([]);
  const [editingIndex, setEditingIndex] = useState(0);
  const [audience, setAudience] = useState("public");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);

  const { uploadStory } = useStories();

  const processFile = (file: File): Promise<StorySlide | null> => {
    return new Promise((resolve) => {
      const isImage = file.type.startsWith("image/");
      const isVid = file.type.startsWith("video/");
      if (!isImage && !isVid) {
        toast({ title: "Invalid file", description: "Please select an image or video", variant: "destructive" });
        resolve(null);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max file size is 50MB", variant: "destructive" });
        resolve(null);
        return;
      }

      if (isVid) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          if (video.duration > MAX_VIDEO_DURATION) {
            toast({ title: "Video too long", description: `Videos must be ${MAX_VIDEO_DURATION}s or less.`, variant: "destructive" });
            resolve(null);
            return;
          }
          resolve({
            file,
            preview: URL.createObjectURL(file),
            mediaType: "video",
            editorData: null,
          });
        };
        video.src = URL.createObjectURL(file);
      } else {
        resolve({
          file,
          preview: URL.createObjectURL(file),
          mediaType: "image",
          editorData: null,
        });
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newSlides: StorySlide[] = [];
    for (const file of files) {
      const slide = await processFile(file);
      if (slide) newSlides.push(slide);
    }

    if (newSlides.length > 0) {
      setSlides(prev => [...prev, ...newSlides]);
      setEditingIndex(slides.length); // edit the first new slide
      setStep("edit");
    }
    e.target.value = "";
  };

  const handleAddMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newSlides: StorySlide[] = [];
    for (const file of files) {
      const slide = await processFile(file);
      if (slide) newSlides.push(slide);
    }
    if (newSlides.length > 0) {
      setSlides(prev => [...prev, ...newSlides]);
    }
    e.target.value = "";
  };

  const handleEditorSave = (data: StorySlide["editorData"]) => {
    setSlides(prev => {
      const updated = [...prev];
      updated[editingIndex] = { ...updated[editingIndex], editorData: data };
      return updated;
    });
    setStep("preview");
  };

  const handleRemoveSlide = (index: number) => {
    setSlides(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (slides.length === 0) return;

    setUploadProgress(5);
    const total = slides.length;

    try {
      for (let i = 0; i < total; i++) {
        setCurrentUploadIndex(i);
        setUploadProgress(Math.round(((i) / total) * 100));

        await uploadStory.mutateAsync({
          file: slides[i].file,
          visibility: audience,
          editorData: slides[i].editorData,
        });
      }
      setUploadProgress(100);
      toast({ title: `${total} ${total === 1 ? "story" : "stories"} published!` });
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 500);
    } catch {
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    slides.forEach(s => URL.revokeObjectURL(s.preview));
    setSlides([]);
    setStep("pick");
    setAudience("public");
    setUploadProgress(0);
    setEditingIndex(0);
    setCurrentUploadIndex(0);
  };

  const isUploading = uploadStory.isPending || uploadProgress > 0;

  // Full-screen editor
  if (step === "edit" && slides[editingIndex]) {
    return (
      <StoryEditorCanvas
        mediaSrc={slides[editingIndex].preview}
        mediaType={slides[editingIndex].mediaType}
        onSave={handleEditorSave}
        onCancel={() => {
          if (slides.length === 1 && !slides[0].editorData) {
            resetForm();
            setStep("pick");
          } else {
            setStep("preview");
          }
        }}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!isUploading) {
          if (!v) resetForm();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-md p-0 bg-black overflow-hidden [&>button]:hidden">
        <AnimatePresence mode="wait">
          {step === "pick" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 min-h-[60vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-lg font-semibold">Create Story</h2>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div
                  onClick={() => galleryRef.current?.click()}
                  className="w-full aspect-[9/16] max-h-[50vh] border-2 border-dashed border-white/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-white/50 transition-colors"
                >
                  <div className="p-4 rounded-full bg-white/10 mb-4">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white font-medium">Upload Photos or Videos</p>
                  <p className="text-white/60 text-sm mt-1">Select multiple • Max 50MB each</p>
                </div>

                <div className="flex gap-3 w-full">
                  <Button variant="outline" className="flex-1 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => galleryRef.current?.click()}>
                    <Image className="h-4 w-4" />Gallery
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => cameraPhotoRef.current?.click()}>
                    <Camera className="h-4 w-4" />Photo
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => cameraVideoRef.current?.click()}>
                    <Video className="h-4 w-4" />Video
                  </Button>
                </div>

                <input ref={galleryRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
                <input ref={cameraPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                <input ref={cameraVideoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleFileSelect} />
              </div>
            </motion.div>
          )}

          {step === "preview" && slides.length > 0 && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative min-h-[80vh] flex flex-col"
            >
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { resetForm(); setStep("pick"); }}
                  className="text-white hover:bg-white/10"
                  disabled={isUploading}
                >
                  <X className="h-5 w-5" />
                </Button>
                <span className="text-white text-sm font-medium">
                  {slides.length} {slides.length === 1 ? "story" : "stories"}
                </span>
                <div className="w-8" />
              </div>

              {/* Slide thumbnails */}
              <div className="flex gap-2 px-4 pt-14 pb-3 overflow-x-auto scrollbar-hide">
                {slides.map((slide, i) => (
                  <div key={i} className="relative flex-shrink-0 group">
                    <button
                      onClick={() => { setEditingIndex(i); setStep("edit"); }}
                      className={cn(
                        "w-16 h-24 rounded-xl overflow-hidden border-2 transition-all",
                        "hover:border-white",
                        "border-white/30"
                      )}
                    >
                      {slide.mediaType === "image" ? (
                        <img src={slide.preview} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <video src={slide.preview} className="w-full h-full object-cover" muted />
                      )}
                    </button>
                    {slides.length > 1 && (
                      <button
                        onClick={() => handleRemoveSlide(i)}
                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
                {/* Add more button */}
                <button
                  onClick={() => addMoreRef.current?.click()}
                  className="w-16 h-24 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center hover:border-white/50 transition-colors flex-shrink-0"
                  disabled={isUploading}
                >
                  <Plus className="h-5 w-5 text-white/60" />
                </button>
                <input ref={addMoreRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleAddMore} />
              </div>

              {/* Main preview */}
              <div className="flex-1 relative flex items-center justify-center bg-black px-4">
                {slides[0] && (
                  slides[0].mediaType === "image" ? (
                    <img src={slides[0].preview} alt="Preview" className="max-w-full max-h-[50vh] object-contain rounded-2xl" />
                  ) : (
                    <video src={slides[0].preview} controls playsInline className="max-w-full max-h-[50vh] rounded-2xl" />
                  )
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-2xl">
                    <Loader2 className="h-8 w-8 text-white animate-spin mb-4" />
                    <Progress value={uploadProgress} className="w-48 h-2" />
                    <p className="text-white text-sm mt-2">
                      Publishing {currentUploadIndex + 1} of {slides.length}...
                    </p>
                  </div>
                )}
              </div>

              {!isUploading && (
                <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <div className="mb-4">
                    <RadioGroup value={audience} onValueChange={setAudience} className="flex justify-center gap-2">
                      {[
                        { value: "public", label: "Public", icon: Globe },
                        { value: "friends", label: "Followers", icon: Users },
                        { value: "close_friends", label: "Close Friends", icon: Lock },
                      ].map(({ value, label, icon: Icon }) => (
                        <div key={value} className="flex items-center">
                          <RadioGroupItem value={value} id={`story-${value}`} className="hidden" />
                          <Label
                            htmlFor={`story-${value}`}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors",
                              audience === value ? "bg-white text-black" : "bg-white/10 text-white"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <Button onClick={handleUpload} className="w-full rounded-full" size="lg">
                    Share {slides.length > 1 ? `${slides.length} Stories` : "Story"}
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
