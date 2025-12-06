import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStories } from "@/hooks/useStories";
import { StoryUpload } from "./StoryUpload";
import { StoryViewer } from "./StoryViewer";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Stories = () => {
  const { user } = useAuth();
  const { stories, isLoading } = useStories();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any>(null);

  // Fetch current user's profile
  const { data: currentUserProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
          onClick={() => setUploadOpen(true)}
        >
          <div className="relative">
            <div className="p-[3px] rounded-full bg-gradient-to-br from-muted/80 to-muted">
              <Avatar className="h-[68px] w-[68px] border-[3px] border-background">
                <AvatarImage src={currentUserProfile?.avatar_url || user?.user_metadata?.avatar_url} alt="Your Story" />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <UserCircle className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 bg-primary rounded-full p-1 border-2 border-background shadow-lg">
              <Plus className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] text-foreground font-medium max-w-[72px] truncate text-center">
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
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
            onClick={() => setSelectedStory(group.stories[0])}
          >
            <div className="relative">
              <div className={cn(
                "p-[3px] rounded-full story-ring transition-transform duration-200",
                "group-hover:scale-105 group-active:scale-95"
              )}>
                <Avatar className="h-[68px] w-[68px] border-[3px] border-background">
                  <AvatarImage src={group.user.avatar_url || ""} alt={group.user.username} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {group.user.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              {/* Story count indicator */}
              {group.stories.length > 1 && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1 border-2 border-background">
                  {group.stories.length}
                </div>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium max-w-[72px] truncate text-center group-hover:text-foreground transition-colors">
              {group.user.display_name || group.user.username}
            </span>
          </motion.div>
        ))}

        {/* Loading Skeleton */}
        {isLoading && [...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="h-[74px] w-[74px] rounded-full shimmer" />
            <div className="h-3 w-14 rounded shimmer" />
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
