import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PostMedia {
  id: string;
  media_url: string;
  media_type: string;
  display_order: number;
}

export interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  is_reel: boolean;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
  post_media?: PostMedia[];
}

export const usePosts = (isReel = false) => {
  return useQuery({
    queryKey: ["posts", isReel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            is_verified
          ),
          post_media (
            id,
            media_url,
            media_type,
            display_order
          )
        `)
        .eq("is_reel", isReel)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Sort post_media by display_order
      return (data as Post[]).map((post) => ({
        ...post,
        post_media: post.post_media?.sort((a, b) => a.display_order - b.display_order) || [],
      }));
    },
  });
};

export const useUserPosts = (userId: string) => {
  return useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            is_verified
          ),
          post_media (
            id,
            media_url,
            media_type,
            display_order
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data as Post[]).map((post) => ({
        ...post,
        post_media: post.post_media?.sort((a, b) => a.display_order - b.display_order) || [],
      }));
    },
    enabled: !!userId,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caption,
      files,
      isReel = false,
    }: {
      caption: string;
      files?: File[];
      isReel?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let media_url = null;
      let media_type = null;

      // For single file (legacy support) or first file
      if (files && files.length > 0) {
        const firstFile = files[0];
        const fileExt = firstFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(fileName, firstFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("post-media")
          .getPublicUrl(fileName);

        media_url = publicUrl;
        media_type = firstFile.type.startsWith("video/") ? "video" : "image";
      }

      // Create the post
      const { data: post, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          caption,
          media_url,
          media_type,
          is_reel: isReel,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload additional media files to post_media table
      if (files && files.length > 1) {
        const mediaInserts = await Promise.all(
          files.slice(1).map(async (file, index) => {
            const fileExt = file.name.split(".").pop();
            const fileName = `${user.id}/${Date.now()}-${index + 1}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from("post-media")
              .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from("post-media")
              .getPublicUrl(fileName);

            return {
              post_id: post.id,
              media_url: publicUrl,
              media_type: file.type.startsWith("video/") ? "video" : "image",
              display_order: index + 1,
            };
          })
        );

        // Also insert the first media into post_media for consistency
        const firstMediaInsert = {
          post_id: post.id,
          media_url: media_url!,
          media_type: media_type!,
          display_order: 0,
        };

        const { error: mediaError } = await supabase
          .from("post_media")
          .insert([firstMediaInsert, ...mediaInserts]);

        if (mediaError) {
          console.error("Error inserting post_media:", mediaError);
          // Don't throw - post was created successfully
        }
      } else if (files && files.length === 1) {
        // Single file - still insert into post_media for consistency
        const { error: mediaError } = await supabase
          .from("post_media")
          .insert({
            post_id: post.id,
            media_url: media_url!,
            media_type: media_type!,
            display_order: 0,
          });

        if (mediaError) {
          console.error("Error inserting post_media:", mediaError);
        }
      }

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({
        title: "Success",
        description: "Post created successfully!",
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
};