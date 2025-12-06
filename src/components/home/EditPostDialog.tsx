import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Image as ImageIcon, X } from "lucide-react";

interface EditPostDialogProps {
  postId: string;
  currentCaption: string;
  currentMediaUrl?: string;
  currentMediaType?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPostDialog = ({
  postId,
  currentCaption,
  currentMediaUrl,
  currentMediaType,
  open,
  onOpenChange,
}: EditPostDialogProps) => {
  const [caption, setCaption] = useState(currentCaption);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({
          caption: caption.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });

      toast({
        title: "Post updated",
        description: "Your post has been updated successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating post:", error);
      toast({
        title: "Error",
        description: "Failed to update post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-center font-semibold">Edit Post</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Media Preview */}
          {currentMediaUrl && (
            <div className="relative rounded-xl overflow-hidden bg-muted">
              {currentMediaType === "video" ? (
                <video
                  src={currentMediaUrl}
                  controls
                  className="w-full max-h-64 object-cover"
                />
              ) : (
                <img
                  src={currentMediaUrl}
                  alt="Post media"
                  className="w-full max-h-64 object-cover"
                />
              )}
            </div>
          )}

          {/* Caption Input */}
          <div className="space-y-2">
            <Label htmlFor="caption" className="text-sm font-medium">
              Caption
            </Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="min-h-32 resize-none rounded-xl border-border/50 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground text-right">
              {caption.length}/5000
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
