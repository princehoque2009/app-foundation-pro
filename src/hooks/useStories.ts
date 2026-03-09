import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface StoryData {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  expires_at: string;
  views_count: number | null;
  visibility: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface StoryGroup {
  user: StoryData["profiles"];
  stories: StoryData[];
  hasUnviewed: boolean;
}

export const useStories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all active stories
  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as StoryData[];
    },
    enabled: !!user,
  });

  // Fetch which stories current user has viewed
  const { data: viewedStoryIds } = useQuery({
    queryKey: ["story-views", user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data, error } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", user.id);
      if (error) throw error;
      return new Set((data || []).map((v: any) => v.story_id));
    },
    enabled: !!user?.id,
  });

  // Group stories by user with viewed status
  const storyGroups: StoryGroup[] = (() => {
    if (!stories) return [];
    const grouped: Record<string, StoryGroup> = {};
    const viewed = viewedStoryIds || new Set<string>();

    for (const story of stories) {
      const uid = story.user_id;
      if (!grouped[uid]) {
        grouped[uid] = {
          user: story.profiles,
          stories: [],
          hasUnviewed: false,
        };
      }
      grouped[uid].stories.push(story);
      if (!viewed.has(story.id)) {
        grouped[uid].hasUnviewed = true;
      }
    }

    // Sort: current user first, then unviewed, then viewed
    const groups = Object.values(grouped);
    groups.sort((a, b) => {
      if (a.user.id === user?.id) return -1;
      if (b.user.id === user?.id) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });

    return groups;
  })();

  // Record a story view
  const recordView = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user?.id) return;
      // Upsert to avoid duplicates
      await supabase
        .from("story_views")
        .upsert(
          { story_id: storyId, viewer_id: user.id },
          { onConflict: "story_id,viewer_id" }
        );
      // Increment views_count
      await supabase.rpc("increment_story_views" as any, { p_story_id: storyId }).catch(() => {
        // Fallback: ignore if function doesn't exist
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story-views", user?.id] });
    },
  });

  // Upload story
  const uploadStory = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(fileName);
      const mediaType = file.type.startsWith("image/") ? "image" : "video";

      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: urlData.publicUrl,
          media_type: mediaType,
          visibility: "public",
        });
      if (insertError) throw insertError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({ title: "Story uploaded successfully!" });
    },
    onError: (error) => {
      toast({ title: "Failed to upload story", description: error.message, variant: "destructive" });
    },
  });

  // Delete story
  const deleteStory = useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await supabase.from("stories").delete().eq("id", storyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({ title: "Story deleted" });
    },
  });

  // Send reaction
  const sendReaction = useMutation({
    mutationFn: async ({ storyId, reaction }: { storyId: string; reaction: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("story_reactions")
        .upsert(
          { story_id: storyId, user_id: user.id, reaction },
          { onConflict: "story_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Reaction sent!" });
    },
  });

  // Fetch viewers for a story (owner only)
  const useStoryViewers = (storyId: string | null) => {
    return useQuery({
      queryKey: ["story-viewers", storyId],
      queryFn: async () => {
        if (!storyId) return [];
        const { data, error } = await supabase
          .from("story_views")
          .select("viewer_id, viewed_at")
          .eq("story_id", storyId)
          .order("viewed_at", { ascending: false });
        if (error) throw error;
        return data || [];
      },
      enabled: !!storyId,
    });
  };

  return {
    stories: stories || [],
    storyGroups,
    isLoading,
    viewedStoryIds: viewedStoryIds || new Set<string>(),
    uploadStory,
    deleteStory,
    recordView,
    sendReaction,
    useStoryViewers,
  };
};
