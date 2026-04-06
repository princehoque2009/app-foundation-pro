import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStories } from "@/hooks/useStories";
import { StoryViewer } from "./StoryViewer";
import { StoryAvatar } from "./StoryAvatar";
import { StoryComposer } from "@/components/stories/StoryComposer";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Stories = () => {
  const { user } = useAuth();
  const { storyGroups, isLoading, viewedStoryIds } = useStories();
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);

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

  const currentUserGroup = storyGroups.find(g => g.user.id === user?.id);
  const hasOwnStory = !!currentUserGroup && currentUserGroup.stories.length > 0;

  const handleStoryTap = (groupIndex: number) => {
    setViewerGroupIndex(groupIndex);
    setViewerOpen(true);
  };

  const handleOwnStoryTap = () => {
    if (hasOwnStory) {
      const idx = storyGroups.findIndex(g => g.user.id === user?.id);
      if (idx >= 0) handleStoryTap(idx);
    } else {
      setComposerOpen(true);
    }
  };

  return (
    <>
      {/* Stories row with gradient background */}
      <div className="relative py-3">
        <div className="flex gap-3.5 overflow-x-auto px-4 scrollbar-hide">
          {/* Your Story */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <StoryAvatar
              imageUrl={currentUserProfile?.avatar_url || user?.user_metadata?.avatar_url}
              name="Your Story"
              isAddStory={!hasOwnStory}
              hasActiveStory={hasOwnStory}
              hasUnviewedStory={false}
              onClick={handleOwnStoryTap}
            />
          </motion.div>

          {/* Other Users' Stories - unviewed first */}
          {!isLoading && storyGroups
            .filter(g => g.user.id !== user?.id)
            .map((group, index) => {
              const actualIndex = storyGroups.findIndex(g => g.user.id === group.user.id);
              return (
                <motion.div
                  key={group.user.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                >
                  <StoryAvatar
                    imageUrl={group.user.avatar_url || undefined}
                    name={group.user.display_name || group.user.username}
                    hasActiveStory
                    hasUnviewedStory={group.hasUnviewed}
                    onClick={() => handleStoryTap(actualIndex)}
                  />
                </motion.div>
              );
            })}

          {/* Loading Skeleton */}
          {isLoading && [...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 animate-pulse">
              <div className="h-[68px] w-[68px] rounded-full bg-muted" />
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>

      <StoryComposer open={composerOpen} onOpenChange={setComposerOpen} />

      {viewerOpen && storyGroups.length > 0 && (
        <StoryViewer
          storyGroups={storyGroups}
          initialGroupIndex={viewerGroupIndex}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
        />
      )}
    </>
  );
};
