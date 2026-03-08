import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/home/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PostView = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(*)")
        .eq("id", postId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  // Fetch multi-media items
  const { data: mediaItems } = useQuery({
    queryKey: ["post-media", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_media")
        .select("*")
        .eq("post_id", postId!)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-screen-sm mx-auto p-4 space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  if (error || !post) {
    return (
      <MainLayout>
        <div className="max-w-screen-sm mx-auto p-4 text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">Post not found</h1>
          <p className="text-muted-foreground">This post may have been deleted or is unavailable.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Feed
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-screen-sm mx-auto p-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-3 -ml-2 gap-1.5 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <PostCard
          id={post.id}
          author={{
            name: post.profiles?.display_name || post.profiles?.username || "User",
            avatar: post.profiles?.avatar_url || "",
            username: post.profiles?.username || "user",
            isVerified: post.profiles?.is_verified || false,
            userId: post.user_id,
          }}
          content={post.caption || ""}
          image={post.media_type === "image" ? post.media_url || undefined : undefined}
          video={post.media_type === "video" ? post.media_url || undefined : undefined}
          mediaItems={mediaItems?.map(m => ({ id: m.id, media_url: m.media_url, media_type: m.media_type, display_order: m.display_order })) || undefined}
          likes={post.likes_count || 0}
          comments={post.comments_count || 0}
          timestamp={post.created_at}
        />
      </div>
    </MainLayout>
  );
};

export default PostView;
