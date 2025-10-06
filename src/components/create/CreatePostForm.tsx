import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCreatePost } from "@/hooks/usePosts";
import { Loader2, Image, Video, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreatePostFormProps {
  isReel?: boolean;
}

export const CreatePostForm = ({ isReel = false }: CreatePostFormProps) => {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const createPost = useCreatePost();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption && !file) return;

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
  };

  const acceptedTypes = isReel ? "video/*" : "image/*,video/*";

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              placeholder={isReel ? "Describe your reel..." : "What's on your mind?"}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-24 mt-2"
            />
          </div>

          <div>
            <Label htmlFor="media">
              {isReel ? "Video" : "Photo or Video"}
            </Label>
            <div className="mt-2">
              {preview ? (
                <div className="relative">
                  {file?.type.startsWith("video/") ? (
                    <video src={preview} controls className="w-full rounded-lg max-h-96" />
                  ) : (
                    <img src={preview} alt="Preview" className="w-full rounded-lg max-h-96 object-cover" />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Label
                  htmlFor="media"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isReel ? (
                      <Video className="h-12 w-12 text-muted-foreground mb-3" />
                    ) : (
                      <Image className="h-12 w-12 text-muted-foreground mb-3" />
                    )}
                    <p className="text-sm text-muted-foreground">
                      Click to upload {isReel ? "video" : "media"}
                    </p>
                  </div>
                  <Input
                    id="media"
                    type="file"
                    accept={acceptedTypes}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </Label>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={(!caption && !file) || createPost.isPending}
          >
            {createPost.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Posting...
              </>
            ) : (
              `Post ${isReel ? "Reel" : ""}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
