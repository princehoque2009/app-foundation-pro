import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStories } from "@/hooks/useStories";
import { StoryUpload } from "./StoryUpload";
import { StoryViewer } from "./StoryViewer";
import { StoryAvatar } from "./StoryAvatar";
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
        >
          <StoryAvatar
            imageUrl={currentUserProfile?.avatar_url || user?.user_metadata?.avatar_url}
            name="Your Story"
            isAddStory
            hasActiveStory={false}
            onClick={() => setUploadOpen(true)}
          />
        </motion.div>

        {/* Friends' Stories */}
        {!isLoading && storyGroups.map((group: any, index: number) => (
          <motion.div
            key={group.user.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <StoryAvatar
              imageUrl={group.user.avatar_url}
              name={group.user.display_name || group.user.username}
              hasActiveStory
              hasUnviewedStory
              onClick={() => setSelectedStory(group.stories[0])}
            />
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
