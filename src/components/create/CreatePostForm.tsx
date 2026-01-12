import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePost } from "@/hooks/usePosts";
import { Loader2, Image, Video, X, Upload, MapPin, Users, Globe, Plus, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, Reorder } from "framer-motion";

interface MediaItem {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface CreatePostFormProps {
  isReel?: boolean;
}

export const CreatePostForm = ({ isReel = false }: CreatePostFormProps) => {
  const [caption, setCaption] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [audience, setAudience] = useState<"public" | "friends">("public");
  const [location, setLocation] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const navigate = useNavigate();

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
        description: `Maximum ${MAX_FILES} files allowed. Only adding first ${remainingSlots}.`,
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
    if (files) {
      handleFilesAdd(files);
    }
    // Reset input for re-selecting same files
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesAdd(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeMedia = (id: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption && mediaItems.length === 0) return;

    if (caption.length > 5000) {
      toast({
        title: "Caption too long",
        description: "Caption must be less than 5000 characters",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // For single file, use the existing method
      // For multiple files, we pass the array
      const files = mediaItems.map((item) => item.file);
      
      createPost.mutate(
        { 
          caption, 
          files: files.length > 0 ? files : undefined, 
          isReel 
        },
        {
          onSuccess: () => {
            setCaption("");
            setMediaItems([]);
            setUploadProgress(100);
            navigate(isReel ? "/reels" : "/");
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

  const acceptedTypes = isReel ? "video/*" : "image/*,video/*";

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-card">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit}>
          {/* Media Upload Area */}
          <div className="p-6 pb-0">
            <AnimatePresence mode="wait">
              {mediaItems.length > 0 ? (
                <motion.div
                  key="media-grid"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  {/* Media Grid */}
                  <Reorder.Group
                    axis="x"
                    values={mediaItems}
                    onReorder={setMediaItems}
                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin"
                  >
                    {mediaItems.map((item) => (
                      <Reorder.Item
                        key={item.id}
                        value={item}
                        className="relative shrink-0 cursor-grab active:cursor-grabbing"
                      >
                        <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-muted group">
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
                          
                          {/* Overlay with actions */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <GripVertical className="h-5 w-5 text-white" />
                          </div>
                          
                          {/* Remove button */}
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeMedia(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          
                          {/* Type indicator */}
                          <div className="absolute bottom-1 left-1 bg-background/80 backdrop-blur-sm rounded-full p-1">
                            {item.type === "video" ? (
                              <Video className="h-3 w-3" />
                            ) : (
                              <Image className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </Reorder.Item>
                    ))}
                    
                    {/* Add more button */}
                    {mediaItems.length < MAX_FILES && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="shrink-0 w-32 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Plus className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Add more</span>
                      </motion.button>
                    )}
                  </Reorder.Group>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    {mediaItems.length}/{MAX_FILES} files • Drag to reorder
                  </p>
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
                        or click to browse • Up to {MAX_FILES} files
                      </p>
                    </div>
                    <Button type="button" variant="outline" className="rounded-full">
                      Select from device
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <Input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              onChange={handleInputChange}
              className="hidden"
              multiple={!isReel}
            />
          </div>

          {/* Upload Progress */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 pt-4"
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

          {/* Caption */}
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder={isReel ? "Describe your reel..." : "What's on your mind?"}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-28 resize-none rounded-xl border-border/50 focus:border-primary bg-muted/30"
              />
              <p className={cn(
                "text-xs text-right",
                caption.length > 4500 ? "text-amber-500" : "text-muted-foreground",
                caption.length > 5000 && "text-destructive"
              )}>
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
              disabled={(!caption && mediaItems.length === 0) || createPost.isPending || isUploading}
            >
              {createPost.isPending || isUploading ? (
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