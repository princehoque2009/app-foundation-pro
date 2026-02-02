import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { UserRoleBadges } from "@/components/ui/RoleBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Search, UserCircle, UserPlus, UserMinus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FollowersFollowingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  initialTab?: "followers" | "following";
  followersCount?: number;
  followingCount?: number;
}

const PAGE_SIZE = 20;

interface UserWithRole {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  account_type: string | null;
  roles?: string[];
}

export const FollowersFollowingDialog = ({
  open,
  onOpenChange,
  userId,
  initialTab = "followers",
  followersCount = 0,
  followingCount = 0,
}: FollowersFollowingDialogProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSearchQuery("");
  }, [activeTab, open]);

  // Fetch followers with infinite scroll
  const {
    data: followersData,
    fetchNextPage: fetchNextFollowers,
    hasNextPage: hasMoreFollowers,
    isFetchingNextPage: isFetchingMoreFollowers,
    isLoading: isLoadingFollowers,
  } = useInfiniteQuery({
    queryKey: ["followers", userId],
    queryFn: async ({ pageParam = 0 }) => {
      // Get users who have this user as a friend (followers)
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          user_id,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified,
            account_type
          )
        `)
        .eq("friend_id", userId)
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (error) throw error;

      // Get roles for each user
      const userIds = data.map((f: any) => f.user_id);
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map<string, string[]>();
      rolesData?.forEach((r: any) => {
        const existing = roleMap.get(r.user_id) || [];
        roleMap.set(r.user_id, [...existing, r.role]);
      });

      return data.map((f: any) => ({
        ...f.profiles,
        roles: roleMap.get(f.user_id) || [],
      })) as UserWithRole[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    enabled: open && activeTab === "followers",
  });

  // Fetch following with infinite scroll
  const {
    data: followingData,
    fetchNextPage: fetchNextFollowing,
    hasNextPage: hasMoreFollowing,
    isFetchingNextPage: isFetchingMoreFollowing,
    isLoading: isLoadingFollowing,
  } = useInfiniteQuery({
    queryKey: ["following", userId],
    queryFn: async ({ pageParam = 0 }) => {
      // Get users this user is following
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          friend_id,
          profiles:friend_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified,
            account_type
          )
        `)
        .eq("user_id", userId)
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (error) throw error;

      // Get roles for each user
      const userIds = data.map((f: any) => f.friend_id);
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map<string, string[]>();
      rolesData?.forEach((r: any) => {
        const existing = roleMap.get(r.user_id) || [];
        roleMap.set(r.user_id, [...existing, r.role]);
      });

      return data.map((f: any) => ({
        ...f.profiles,
        roles: roleMap.get(f.friend_id) || [],
      })) as UserWithRole[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    enabled: open && activeTab === "following",
  });

  // Current user's friendships for follow/unfollow state
  const { data: myFriendships } = useQuery({
    queryKey: ["my-friendships", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", currentUser?.id);
      if (error) throw error;
      return new Set(data.map(f => f.friend_id));
    },
    enabled: !!currentUser?.id && open,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          from_user_id: currentUser?.id,
          to_user_id: targetUserId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-friendships"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests-sent"] });
      toast({ title: "Friend request sent!" });
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("user_id", currentUser?.id)
        .eq("friend_id", targetUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-friendships"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      toast({ title: "Unfollowed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to unfollow", variant: "destructive" });
    },
  });

  // Flatten paginated data
  const followers = useMemo(() => 
    followersData?.pages.flat() || [], 
    [followersData]
  );

  const following = useMemo(() => 
    followingData?.pages.flat() || [], 
    [followingData]
  );

  // Filter by search
  const filteredUsers = useMemo(() => {
    const users = activeTab === "followers" ? followers : following;
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.username.toLowerCase().includes(query) ||
      (user.display_name?.toLowerCase().includes(query))
    );
  }, [activeTab, followers, following, searchQuery]);

  // Infinite scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    
    if (bottom) {
      if (activeTab === "followers" && hasMoreFollowers && !isFetchingMoreFollowers) {
        fetchNextFollowers();
      } else if (activeTab === "following" && hasMoreFollowing && !isFetchingMoreFollowing) {
        fetchNextFollowing();
      }
    }
  }, [activeTab, hasMoreFollowers, hasMoreFollowing, isFetchingMoreFollowers, isFetchingMoreFollowing, fetchNextFollowers, fetchNextFollowing]);

  const handleUserClick = (profileId: string) => {
    onOpenChange(false);
    navigate(`/profile/${profileId}`);
  };

  const isLoading = activeTab === "followers" ? isLoadingFollowers : isLoadingFollowing;
  const isFetchingMore = activeTab === "followers" ? isFetchingMoreFollowers : isFetchingMoreFollowing;

  // Highlight search matches
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-primary/20 text-primary font-medium">{part}</span>
      ) : (
        part
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-center font-semibold">
            Connections
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-4 py-2 border-b border-border">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "followers" | "following")}>
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="followers" className="gap-1.5">
                Followers
                <span className="text-xs text-muted-foreground">({followersCount})</span>
              </TabsTrigger>
              <TabsTrigger value="following" className="gap-1.5">
                Following
                <span className="text-xs text-muted-foreground">({followingCount})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
        </div>

        {/* User List */}
        <ScrollArea 
          className="flex-1 overflow-y-auto"
          onScrollCapture={handleScroll}
        >
          <div className="p-2">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  {searchQuery ? (
                    <>
                      <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
                    </>
                  ) : (
                    <>
                      <Lock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">
                        {activeTab === "followers" ? "No followers yet" : "Not following anyone yet"}
                      </p>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-1"
                >
                  {filteredUsers.map((user) => {
                    const isFollowing = myFriendships?.has(user.id);
                    const isCurrentUser = user.id === currentUser?.id;

                    return (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-colors",
                          "hover:bg-muted/50 cursor-pointer group"
                        )}
                        onClick={() => handleUserClick(user.id)}
                      >
                        <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback>
                            <UserCircle className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm truncate">
                              {highlightMatch(user.display_name || user.username, searchQuery)}
                            </span>
                            {user.is_verified && <VerifiedBadge size="sm" />}
                            {user.roles && user.roles.length > 0 && (
                              <UserRoleBadges roles={user.roles as any} size="sm" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            @{highlightMatch(user.username, searchQuery)}
                          </p>
                        </div>

                        {!isCurrentUser && (
                          <Button
                            variant={isFollowing ? "outline" : "default"}
                            size="sm"
                            className="rounded-full shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isFollowing) {
                                unfollowMutation.mutate(user.id);
                              } else {
                                followMutation.mutate(user.id);
                              }
                            }}
                            disabled={followMutation.isPending || unfollowMutation.isPending}
                          >
                            {isFollowing ? (
                              <>
                                <UserMinus className="h-3.5 w-3.5 mr-1" />
                                Unfollow
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3.5 w-3.5 mr-1" />
                                Follow
                              </>
                            )}
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Loading more indicator */}
                  {isFetchingMore && (
                    <div className="flex justify-center py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading more...</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
