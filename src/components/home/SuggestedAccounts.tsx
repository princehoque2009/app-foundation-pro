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
      const { data: existingFriends } = await supabase.from("friendships").select("friend_id").eq("user_id", user?.id);
      const friendIds = existingFriends?.map(f => f.friend_id) || [];
      const { data: pendingRequests } = await supabase.from("friend_requests").select("to_user_id, from_user_id").or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`);
      const requestUserIds = [...(pendingRequests?.map(r => r.to_user_id) || []), ...(pendingRequests?.map(r => r.from_user_id) || [])];
      const excludedIds = [...friendIds, ...requestUserIds, user?.id].filter(Boolean);
      const { data, error } = await supabase.from("profiles").select("id, username, display_name, avatar_url, is_verified").not("id", "in", `(${excludedIds.join(",")})`).eq("account_type", "public").limit(15);
      if (error) throw error;
      const userIds = data.map(p => p.id);
      const { data: rolesData } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      const roleMap = new Map<string, string[]>();
      rolesData?.forEach(r => { const existing = roleMap.get(r.user_id) || []; roleMap.set(r.user_id, [...existing, r.role]); });
      return data.map(p => ({ ...p, roles: roleMap.get(p.id) || [] })) as SuggestedAccount[];
    },
    enabled: !!user?.id,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (toUserId: string) => {
      await supabase.from("friend_requests").delete().eq("from_user_id", user?.id).eq("to_user_id", toUserId);
      const { error } = await supabase.from("friend_requests").insert({ from_user_id: user?.id, to_user_id: toUserId, status: "accepted" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast({ title: "Following!" });
    },
    onError: () => { toast({ title: "Failed to follow", variant: "destructive" }); },
  });

  const handleDismiss = (id: string) => { setDismissedIds(prev => new Set([...prev, id])); };
  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) { scrollRef.current.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" }); }
  };
  const filteredSuggestions = suggestions?.filter(s => !dismissedIds.has(s.id)) || [];
  if (isLoading || !filteredSuggestions.length) { return null; }

  return (
    <div className="relative bg-card/60 backdrop-blur-sm border border-border/50 rounded-[24px] py-4 shadow-sm mx-1">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="text-[13.5px] font-semibold tracking-tight">Suggested for you</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted/80" onClick={() => handleScroll("left")}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted/80" onClick={() => handleScroll("right")}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-3 px-4 overflow-x-auto scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {filteredSuggestions.map((account) => (
            <motion.div key={account.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="shrink-0">
              <Card className="relative w-[132px] p-3 border-border/60 bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all rounded-[20px]">
                <button onClick={() => handleDismiss(account.id)} className="absolute top-2 right-2 p-1 rounded-full bg-muted/60"><X className="h-3 w-3" /></button>
                <div className="flex flex-col items-center cursor-pointer pt-1" onClick={() => navigate(`/profile/${account.id}`)}>
                  <Avatar className="h-[60px] w-[60px] mb-2.5 ring-2 ring-background shadow-sm"><AvatarImage src={account.avatar_url || ""} /><AvatarFallback><UserCircle className="h-7 w-7" /></AvatarFallback></Avatar>
                  <span className="text-[13px] font-semibold truncate">{account.display_name || account.username}</span>
                  <span className="text-[11px] text-muted-foreground mb-2">@{account.username}</span>
                </div>
                <Button size="sm" className="w-full rounded-full text-[12px] h-8" onClick={() => sendRequestMutation.mutate(account.id)}><UserPlus className="h-3.5 w-3.5 mr-1" />Follow</Button>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
