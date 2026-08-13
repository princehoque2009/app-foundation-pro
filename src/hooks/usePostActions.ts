import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Verify user owns the post
      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (postError) throw postError;
      if (post.user_id !== user.id) throw new Error("Only post owner can delete posts");

      // Delete the post
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) throw error;
      return postId;
    },

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousPosts = queryClient.getQueryData(["posts"]);
      const previousArchivedPosts = queryClient.getQueryData(["archivedPosts"]);

      // Remove from active posts
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old) return old;
        return old.filter((post: any) => post.id !== postId);
      });

      // Remove from archived posts
      queryClient.setQueryData(["archivedPosts"], (old: any) => {
        if (!old) return old;
        return old.filter((post: any) => post.id !== postId);
      });

      return { previousPosts, previousArchivedPosts };
    },

    onError: (err, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(["posts"], context.previousPosts);
      }
      if (context?.previousArchivedPosts) {
        queryClient.setQueryData(["archivedPosts"], context.previousArchivedPosts);
      }
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["archivedPosts"] });
    },
  });
};
