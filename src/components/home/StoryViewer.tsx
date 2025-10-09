import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, UserCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useStories } from "@/hooks/useStories";

interface StoryViewerProps {
  story: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StoryViewer = ({ story, open, onOpenChange }: StoryViewerProps) => {
  const { user } = useAuth();
  const { deleteStory } = useStories();

  const handleDelete = async () => {
    await deleteStory.mutateAsync(story.id);
    onOpenChange(false);
  };

  if (!story) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-black/95">
        <div className="relative h-[80vh]">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={story.profiles?.avatar_url || ""} />
                  <AvatarFallback>
                    <UserCircle className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {story.profiles?.display_name || story.profiles?.username}
                  </p>
                  <p className="text-white/70 text-xs">
                    {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Story Content */}
          <div className="w-full h-full flex items-center justify-center">
            {story.media_type === "image" ? (
              <img
                src={story.media_url}
                alt="Story"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={story.media_url}
                controls
                autoPlay
                className="max-w-full max-h-full"
              />
            )}
          </div>

          {/* Delete button for own stories */}
          {user?.id === story.user_id && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteStory.isPending}
              >
                Delete Story
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
