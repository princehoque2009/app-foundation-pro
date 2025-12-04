import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStories } from "@/hooks/useStories";
import { StoryUpload } from "./StoryUpload";
import { StoryViewer } from "./StoryViewer";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
      <div className="flex gap-3 overflow-x-auto pb-4 px-4 scrollbar-hide">
        {/* Your Story */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
          onClick={() => setUploadOpen(true)}
        >
          <div className="relative">
            <div className="p-[3px] rounded-full bg-gradient-to-br from-muted to-muted">
              <Avatar className="h-16 w-16 border-2 border-background">
                <AvatarImage src={user?.user_metadata?.avatar_url} alt="Your Story" />
                <AvatarFallback className="bg-muted">
                  <UserCircle className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 border-2 border-background shadow-lg">
              <Plus className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium max-w-[70px] truncate">
            Your Story
          </span>
        </motion.div>

        {/* Friends' Stories */}
        {!isLoading && storyGroups.map((group: any, index: number) => (
          <motion.div
            key={group.user.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
            onClick={() => setSelectedStory(group.stories[0])}
          >
            <div className="relative">
              <div className={cn(
                "p-[3px] rounded-full story-ring",
                "group-hover:scale-105 transition-transform"
              )}>
                <Avatar className="h-16 w-16 border-2 border-background">
                  <AvatarImage src={group.user.avatar_url || ""} alt={group.user.username} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {group.user.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium max-w-[70px] truncate group-hover:text-foreground transition-colors">
              {group.user.display_name || group.user.username}
            </span>
          </motion.div>
        ))}

        {/* Loading Skeleton */}
        {isLoading && [...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="h-16 w-16 rounded-full shimmer" />
            <div className="h-3 w-12 rounded shimmer" />
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
