import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PanelStatsGrid, PanelStatItem } from "./PanelStatsGrid";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, subDays } from "date-fns";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Play,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Heart,
  Loader2,
  Flag,
  Pin,
} from "lucide-react";

interface Post {
  id: string;
  caption?: string;
  media_url?: string;
  media_type?: string;
  is_reel?: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
    display_name?: string;
  };
}

export const PostsMediaPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteReason, setDeleteReason] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch posts
  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ["admin-posts", typeFilter, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select("*")
        .limit(100);

      if (typeFilter === "image") {
        query = query.eq("media_type", "image");
      } else if (typeFilter === "video") {
        query = query.eq("media_type", "video").eq("is_reel", false);
      } else if (typeFilter === "reel") {
        query = query.eq("is_reel", true);
      } else if (typeFilter === "text") {
        query = query.is("media_url", null);
      }

      if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "popular") {
        query = query.order("likes_count", { ascending: false });
      } else if (sortBy === "comments") {
        query = query.order("comments_count", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set(data?.map((p) => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, display_name")
        .in("id", userIds);

      return data?.map((post) => ({
        ...post,
        user: profiles?.find((p) => p.id === post.user_id),
      })) as Post[];
    },
    refetchInterval: 30000,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin-posts-stats"],
    queryFn: async () => {
      const weekAgo = subDays(new Date(), 7);
      const [total, images, videos, reels, weekPosts] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("media_type", "image"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("media_type", "video").eq("is_reel", false),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_reel", true),
        supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
      ]);

      return {
        total: total.count || 0,
        images: images.count || 0,
        videos: videos.count || 0,
        reels: reels.count || 0,
        weekPosts: weekPosts.count || 0,
      };
    },
  });

  // Delete post
  const deleteMutation = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;

      // Log action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "post_deleted",
        target_id: postId,
        target_type: "post",
        details: { reason },
      });

      // Notify user
      if (selectedPost?.user_id) {
        await supabase.from("notifications").insert({
          user_id: selectedPost.user_id,
          title: "Post Removed",
          message: reason || "Your post was removed for violating community guidelines.",
          type: "system_warning",
          from_user_id: user?.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-posts-stats"] });
      setShowDeleteDialog(false);
      setSelectedPost(null);
      setDeleteReason("");
      toast({ title: "Post deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredPosts = posts?.filter((p) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.caption?.toLowerCase().includes(query) ||
        p.user?.username?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const statsItems: PanelStatItem[] = [
    {
      label: "Total Posts",
      value: stats?.total || 0,
      icon: FileText,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Images",
      value: stats?.images || 0,
      icon: ImageIcon,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Videos",
      value: stats?.videos || 0,
      icon: Video,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Reels",
      value: stats?.reels || 0,
      icon: Play,
      iconColor: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      label: "This Week",
      value: `+${stats?.weekPosts || 0}`,
      icon: TrendingUp,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  const getMediaIcon = (post: Post) => {
    if (post.is_reel) return <Play className="h-4 w-4" />;
    if (post.media_type === "video") return <Video className="h-4 w-4" />;
    if (post.media_type === "image") return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <PanelStatsGrid stats={statsItems} columns={5} />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full lg:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="reel">Reels</SelectItem>
              <SelectItem value="text">Text Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most Liked</SelectItem>
              <SelectItem value="comments">Most Comments</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Posts Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="aspect-square bg-muted animate-pulse" />
          ))
        ) : filteredPosts?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No posts found
          </div>
        ) : (
          filteredPosts?.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedPost(post)}
            >
              <Card className="aspect-square overflow-hidden cursor-pointer group relative">
                {post.media_url ? (
                  post.media_type === "video" || post.is_reel ? (
                    <video
                      src={post.media_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={post.media_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted p-4">
                    <p className="text-sm text-muted-foreground line-clamp-4 text-center">
                      {post.caption || "No content"}
                    </p>
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-4 text-white">
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {post.comments_count}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={post.user?.avatar_url} />
                      <AvatarFallback>{post.user?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-white">@{post.user?.username}</span>
                  </div>
                </div>

                {/* Type Badge */}
                <Badge className="absolute top-2 left-2 gap-1" variant="secondary">
                  {getMediaIcon(post)}
                </Badge>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Post Detail Dialog */}
      <Dialog open={!!selectedPost && !showDeleteDialog} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl">
          {selectedPost && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedPost.user?.avatar_url} />
                    <AvatarFallback>{selectedPost.user?.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selectedPost.user?.display_name || selectedPost.user?.username}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      @{selectedPost.user?.username} · {formatDistanceToNow(new Date(selectedPost.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              {/* Media */}
              {selectedPost.media_url && (
                <div className="rounded-lg overflow-hidden bg-muted aspect-video">
                  {selectedPost.media_type === "video" || selectedPost.is_reel ? (
                    <video
                      src={selectedPost.media_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={selectedPost.media_url}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}

              {/* Caption */}
              {selectedPost.caption && (
                <p className="text-sm">{selectedPost.caption}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="gap-1">
                  <Heart className="h-3 w-3" />
                  {selectedPost.likes_count} likes
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {selectedPost.comments_count} comments
                </Badge>
                <Badge variant="outline" className="gap-1">
                  {getMediaIcon(selectedPost)}
                  {selectedPost.is_reel ? "Reel" : selectedPost.media_type || "Text"}
                </Badge>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => window.open(`/post/${selectedPost.id}`, "_blank")}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Post
                </Button>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The post will be permanently deleted and the user will be notified.
            </p>
            <div>
              <label className="text-sm font-medium">Reason for deletion</label>
              <Textarea
                className="mt-1"
                placeholder="Violation of community guidelines..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPost) {
                  deleteMutation.mutate({ postId: selectedPost.id, reason: deleteReason });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
