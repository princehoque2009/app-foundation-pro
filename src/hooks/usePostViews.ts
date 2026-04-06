import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useRecordPostView = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user?.id) return;
      await supabase
        .from("post_views" as any)
        .upsert(
          { post_id: postId, user_id: user.id } as any,
          { onConflict: "post_id,user_id" } as any
        );
    },
  });
};

export const usePostViewCount = (postId: string) => {
  return useQuery({
    queryKey: ["post-view-count", postId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("post_views" as any)
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!postId,
  });
};
