import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Lock, Settings } from "lucide-react";
import { CircleFeedPost } from "./CircleFeedPost";
import { CircleComposer } from "./CircleComposer";
import { CircleAdminDialog } from "./CircleAdminDialog";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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

export const InsideCirclePage = ({ circle: initialCircle, userId, onBack }: InsideCirclePageProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch live circle data so branding updates reflect immediately
  const { data: liveCircle } = useQuery({
    queryKey: ["circle-detail", initialCircle.id],
    queryFn: async () => {
      const { data } = await supabase.from("community_groups").select("*").eq("id", initialCircle.id).single();
      return data || initialCircle;
    },
    initialData: initialCircle
  });
  const circle = liveCircle || initialCircle;

  const isAdmin = circle.created_by === userId;
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const { data: members } = useQuery({
    queryKey: ["circle-members", circle.id],
    queryFn: async () => {
      const { data: memberRows } = await supabase.
      from("community_group_members").
      select("*").
      eq("group_id", circle.id);
      if (!memberRows || memberRows.length === 0) return [];
      const userIds = memberRows.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.
      from("profiles").
      select("id, avatar_url, display_name, username").
      in("id", userIds);
      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => {profileMap[p.id] = p;});
      return memberRows.map((m: any) => ({ ...m, profiles: profileMap[m.user_id] || null }));
    }
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["circle-posts", circle.id],
    queryFn: async () => {
      const { data } = (await supabase.
      from("community_group_posts").
      select("*").
      eq("group_id", circle.id).
      order("created_at", { ascending: false })) as any;
      return data || [];
    }
  });

  const posterIds = [...new Set((posts || []).map((p: any) => p.user_id))];
  const { data: posterProfiles } = useQuery({
    queryKey: ["circle-poster-profiles", circle.id, posterIds.join(",")],
    queryFn: async () => {
      if (posterIds.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, avatar_url, display_name, username").in("id", posterIds as string[]);
      const map: Record<string, any> = {};
      data?.forEach((p: any) => {map[p.id] = p;});
      return map;
    },
    enabled: posterIds.length > 0
  });

  const handleDeletePost = async (postId: string) => {
    await supabase.from("community_group_posts").delete().eq("id", postId);
    queryClient.invalidateQueries({ queryKey: ["circle-posts", circle.id] });
  };

  const isMember = members?.some((m: any) => m.user_id === userId);
  const memberCount = members?.length || circle.members_count || 0;
  const memberAvatars = (members || []).slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative rounded-md">
        {circle.banner_url ?
        <>
            {!bannerLoaded && <div className="h-44 bg-gradient-to-br from-primary/15 to-accent/15 animate-pulse" />}
            <img
            src={circle.banner_url}
            alt=""
            className={`w-full h-44 object-cover ${bannerLoaded ? "" : "hidden"}`}
            onLoad={() => setBannerLoaded(true)} />
          
          </> :

        <div className="h-44 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5" />
        }
        <button onClick={onBack} className="absolute top-3 left-3 p-2 rounded-full bg-black/30 text-white backdrop-blur-sm min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {isAdmin &&
        <button
          onClick={() => setShowAdmin(true)}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/30 text-white backdrop-blur-sm min-h-[44px] min-w-[44px] flex items-center justify-center">
          
            <Settings className="h-5 w-5" />
          </button>
        }
      </div>

      {/* Profile section */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="flex items-end gap-3">
          <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
            <AvatarImage src={circle.logo_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {circle.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="pb-1 flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5 truncate">
              {circle.name}
              {circle.privacy === "private" && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </h1>
            <p className="text-xs text-muted-foreground">{formatCount(memberCount)} members</p>
          </div>
        </div>

        {circle.description &&
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{circle.description}</p>
        }

        {/* Members preview row */}
        {memberAvatars.length > 0 &&
        <div className="flex items-center gap-2 mt-3">
            <div className="flex -space-x-2">
              {memberAvatars.map((m: any) =>
            <Avatar key={m.id} className="h-7 w-7 border-2 border-background cursor-pointer" onClick={() => navigate(`/profile/${m.user_id}`)}>
                  <AvatarImage src={m.profiles?.avatar_url} />
                  <AvatarFallback className="text-[9px] bg-muted">{m.profiles?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
            )}
            </div>
            {memberCount > 5 &&
          <span className="text-[11px] text-muted-foreground">+{memberCount - 5} members</span>
          }
          </div>
        }
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="mt-4">
        <TabsList className="w-full grid grid-cols-4 h-10 rounded-none bg-transparent border-b border-border/50 px-4 sticky top-0 z-20 bg-background">
          {["posts", "media", "members", "about"].map((tab) =>
          <TabsTrigger
            key={tab}
            value={tab}
            className="text-xs capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF5A5F] data-[state=active]:text-[#FF5A5F] data-[state=active]:shadow-none">
            
              {tab}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="posts" className="mt-0 px-4 space-y-3 pb-24 pt-3">
          {isMember && userId &&
          <CircleComposer
            circleId={circle.id}
            circleName={circle.name}
            userId={userId}
            onPostCreated={() => queryClient.invalidateQueries({ queryKey: ["circle-posts", circle.id] })} />

          }

          {postsLoading ?
          <div className="space-y-3">
              {[1, 2, 3].map((i) =>
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
            )}
            </div> :
          posts?.length === 0 ?
          <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No posts yet. Be the first to post!</p>
            </div> :

          posts?.map((post: any) =>
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}>
            
                <CircleFeedPost
              post={post}
              circle={circle}
              userId={userId}
              isAdmin={isAdmin}
              onDelete={handleDeletePost}
              posterProfile={posterProfiles?.[post.user_id]} />
            
              </motion.div>
          )
          }
        </TabsContent>

        <TabsContent value="media" className="mt-0 px-4 pb-24 pt-3">
          {posts?.filter((p: any) => p.media_url).length === 0 ?
          <p className="text-center text-sm text-muted-foreground py-12">No media yet</p> :

          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {posts?.filter((p: any) => p.media_url).map((p: any) =>
            <div key={p.id} className="aspect-square bg-muted">
                  <img src={p.media_url} className="w-full h-full object-cover" alt="" loading="lazy" />
                </div>
            )}
            </div>
          }
        </TabsContent>

        <TabsContent value="members" className="mt-0 px-4 space-y-1.5 pb-24 pt-3">
          <p className="text-xs text-muted-foreground mb-2">{formatCount(memberCount)} members</p>
          {members?.map((m: any) =>
          <div
            key={m.id}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
            onClick={() => navigate(`/profile/${m.user_id}`)}>
            
              <Avatar className="h-10 w-10">
                <AvatarImage src={m.profiles?.avatar_url} />
                <AvatarFallback className="text-xs">{m.profiles?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.profiles?.display_name || m.profiles?.username}</p>
                <p className="text-[11px] text-muted-foreground">@{m.profiles?.username}</p>
              </div>
              {m.role === "admin" && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
              {isAdmin && m.user_id !== userId &&
            <Button size="sm" variant="ghost" className="text-xs text-destructive h-7" onClick={async (e) => {
              e.stopPropagation();
              await supabase.from("community_group_members").delete().eq("id", m.id);
              queryClient.invalidateQueries({ queryKey: ["circle-members", circle.id] });
            }}>Remove</Button>
            }
            </div>
          )}
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

      {isAdmin &&
      <CircleAdminDialog circle={circle} open={showAdmin} onOpenChange={setShowAdmin} />
      }
    </div>);

};