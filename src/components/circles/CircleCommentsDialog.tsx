import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface CircleCommentsDialogProps {
  postId: string;
  circleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CircleCommentsDialog = ({ postId, circleId, open, onOpenChange }: CircleCommentsDialogProps) => {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-mini", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url, display_name, username").eq("id", user?.id!).single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const { data: comments, isLoading } = useQuery({
    queryKey: ["circle-post-comments", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("circle_post_comments" as any)
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (!data || data.length === 0) return [];
      const userIds = [...new Set((data as any[]).map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, avatar_url, display_name, username")
        .in("id", userIds as string[]);
      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.id] = p; });
      return (data as any[]).map((c: any) => ({ ...c, profile: profileMap[c.user_id] || null }));
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      await supabase
        .from("circle_post_comments" as any)
        .insert({ post_id: postId, user_id: user.id, content: comment.trim() });
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["circle-post-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["circle-post-comments-count", postId] });
    } catch {}
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-center font-semibold text-sm">Comments</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 py-4 min-h-[200px]">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
          ) : !comments || comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">No comments yet</p>
              <p className="text-muted-foreground text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((c: any) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5"
                >
                  <Avatar
                    className="h-8 w-8 shrink-0 cursor-pointer"
                    onClick={() => navigate(`/profile/${c.user_id}`)}
                  >
                    <AvatarImage src={c.profile?.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {(c.profile?.username || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted/40 rounded-2xl px-3 py-2 inline-block max-w-full">
                      <button
                        onClick={() => navigate(`/profile/${c.user_id}`)}
                        className="text-xs font-semibold hover:underline"
                      >
                        {c.profile?.display_name || c.profile?.username || "User"}
                      </button>
                      <p className="text-sm break-words">{c.content}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={myProfile?.avatar_url || ""} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {(myProfile?.username || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1 rounded-full bg-muted/50 border-0 h-9 text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!comment.trim() || submitting}
            className="h-9 w-9 rounded-full shrink-0"
            style={{ background: "#FF5A5F" }}
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
