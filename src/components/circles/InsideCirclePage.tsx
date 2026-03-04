import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Lock, Loader2, Plus, MoreVertical, Trash2, Pin, Settings, ImagePlus, Users, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CircleFeedPost } from "./CircleFeedPost";
import { motion } from "framer-motion";

interface InsideCirclePageProps {
  circle: any;
  userId?: string;
  onBack: () => void;
}

export const InsideCirclePage = ({ circle, userId, onBack }: InsideCirclePageProps) => {
  const queryClient = useQueryClient();
  const isAdmin = circle.created_by === userId;

  const { data: members } = useQuery({
    queryKey: ["circle-members", circle.id],
    queryFn: async () => {
      const { data } = await supabase.from("community_group_members").select("*, profiles:user_id(*)").eq("group_id", circle.id) as any;
      return data || [];
    },
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["circle-posts", circle.id],
    queryFn: async () => {
      const { data } = await supabase.from("community_group_posts").select("*").eq("group_id", circle.id).order("created_at", { ascending: false }) as any;
      return data || [];
    },
  });

  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const handlePost = async () => {
    if (!postText.trim()) return;
    setPosting(true);
    try {
      await supabase.from("community_group_posts").insert({ group_id: circle.id, user_id: userId!, caption: postText.trim() });
      queryClient.invalidateQueries({ queryKey: ["circle-posts", circle.id] });
      setPostText("");
      setShowComposer(false);
      toast({ title: "Posted!" });
    } catch { toast({ title: "Error posting", variant: "destructive" }); }
    setPosting(false);
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from("community_group_posts").delete().eq("id", postId);
    queryClient.invalidateQueries({ queryKey: ["circle-posts", circle.id] });
  };

  const isMember = members?.some((m: any) => m.user_id === userId);

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative">
        <div
          className="h-40 bg-gradient-to-br from-primary/15 to-accent/15 bg-cover bg-center"
          style={circle.banner_url ? { backgroundImage: `url(${circle.banner_url})` } : {}}
        />
        <button onClick={onBack} className="absolute top-3 left-3 p-2 rounded-full bg-black/30 text-white backdrop-blur-sm">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="absolute top-3 right-3 p-2 rounded-full bg-black/30 text-white backdrop-blur-sm">
                <Settings className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem><ImagePlus className="h-4 w-4 mr-2" /> Edit Banner</DropdownMenuItem>
              <DropdownMenuItem><ImagePlus className="h-4 w-4 mr-2" /> Change Logo</DropdownMenuItem>
              <DropdownMenuItem><Users className="h-4 w-4 mr-2" /> Manage Members</DropdownMenuItem>
              <DropdownMenuItem><Shield className="h-4 w-4 mr-2" /> Manage Circle</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Profile section */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="flex items-end gap-3">
          <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
            <AvatarImage src={circle.logo_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{circle.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="pb-1 flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5 truncate">
              {circle.name}
              {circle.privacy === "private" && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </h1>
            <p className="text-xs text-muted-foreground">{members?.length || 0} members</p>
          </div>
        </div>
        {circle.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{circle.description}</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="mt-4">
        <TabsList className="w-full grid grid-cols-4 h-10 rounded-none bg-transparent border-b border-border/50 px-4">
          <TabsTrigger value="posts" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF5A5F] data-[state=active]:text-[#FF5A5F] data-[state=active]:shadow-none">Posts</TabsTrigger>
          <TabsTrigger value="media" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF5A5F] data-[state=active]:text-[#FF5A5F] data-[state=active]:shadow-none">Media</TabsTrigger>
          <TabsTrigger value="members" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF5A5F] data-[state=active]:text-[#FF5A5F] data-[state=active]:shadow-none">Members</TabsTrigger>
          <TabsTrigger value="about" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF5A5F] data-[state=active]:text-[#FF5A5F] data-[state=active]:shadow-none">About</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0 px-4 space-y-3 pb-24 pt-3">
          {/* Composer toggle */}
          {isMember && !showComposer && (
            <button
              onClick={() => setShowComposer(true)}
              className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border/40 text-muted-foreground text-sm hover:bg-muted/40 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-xs">You</AvatarFallback>
              </Avatar>
              <span>What's on your mind?</span>
            </button>
          )}
          {showComposer && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl p-3 border border-border/40 space-y-2"
            >
              <Textarea placeholder="Share something with this circle..." value={postText} onChange={(e) => setPostText(e.target.value)} rows={3} className="resize-none border-0 bg-transparent focus-visible:ring-0 p-0 text-sm" />
              <div className="flex justify-between items-center">
                <Button size="sm" variant="ghost" onClick={() => setShowComposer(false)} className="text-xs">Cancel</Button>
                <Button size="sm" onClick={handlePost} disabled={posting || !postText.trim()} className="rounded-full text-xs h-8 px-4" style={{ background: "#FF5A5F" }}>
                  {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post"}
                </Button>
              </div>
            </motion.div>
          )}

          {postsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-2xl p-4 border border-border/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : posts?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No posts yet. Be the first to post!</p>
            </div>
          ) : (
            posts?.map((post: any) => (
              <CircleFeedPost
                key={post.id}
                post={post}
                circle={circle}
                userId={userId}
                isAdmin={isAdmin}
                onDelete={handleDeletePost}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="media" className="mt-0 px-4 pb-24 pt-3">
          <p className="text-center text-sm text-muted-foreground py-12">Media content coming soon</p>
        </TabsContent>

        <TabsContent value="members" className="mt-0 px-4 space-y-1.5 pb-24 pt-3">
          {members?.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarImage src={m.profiles?.avatar_url} />
                <AvatarFallback className="text-xs">{m.profiles?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.profiles?.display_name || m.profiles?.username}</p>
                <p className="text-[11px] text-muted-foreground">@{m.profiles?.username}</p>
              </div>
              {m.role === "admin" && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
              {isAdmin && m.user_id !== userId && (
                <Button size="sm" variant="ghost" className="text-xs text-destructive h-7" onClick={async () => {
                  await supabase.from("community_group_members").delete().eq("id", m.id);
                  queryClient.invalidateQueries({ queryKey: ["circle-members", circle.id] });
                }}>Remove</Button>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="about" className="mt-0 px-4 pb-24 pt-3 space-y-3">
          <div className="bg-card rounded-xl p-4 border border-border/40 space-y-2">
            <p className="text-sm font-semibold">Description</p>
            <p className="text-sm text-muted-foreground">{circle.description || "No description"}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/40 space-y-1.5">
            <p className="text-sm"><strong>Category:</strong> {circle.category || "General"}</p>
            <p className="text-sm"><strong>Privacy:</strong> {circle.privacy}</p>
            <p className="text-sm"><strong>Created:</strong> {new Date(circle.created_at).toLocaleDateString()}</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Circle-specific FAB for posting */}
      {isMember && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowComposer(true)}
          className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
          style={{ background: "#FF5A5F" }}
        >
          <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
        </motion.button>
      )}
    </div>
  );
};
