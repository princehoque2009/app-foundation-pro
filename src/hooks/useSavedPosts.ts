import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useSavedPosts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedPosts = [], isLoading } = useQuery({
    queryKey: ["saved-posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_posts")
        .select(`
          id,
          post_id,
          created_at,
          posts:post_id (
            id,
            caption,
            media_url,
            media_type,
            likes_count,
            comments_count,
            created_at,
            profiles:user_id (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const savePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("saved_posts")
        .insert({ user_id: user?.id, post_id: postId });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Post already in your favourites");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      queryClient.invalidateQueries({ queryKey: ["is-post-saved"] });
      toast({
        title: "Saved!",
        description: "Post added to your favourites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Already saved",
        description: error.message || "This post is already in your favourites",
        variant: "default",
      });
    },
  });

  const unsavePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("saved_posts")
        .delete()
        .eq("user_id", user?.id)
        .eq("post_id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      queryClient.invalidateQueries({ queryKey: ["is-post-saved"] });
      toast({
        title: "Removed",
        description: "Post removed from favourites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { savedPosts, isLoading, savePost, unsavePost };
};

export const useIsPostSaved = (postId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-post-saved", postId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("user_id", user?.id)
        .eq("post_id", postId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!postId,
  });
};
