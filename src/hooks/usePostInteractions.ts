import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { pushPostActivity } from "@/lib/push";


export const useToggleLike = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isLiked: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
        void pushPostActivity(postId, user.id, "like");
      }
    },

    onMutate: async (isLiked) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousPosts = queryClient.getQueryData(["posts"]);
      
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old) return old;
        return old.map((post: any) =>
          post.id === postId
            ? {
                ...post,
                likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1,
              }
            : post
        );
      });

      return { previousPosts };
    },
    onError: (err, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(["posts"], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["likes", postId] });
    },
  });
};

export const usePostLikes = (postId: string) => {
  return useQuery({
    queryKey: ["likes", postId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isLiked: false };

      const { data, error } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return { isLiked: !!data };
    },
  });
};

// ============================================
// ARCHIVE POST FUNCTIONALITY
// ============================================

export const useToggleArchive = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isArchived: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Verify user owns the post
      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (postError) throw postError;
      if (post.user_id !== user.id) throw new Error("Only post owner can archive posts");

      // Toggle archive status
      const { error } = await supabase
        .from("posts")
        .update({ is_archived: !isArchived })
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) throw error;
      return { postId, newArchiveStatus: !isArchived };
    },

    onMutate: async (isArchived) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["archivedPosts"] });
      
      const previousPosts = queryClient.getQueryData(["posts"]);
      const previousArchivedPosts = queryClient.getQueryData(["archivedPosts"]);

      // Remove from active posts when archiving
      if (!isArchived) {
        queryClient.setQueryData(["posts"], (old: any) => {
          if (!old) return old;
          return old.filter((post: any) => post.id !== postId);
        });
      }

      // Remove from archived posts when unarchiving
      if (isArchived) {
        queryClient.setQueryData(["archivedPosts"], (old: any) => {
          if (!old) return old;
          return old.filter((post: any) => post.id !== postId);
        });
      }

      return { previousPosts, previousArchivedPosts };
    },

    onError: (err, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(["posts"], context.previousPosts);
      }
      if (context?.previousArchivedPosts) {
        queryClient.setQueryData(["archivedPosts"], context.previousArchivedPosts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["archivedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },

  });
};

export const useArchivedPosts = () => {
  return useQuery({
    queryKey: ["archivedPosts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch archived posts for current user only
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", true)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) return [];

      // Get unique user IDs from posts
      const userIds = [...new Set(postsData.map(p => p.user_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Create a map of profiles
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combine posts with profiles
      const postsWithProfiles = postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || {
          username: 'unknown',
          display_name: null,
          avatar_url: null,
          is_verified: false
        }
      }));

      return postsWithProfiles;
    },
  });
};

interface CreateCommentParams {
  postId: string;
  content: string;
  parentId?: string;
  mentionedUserId?: string;
}

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, content, parentId, mentionedUserId }: CreateCommentParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId || null,
          mentioned_user_id: mentionedUserId || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating comment:", error);
        throw error;
      }

      void pushPostActivity(postId, user.id, "comment", content.trim());

      return data;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      toast({
        title: variables.parentId ? "Reply added" : "Comment added",
        description: variables.parentId ? "Your reply has been posted." : "Your comment has been posted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content, postId }: { commentId: string; content: string; postId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("comments")
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      toast({
        title: "Comment updated",
        description: "Your comment has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update comment.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment.",
        variant: "destructive",
      });
    },
  });
};

export const usePinComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, commentId, isPinned }: { postId: string; commentId: string; isPinned: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Verify user owns the post
      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (postError) throw postError;
      if (post.user_id !== user.id) throw new Error("Only post owner can pin comments");

      // Update post with pinned comment
      const { error } = await supabase
        .from("posts")
        .update({
          pinned_comment_id: isPinned ? null : commentId,
        })
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) throw error;
      return { postId, commentId, isPinned };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
      toast({
        title: variables.isPinned ? "Comment unpinned" : "Comment pinned",
        description: variables.isPinned ? "Comment has been unpinned." : "Comment has been pinned to the top.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to pin comment.",
        variant: "destructive",
      });
    },
  });
};

export const usePostComments = (postId: string) => {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      // First get all comments for the post
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Get unique user IDs
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      
      if (userIds.length === 0) return [];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Create a map of profiles
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combine comments with profiles
      const commentsWithProfiles = commentsData?.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || { 
          username: 'unknown', 
          display_name: null, 
          avatar_url: null,
          is_verified: false
        }
      })) || [];

      return commentsWithProfiles;
    },
  });
};

// Hook for comment reactions
export const useToggleCommentReaction = (commentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hasReacted: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (hasReacted) {
        const { error } = await supabase
          .from("comment_reactions" as any)
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("comment_reactions" as any)
          .insert({ comment_id: commentId, user_id: user.id, reaction: 'like' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comment-reactions", commentId] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });
};

export const useCommentReactions = (commentId: string) => {
  return useQuery({
    queryKey: ["comment-reactions", commentId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("comment_reactions" as any)
        .select("*")
        .eq("comment_id", commentId);

      if (error) throw error;
      
      return {
        count: data?.length || 0,
        hasReacted: user ? data?.some((r: any) => r.user_id === user.id) : false
      };
    },
  });
};
