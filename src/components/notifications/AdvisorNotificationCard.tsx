import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { 
  Lightbulb, 
  UserCircle, 
  ExternalLink,
  Check,
  X,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvisorNotificationCardProps {
  suggestion: {
    id: string;
    advisor_id: string;
    message: string;
    priority: string;
    context?: string;
    target_type?: string;
    target_id?: string;
    status: string;
    created_at: string;
    seen_at?: string;
    opened_at?: string;
    advisor?: {
      username: string;
      display_name?: string;
      avatar_url?: string;
      is_verified?: boolean;
    };
  };
  onMarkSeen?: () => void;
}

const priorityStyles = {
  low: { badge: "bg-muted text-muted-foreground", icon: "text-muted-foreground" },
  normal: { badge: "bg-primary/10 text-primary", icon: "text-primary" },
  high: { badge: "bg-amber-500/10 text-amber-500", icon: "text-amber-500" },
  critical: { badge: "bg-destructive/10 text-destructive", icon: "text-destructive" },
};

export const AdvisorNotificationCard = ({ suggestion, onMarkSeen }: AdvisorNotificationCardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const isUnread = !suggestion.seen_at;
  const priority = suggestion.priority as keyof typeof priorityStyles;
  const styles = priorityStyles[priority] || priorityStyles.normal;

  const markAsSeenMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from("advisor_suggestions")
        .update({ 
          status: "seen",
          seen_at: new Date().toISOString(),
        })
        .eq("id", suggestion.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advisor-notifications"] });
      onMarkSeen?.();
    },
  });

  const handleClick = () => {
    if (isUnread) {
      markAsSeenMutation.mutate();
    }
    
    // Navigate to the target if available
    if (suggestion.target_type === "post" && suggestion.target_id) {
      navigate(`/post/${suggestion.target_id}`);
    } else if (suggestion.target_type === "profile" && suggestion.target_id) {
      navigate(`/profile/${suggestion.target_id}`);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    supabase
      .from("advisor_suggestions")
      .update({ status: "dismissed" })
      .eq("id", suggestion.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["advisor-notifications"] });
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className={cn(
          "p-4 cursor-pointer transition-all hover:bg-muted/50",
          isUnread && "bg-amber-500/5 border-amber-500/20"
        )}
        onClick={handleClick}
      >
        <div className="flex gap-3">
          {/* Advisor Avatar */}
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={suggestion.advisor?.avatar_url || ""} />
              <AvatarFallback>
                <UserCircle className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-1 -right-1 p-1 rounded-full bg-background border-2 border-background",
              styles.icon
            )}>
              <Lightbulb className="h-3 w-3" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">
                {suggestion.advisor?.display_name || suggestion.advisor?.username || "Advisor"}
              </span>
              <Badge variant="outline" className={cn("text-[10px] px-1.5", styles.badge)}>
                <Star className="h-2.5 w-2.5 mr-0.5" />
                Advisor
              </Badge>
              {priority !== "normal" && (
                <Badge className={cn("text-[10px] px-1.5", styles.badge)}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {suggestion.message}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
              </span>
              
              <div className="flex items-center gap-1">
                {suggestion.target_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick();
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={handleDismiss}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Unread indicator */}
          {isUnread && (
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shrink-0 mt-2" />
          )}
        </div>
      </Card>
    </motion.div>
  );
};