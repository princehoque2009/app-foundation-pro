import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStories } from "@/hooks/useStories";
import { StoryUpload } from "./StoryUpload";
import { StoryViewer } from "./StoryViewer";

export const Stories = () => {
  const { user } = useAuth();
  const { stories, isLoading } = useStories();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any>(null);

  // Group stories by user
  const groupedStories = stories.reduce((acc: any, story: any) => {
    const userId = story.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user: story.profiles,
        stories: [],
      };
    }
    acc[userId].stories.push(story);
    return acc;
  }, {});

  const storyGroups = Object.values(groupedStories);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 px-4 scrollbar-hide">
        {/* Your Story */}
        <div
          className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
          onClick={() => setUploadOpen(true)}
        >
          <div className="relative rounded-full p-0.5">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt="Your Story" />
              <AvatarFallback className="bg-gradient-to-br from-primary/50 to-primary">
                <UserCircle className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1">
              <Plus className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          <span className="text-xs text-muted-foreground max-w-[70px] truncate">
            Your Story
          </span>
        </div>

        {/* Friends' Stories */}
        {!isLoading && storyGroups.map((group: any) => (
          <div
            key={group.user.id}
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
            onClick={() => setSelectedStory(group.stories[0])}
          >
            <div className="relative ring-2 ring-primary rounded-full p-0.5">
              <Avatar className="h-16 w-16">
                <AvatarImage src={group.user.avatar_url || ""} alt={group.user.username} />
                <AvatarFallback className="bg-gradient-to-br from-primary/50 to-primary">
                  {group.user.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs text-muted-foreground max-w-[70px] truncate">
              {group.user.display_name || group.user.username}
            </span>
          </div>
        ))}
      </div>

      <StoryUpload open={uploadOpen} onOpenChange={setUploadOpen} />
      <StoryViewer
        story={selectedStory}
        open={!!selectedStory}
        onOpenChange={(open) => !open && setSelectedStory(null)}
      />
    </>
  );
};
