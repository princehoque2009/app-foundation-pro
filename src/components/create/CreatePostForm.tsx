import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePost } from "@/hooks/usePosts";
import { Loader2, Image, Video, X, Upload, MapPin, Users, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const postSchema = z.object({
  caption: z.string().max(5000, "Caption must be less than 5000 characters").optional(),
  file: z.instanceof(File).refine(
    (file) => file.size <= 50 * 1024 * 1024,
    "File size must be less than 50MB"
  ).refine(
    (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    "File must be an image or video"
  ).optional(),
});

interface CreatePostFormProps {
  isReel?: boolean;
}

export const CreatePostForm = ({ isReel = false }: CreatePostFormProps) => {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [audience, setAudience] = useState<"public" | "friends">("public");
  const [location, setLocation] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const navigate = useNavigate();

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile) return;
    
    // Validate file
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 50MB",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedFile.type.startsWith("image/") && !selectedFile.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image or video",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileChange(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption && !file) return;

    const validation = postSchema.safeParse({ 
      caption: caption.trim(),
      file: file || undefined 
    });
    
    if (!validation.success) {
      toast({
        title: "Validation error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    createPost.mutate(
      { caption, file: file || undefined, isReel },
      {
        onSuccess: () => {
          setCaption("");
          setFile(null);
          setPreview(null);
          navigate(isReel ? "/reels" : "/");
        },
      }
    );
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const acceptedTypes = isReel ? "video/*" : "image/*,video/*";

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-card">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit}>
          {/* Media Upload Area */}
          <div className="p-6 pb-0">
            <AnimatePresence mode="wait">
              {preview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative rounded-2xl overflow-hidden bg-muted"
                >
                  {file?.type.startsWith("video/") ? (
                    <video 
                      src={preview} 
                      controls 
                      className="w-full max-h-[400px] object-contain bg-black" 
                    />
                  ) : (
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="w-full max-h-[400px] object-contain" 
                    />
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-3 right-3 rounded-full shadow-lg bg-background/80 backdrop-blur-sm hover:bg-background"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-xs font-medium">
                      {file?.type.startsWith("video/") ? "Video" : "Photo"}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200",
                    isDragging 
                      ? "border-primary bg-primary/5 scale-[1.02]" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className="flex flex-col items-center gap-4 pointer-events-none">
                    <div className={cn(
                      "p-4 rounded-full transition-colors",
                      isDragging ? "bg-primary/10" : "bg-muted"
                    )}>
                      {isReel ? (
                        <Video className={cn(
                          "h-10 w-10 transition-colors",
                          isDragging ? "text-primary" : "text-muted-foreground"
                        )} />
                      ) : (
                        <Upload className={cn(
                          "h-10 w-10 transition-colors",
                          isDragging ? "text-primary" : "text-muted-foreground"
                        )} />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-base font-medium">
                        {isDragging ? "Drop to upload" : "Drag photos or videos here"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        or click to browse
                      </p>
                    </div>
                    <Button type="button" variant="outline" className="rounded-full">
                      Select from device
                    </Button>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptedTypes}
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Caption */}
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder={isReel ? "Describe your reel..." : "What's on your mind?"}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-28 resize-none rounded-xl border-border/50 focus:border-primary bg-muted/30"
              />
              <p className="text-xs text-muted-foreground text-right">
                {caption.length}/5,000
              </p>
            </div>

            {/* Options */}
            <div className="flex flex-wrap gap-3">
              {/* Audience */}
              <Select value={audience} onValueChange={(v: "public" | "friends") => setAudience(v)}>
                <SelectTrigger className="w-auto min-w-36 rounded-full border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    {audience === "public" ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="friends">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Friends only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Location */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/50">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Add location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-transparent text-sm outline-none w-28 placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="px-6 pb-6">
            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
              disabled={(!caption && !file) || createPost.isPending}
            >
              {createPost.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Posting...</span>
                </div>
              ) : (
                `Share ${isReel ? "Reel" : "Post"}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
