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
  Camera, Image, Upload, X, Globe, Users, Lock, Loader2, Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StoryEditorCanvas, TextElement, StickerElement, DrawingPath } from "./StoryEditorCanvas";

interface StoryComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_VIDEO_DURATION = 30;

type Step = "pick" | "edit" | "preview";

export const StoryComposer = ({ open, onOpenChange }: StoryComposerProps) => {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraPhotoRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("pick");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [audience, setAudience] = useState("public");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Editor data
  const [editorData, setEditorData] = useState<{
    texts: TextElement[];
    stickers: StickerElement[];
    drawings: DrawingPath[];
    filter: string;
  } | null>(null);

  const { uploadStory } = useStories();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVid = file.type.startsWith("video/");
    if (!isImage && !isVid) {
      toast({ title: "Invalid file", description: "Please select an image or video", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 50MB", variant: "destructive" });
      return;
    }

    if (isVid) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > MAX_VIDEO_DURATION) {
          toast({
            title: "Video too long",
            description: `Videos must be ${MAX_VIDEO_DURATION} seconds or less.`,
            variant: "destructive",
          });
          return;
        }
        setSelectedFile(file);
        setMediaType("video");
        setPreview(URL.createObjectURL(file));
        setStep("edit");
      };
      video.src = URL.createObjectURL(file);
    } else {
      setSelectedFile(file);
      setMediaType("image");
      setPreview(URL.createObjectURL(file));
      setStep("edit");
    }
    e.target.value = "";
  };

  const handleEditorSave = (data: typeof editorData) => {
    setEditorData(data);
    setStep("preview");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadProgress(10);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      await uploadStory.mutateAsync({
        file: selectedFile,
        visibility: audience,
        editorData,
      });
      setUploadProgress(100);
      clearInterval(progressInterval);
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 500);
    } catch {
      clearInterval(progressInterval);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setStep("pick");
    setAudience("public");
    setUploadProgress(0);
    setEditorData(null);
  };

  const isUploading = uploadStory.isPending || uploadProgress > 0;

  // Full-screen editor - render outside dialog
  if (step === "edit" && preview) {
    return (
      <StoryEditorCanvas
        mediaSrc={preview}
        mediaType={mediaType}
        onSave={handleEditorSave}
        onCancel={() => {
          setStep("pick");
          setPreview(null);
          setSelectedFile(null);
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
                  <p className="text-white font-medium">Upload Photo or Video</p>
                  <p className="text-white/60 text-sm mt-1">Max 50MB • Videos up to {MAX_VIDEO_DURATION}s</p>
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

                <input ref={galleryRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
                <input ref={cameraPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                <input ref={cameraVideoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleFileSelect} />
              </div>
            </motion.div>
          )}

          {step === "preview" && preview && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative min-h-[80vh] flex flex-col"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep("edit")}
                className="absolute top-4 left-4 z-20 text-white hover:bg-white/10"
                disabled={isUploading}
              >
                <X className="h-5 w-5" />
              </Button>

              <div className="flex-1 relative flex items-center justify-center bg-black">
                {mediaType === "image" ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-w-full max-h-[70vh] object-contain"
                    style={{
                      filter: editorData?.filter
                        ? [
                            { id: "warm", css: "brightness(1.1) saturate(1.3) sepia(0.15)" },
                            { id: "cool", css: "brightness(1.05) saturate(0.9) hue-rotate(15deg)" },
                            { id: "vintage", css: "sepia(0.4) contrast(1.1) brightness(0.95)" },
                            { id: "dramatic", css: "contrast(1.4) saturate(1.2) brightness(0.9)" },
                            { id: "fade", css: "contrast(0.85) brightness(1.1) saturate(0.8)" },
                            { id: "bw", css: "grayscale(1) contrast(1.2)" },
                            { id: "vivid", css: "saturate(1.6) contrast(1.1)" },
                          ].find(f => f.id === editorData.filter)?.css || ""
                        : "",
                    }}
                  />
                ) : (
                  <video src={preview} controls playsInline className="max-w-full max-h-[70vh]" />
                )}

                {/* Render text overlays */}
                {editorData?.texts.map(t => (
                  <div
                    key={t.id}
                    className="absolute pointer-events-none"
                    style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <p
                      style={{
                        color: t.color,
                        backgroundColor: t.bgColor || "transparent",
                        fontSize: `${t.fontSize}px`,
                        fontWeight: t.bold ? 700 : 400,
                        fontStyle: t.italic ? "italic" : "normal",
                      }}
                      className="px-3 py-1.5 rounded-lg text-center"
                    >
                      {t.text}
                    </p>
                  </div>
                ))}

                {/* Render stickers */}
                {editorData?.stickers.map(s => (
                  <div
                    key={s.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      transform: `translate(-50%, -50%) scale(${s.scale})`,
                    }}
                  >
                    {s.type === "emoji" && <span className="text-5xl">{s.data.emoji}</span>}
                    {s.type === "poll" && (
                      <div className="bg-white/95 rounded-2xl p-3 min-w-[180px]">
                        <p className="text-sm font-bold text-foreground mb-2">{s.data.question}</p>
                        {s.data.options.map((opt: string, i: number) => (
                          <div key={i} className="bg-muted rounded-full py-1.5 px-3 mb-1 text-sm text-center">{opt}</div>
                        ))}
                      </div>
                    )}
                    {s.type === "question" && (
                      <div className="bg-white/95 rounded-2xl p-3 min-w-[180px] text-center">
                        <p className="text-xs font-semibold text-primary mb-1">{s.data.question}</p>
                        <div className="bg-muted rounded-full py-1.5 px-3 text-sm text-muted-foreground">Type your answer...</div>
                      </div>
                    )}
                    {s.type === "countdown" && (
                      <div className="bg-primary rounded-2xl p-3 min-w-[160px] text-center text-primary-foreground">
                        <p className="text-xs font-semibold mb-1">{s.data.label}</p>
                        <p className="text-xl font-bold">24:00:00</p>
                      </div>
                    )}
                  </div>
                ))}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin mb-4" />
                    <Progress value={uploadProgress} className="w-48 h-2" />
                    <p className="text-white text-sm mt-2">Uploading...</p>
                  </div>
                )}
              </div>

              {!isUploading && (
                <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <div className="mb-4">
                    <RadioGroup value={audience} onValueChange={setAudience} className="flex justify-center gap-2">
                      {[
                        { value: "public", label: "Public", icon: Globe },
                        { value: "friends", label: "Friends", icon: Users },
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
