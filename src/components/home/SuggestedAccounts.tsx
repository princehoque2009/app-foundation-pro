import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { UserRoleBadges } from "@/components/ui/RoleBadge";
import { toast } from "@/hooks/use-toast";
import { UserCircle, UserPlus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SuggestedAccount {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  roles?: string[];
}

export const SuggestedAccounts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["suggested-accounts", user?.id],
    queryFn: async () => {
      // Get existing friends
      const { data: existingFriends } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user?.id);

      const friendIds = existingFriends?.map(f => f.friend_id) || [];

      // Get pending requests
      const { data: pendingRequests } = await supabase
        .from("friend_requests")
        .select("to_user_id, from_user_id")
        .or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`);

      const requestUserIds = [
        ...(pendingRequests?.map(r => r.to_user_id) || []),
        ...(pendingRequests?.map(r => r.from_user_id) || []),
      ];

      const excludedIds = [...friendIds, ...requestUserIds, user?.id].filter(Boolean);

      // Fetch suggestions
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .not("id", "in", `(${excludedIds.join(",")})`)
        .eq("account_type", "public")
        .limit(15);

      if (error) throw error;

      // Get roles
      const userIds = data.map(p => p.id);
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map<string, string[]>();
      rolesData?.forEach(r => {
        const existing = roleMap.get(r.user_id) || [];
        roleMap.set(r.user_id, [...existing, r.role]);
      });

      return data.map(p => ({
        ...p,
        roles: roleMap.get(p.id) || [],
      })) as SuggestedAccount[];
    },
    enabled: !!user?.id,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (toUserId: string) => {
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          from_user_id: user?.id,
          to_user_id: toUserId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests-sent"] });
      toast({ title: "Friend request sent!" });
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    },
  });

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const filteredSuggestions = suggestions?.filter(s => !dismissedIds.has(s.id)) || [];

  if (isLoading || !filteredSuggestions.length) {
    return null;
  }

  return (
    <div className="relative bg-card border-b border-border py-4">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="text-sm font-semibold text-foreground">Suggested for you</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => handleScroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => handleScroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 px-4 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <AnimatePresence mode="popLayout">
          {filteredSuggestions.map((account) => (
            <motion.div
              key={account.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className="shrink-0"
            >
              <Card className="relative w-36 p-3 border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                {/* Dismiss button */}
                <button
                  onClick={() => handleDismiss(account.id)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-background/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>

                {/* Avatar */}
                <div
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => navigate(`/profile/${account.id}`)}
                >
                  <Avatar className="h-16 w-16 mb-2 ring-2 ring-background shadow-md">
                    <AvatarImage src={account.avatar_url || ""} />
                    <AvatarFallback>
                      <UserCircle className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-sm font-semibold truncate max-w-[100px]">
                      {account.display_name || account.username}
                    </span>
                    {account.is_verified && <VerifiedBadge size="sm" />}
                  </div>

                  <span className="text-xs text-muted-foreground truncate max-w-[100px] mb-1">
                    @{account.username}
                  </span>

                  {account.roles && account.roles.length > 0 && (
                    <div className="mb-2">
                      <UserRoleBadges roles={account.roles as any} size="sm" />
                    </div>
                  )}
                </div>

                {/* Follow Button */}
                <Button
                  size="sm"
                  className="w-full rounded-full text-xs h-8"
                  onClick={() => sendRequestMutation.mutate(account.id)}
                  disabled={sendRequestMutation.isPending}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Follow
                </Button>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
