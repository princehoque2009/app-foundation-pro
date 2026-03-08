import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Lock, Settings, Globe, Users, Search, Pin, TrendingUp, Clock, Heart, MessageCircle, Filter } from "lucide-react";
import { CircleOptionsMenu } from "./CircleOptionsMenu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CircleFeedPost } from "./CircleFeedPost";
import { CircleComposer } from "./CircleComposer";
import { CircleAdminDialog } from "./CircleAdminDialog";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface InsideCirclePageProps {
  circle: any;
  userId?: string;
  onBack: () => void;
}

const formatCount = (n: number) => {
  if (n >= 10000) return (n / 1000).toFixed(0) + "K";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};

type SortMode = "newest" | "trending" | "most_liked" | "most_commented";

export const InsideCirclePage = ({ circle: initialCircle, userId, onBack }: InsideCirclePageProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: liveCircle } = useQuery({
    queryKey: ["circle-detail", initialCircle.id],
    queryFn: async () => {
      const { data } = await supabase.from("community_groups").select("*").eq("id", initialCircle.id).single();
      return data || initialCircle;
    },
    initialData: initialCircle,
  });
  const circle = liveCircle || initialCircle;

  const isAdmin = circle.created_by === userId;
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const { data: members } = useQuery({
    queryKey: ["circle-members", circle.id],
    queryFn: async () => {
      const { data: memberRows } = await supabase
        .from("community_group_members")
        .select("*")
        .eq("group_id", circle.id);
      if (!memberRows || memberRows.length === 0) return [];
      const userIds = memberRows.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, avatar_url, display_name, username, is_verified")
        .in("id", userIds);
      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.id] = p; });
      return memberRows.map((m: any) => ({ ...m, profiles: profileMap[m.user_id] || null }));
    },
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["circle-posts", circle.id],
    queryFn: async () => {
      const { data } = (await supabase
        .from("community_group_posts")
        .select("*")
        .eq("group_id", circle.id)
        .order("created_at", { ascending: false })) as any;
      return data || [];
    },
  });

  const posterIds = [...new Set((posts || []).map((p: any) => p.user_id))];
  const { data: posterProfiles } = useQuery({
    queryKey: ["circle-poster-profiles", circle.id, posterIds.join(",")],
    queryFn: async () => {
      if (posterIds.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, avatar_url, display_name, username").in("id", posterIds as string[]);
      const map: Record<string, any> = {};
      data?.forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: posterIds.length > 0,
  });

  // Sort and filter posts
  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    const pinned = posts.filter((p: any) => p.is_pinned);
    const unpinned = posts.filter((p: any) => !p.is_pinned);

    let sorted = [...unpinned];
    switch (sortMode) {
      case "most_liked":
        sorted.sort((a: any, b: any) => (b.likes_count || 0) - (a.likes_count || 0));
        break;
      case "most_commented":
        sorted.sort((a: any, b: any) => (b.comments_count || 0) - (a.comments_count || 0));
        break;
      case "trending":
        sorted.sort((a: any, b: any) => {
          const scoreA = (a.likes_count || 0) + (a.comments_count || 0) * 2;
          const scoreB = (b.likes_count || 0) + (b.comments_count || 0) * 2;
          return scoreB - scoreA;
        });
        break;
      default: // newest
        sorted.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return [...pinned, ...sorted];
  }, [posts, sortMode]);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter((m: any) =>
      m.profiles?.display_name?.toLowerCase().includes(q) ||
      m.profiles?.username?.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const handleDeletePost = async (postId: string) => {
    await supabase.from("community_group_posts").delete().eq("id", postId);
    queryClient.invalidateQueries({ queryKey: ["circle-posts", circle.id] });
  };

  const handleTogglePin = async (postId: string, currentlyPinned: boolean) => {
    await supabase.from("community_group_posts").update({ is_pinned: !currentlyPinned }).eq("id", postId);
    queryClient.invalidateQueries({ queryKey: ["circle-posts", circle.id] });
    toast({ title: currentlyPinned ? "Unpinned" : "Pinned!" });
  };

  const isMember = members?.some((m: any) => m.user_id === userId);
  const memberCount = members?.length || circle.members_count || 0;
  const memberAvatars = (members || []).slice(0, 5);

  // Media posts for gallery
  const mediaPosts = useMemo(() => posts?.filter((p: any) => p.media_url) || [], [posts]);

  return (
    <div className="min-h-screen bg-background">
      {/* Curved Banner */}
      <div className="relative">
        <div className="relative overflow-hidden" style={{ borderRadius: "0 0 28px 28px" }}>
          {circle.banner_url ? (
            <>
              {!bannerLoaded && <div className="h-48 bg-gradient-to-br from-primary/15 to-accent/15 animate-pulse" />}
              <img
                src={circle.banner_url}
                alt=""
                className={`w-full h-48 object-cover cursor-pointer ${bannerLoaded ? "" : "hidden"}`}
                loading="eager"
                onLoad={() => setBannerLoaded(true)}
                onClick={() => setViewingImage(circle.banner_url)}
              />
            </>
          ) : (
            <div className="h-48 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        {/* Back & Settings */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 p-2.5 rounded-full bg-black/40 text-white backdrop-blur-sm min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {/* Three-dots menu (for all users) */}
        <div className="absolute top-3 right-3 z-10">
          <CircleOptionsMenu
            circle={circle}
            userId={userId}
            isAdmin={isAdmin}
            isMember={!!isMember}
            onOpenAdmin={() => setShowAdmin(true)}
            onBack={onBack}
          />
        </div>
      </div>

      {/* Circle Info Card */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="bg-card rounded-2xl border border-border/40 shadow-lg p-4">
          <div className="flex items-start gap-3">
            <Avatar
              className="border-4 border-card shadow-md -mt-10 shrink-0 cursor-pointer"
              style={{ width: 72, height: 72 }}
              onClick={() => circle.logo_url && setViewingImage(circle.logo_url)}
            >
              <AvatarImage src={circle.logo_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {circle.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-lg font-bold text-foreground truncate leading-tight">
                {circle.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
                  {circle.privacy === "private" ? (
                    <><Lock className="h-2.5 w-2.5" /> Private</>
                  ) : (
                    <><Globe className="h-2.5 w-2.5" /> Public</>
                  )}
                </Badge>
                {circle.category && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">{circle.category}</Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {formatCount(memberCount)} members
                </span>
              </div>
            </div>
          </div>

          {circle.description && (
            <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{circle.description}</p>
          )}

          {/* Members preview row */}
          {memberAvatars.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-2">
                {memberAvatars.map((m: any) => (
                  <Avatar
                    key={m.id}
                    className="h-7 w-7 border-2 border-card cursor-pointer"
                    onClick={() => navigate(`/profile/${m.user_id}`)}
                  >
                    <AvatarImage src={m.profiles?.avatar_url} />
                    <AvatarFallback className="text-[9px] bg-muted">
                      {m.profiles?.username?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {memberCount > 5 && (
                <span className="text-[11px] text-muted-foreground">+{memberCount - 5} more</span>
              )}

              {!isMember && userId && (
                <Button
                  size="sm"
                  className="ml-auto rounded-full text-xs h-8 px-4"
                  onClick={async () => {
                    await supabase.from("community_group_members").insert({
                      group_id: circle.id,
                      user_id: userId,
                      role: "member",
                    });
                    queryClient.invalidateQueries({ queryKey: ["circle-members", circle.id] });
                    toast({ title: "Joined!" });
                  }}
                >
                  Join Circle
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="mt-4">
        <TabsList className="w-full grid grid-cols-4 h-11 rounded-none bg-transparent border-b border-border/50 px-4 sticky top-0 z-20 backdrop-blur-sm bg-background/95">
          {["posts", "media", "members", "about"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="text-xs capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none font-medium"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts" className="mt-0 px-4 space-y-3 pb-24 pt-3">
          {isMember && userId && (
            <CircleComposer
              circleId={circle.id}
              circleName={circle.name}
              userId={userId}
              onPostCreated={() => queryClient.invalidateQueries({ queryKey: ["circle-posts", circle.id] })}
            />
          )}

          {/* Sort controls */}
          {(posts?.length || 0) > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">{posts?.length} posts</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/60">
                    <Filter className="h-3 w-3" />
                    {sortMode === "newest" ? "Newest" : sortMode === "most_liked" ? "Most Liked" : sortMode === "most_commented" ? "Most Discussed" : "Trending"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setSortMode("newest")} className="text-xs gap-2">
                    <Clock className="h-3 w-3" /> Newest
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortMode("trending")} className="text-xs gap-2">
                    <TrendingUp className="h-3 w-3" /> Trending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortMode("most_liked")} className="text-xs gap-2">
                    <Heart className="h-3 w-3" /> Most Liked
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortMode("most_commented")} className="text-xs gap-2">
                    <MessageCircle className="h-3 w-3" /> Most Discussed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {postsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
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
          ) : sortedPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-foreground font-medium text-sm">No posts yet</p>
              <p className="text-muted-foreground text-xs mt-1">Be the first to post!</p>
            </div>
          ) : (
            sortedPosts.map((post: any) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {post.is_pinned && (
                  <div className="flex items-center gap-1 text-[10px] text-primary font-medium mb-1 pl-1">
                    <Pin className="h-3 w-3" /> Pinned Post
                  </div>
                )}
                <CircleFeedPost
                  post={post}
                  circle={circle}
                  userId={userId}
                  isAdmin={isAdmin}
                  onDelete={handleDeletePost}
                  posterProfile={posterProfiles?.[post.user_id]}
                  onPin={isAdmin ? () => handleTogglePin(post.id, !!post.is_pinned) : undefined}
                />
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="mt-0 px-4 pb-24 pt-3">
          {mediaPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🖼</span>
              </div>
              <p className="text-foreground font-medium text-sm">No media yet</p>
              <p className="text-muted-foreground text-xs mt-1">Photos and videos will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {mediaPosts.map((p: any) => (
                <div
                  key={p.id}
                  className="aspect-square bg-muted cursor-pointer overflow-hidden"
                  onClick={() => setViewingImage(p.media_url)}
                >
                  {p.media_type === "video" ? (
                    <video src={p.media_url} className="w-full h-full object-cover" preload="metadata" />
                  ) : (
                    <img src={p.media_url} className="w-full h-full object-cover" alt="" loading="lazy" />
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-0 px-4 space-y-2 pb-24 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-muted-foreground shrink-0">{formatCount(memberCount)} members</p>
            <Input
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="h-8 rounded-full bg-muted/60 border-0 text-xs flex-1"
            />
          </div>

          <AnimatePresence>
            {filteredMembers.map((m: any, i: number) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/profile/${m.user_id}`)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.profiles?.avatar_url} />
                  <AvatarFallback className="text-xs">{m.profiles?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.profiles?.display_name || m.profiles?.username}</p>
                  <p className="text-[11px] text-muted-foreground">
                    @{m.profiles?.username}
                    {m.joined_at && (
                      <span className="ml-1">· Joined {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}</span>
                    )}
                  </p>
                </div>
                {m.role === "admin" && <Badge variant="secondary" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">Admin</Badge>}
                {m.role === "moderator" && <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">Mod</Badge>}
                {isAdmin && m.user_id !== userId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive h-7"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await supabase.from("community_group_members").delete().eq("id", m.id);
                      queryClient.invalidateQueries({ queryKey: ["circle-members", circle.id] });
                    }}
                  >
                    Remove
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredMembers.length === 0 && memberSearch.trim() && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No members found</p>
            </div>
          )}
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="mt-0 px-4 pb-24 pt-3 space-y-3">
          <div className="bg-card rounded-xl p-4 border border-border/40 space-y-2">
            <p className="text-sm font-semibold">Description</p>
            <p className="text-sm text-muted-foreground">{circle.description || "No description"}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/40 space-y-1.5">
            <p className="text-sm"><strong>Category:</strong> {circle.category || "General"}</p>
            <p className="text-sm"><strong>Privacy:</strong> {circle.privacy}</p>
            <p className="text-sm"><strong>Created:</strong> {new Date(circle.created_at).toLocaleDateString()}</p>
            <p className="text-sm"><strong>Members:</strong> {formatCount(memberCount)}</p>
            <p className="text-sm"><strong>Posts:</strong> {posts?.length || 0}</p>
          </div>
        </TabsContent>
      </Tabs>

      {isAdmin && (
        <CircleAdminDialog circle={circle} open={showAdmin} onOpenChange={setShowAdmin} />
      )}

      <ImageViewer
        src={viewingImage || ""}
        open={!!viewingImage}
        onOpenChange={(open) => !open && setViewingImage(null)}
      />
    </div>
  );
};
