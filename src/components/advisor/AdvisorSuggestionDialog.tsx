import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Lightbulb, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvisorSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  targetId?: string;
  targetType?: "post" | "profile" | "content";
  context?: string;
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-muted-foreground" },
  { value: "normal", label: "Normal", color: "text-foreground" },
  { value: "high", label: "High", color: "text-amber-500" },
  { value: "critical", label: "Critical", color: "text-destructive" },
];

export const AdvisorSuggestionDialog = ({
  open,
  onOpenChange,
  targetUser,
  targetId,
  targetType = "profile",
  context,
}: AdvisorSuggestionDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");

  const sendSuggestionMutation = useMutation({
    mutationFn: async () => {
      // Insert advisor suggestion
      const { error: suggestionError } = await supabase
        .from("advisor_suggestions")
        .insert({
          advisor_id: user?.id,
          user_id: targetUser.id,
          target_id: targetId,
          target_type: targetType,
          message,
          priority,
          context,
        });

      if (suggestionError) throw suggestionError;

      // Also create a notification for immediate visibility
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: targetUser.id,
          from_user_id: user?.id,
          type: "advisor_suggestion",
          title: priority === "critical" ? "🚨 Critical Advisor Suggestion" : "💡 Advisor Suggestion",
          message,
          action_url: targetType === "post" ? `/post/${targetId}` : `/profile/${targetUser.id}`,
        });

      if (notificationError) throw notificationError;

      // Log the action
      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action_type: "advisor_suggestion_sent",
        target_id: targetUser.id,
        target_type: "user",
        details: { message, priority, target_type: targetType, target_id: targetId },
      });
    },
    onSuccess: () => {
      toast({
        title: "Suggestion Sent",
        description: `Your suggestion has been delivered to ${targetUser.display_name || targetUser.username}`,
      });
      queryClient.invalidateQueries({ queryKey: ["advisor-suggestions"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setMessage("");
    setPriority("normal");
  };

  const canSend = message.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Send Suggestion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target User */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <Avatar className="h-10 w-10">
              <AvatarImage src={targetUser.avatar_url || ""} />
              <AvatarFallback>
                <UserCircle className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {targetUser.display_name || targetUser.username}
              </p>
              <p className="text-xs text-muted-foreground">@{targetUser.username}</p>
            </div>
          </div>

          {/* Context */}
          {context && (
            <div className="p-3 rounded-xl bg-muted/50 text-sm text-muted-foreground">
              <p className="text-xs font-medium mb-1">Context</p>
              {context}
            </div>
          )}

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority Level</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={cn("font-medium", option.color)}>
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Your Suggestion</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your suggestion or guidance here..."
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters. Be constructive and helpful.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => sendSuggestionMutation.mutate()}
            disabled={!canSend || sendSuggestionMutation.isPending}
          >
            {sendSuggestionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Suggestion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};