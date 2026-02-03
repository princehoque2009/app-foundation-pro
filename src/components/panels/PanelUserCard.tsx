import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { formatDistanceToNow } from "date-fns";
import {
  Ban,
  MessageSquare,
  Eye,
  MoreVertical,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  is_suspended?: boolean;
  suspended_until?: string;
  created_at?: string;
}

interface PanelUserCardProps {
  user: UserProfile;
  subtitle?: string;
  status?: "active" | "suspended" | "pending" | "warning";
  showActions?: boolean;
  onView?: () => void;
  onMessage?: () => void;
  onSuspend?: () => void;
  onWarn?: () => void;
  onClick?: () => void;
  className?: string;
}

export const PanelUserCard = ({
  user,
  subtitle,
  status,
  showActions = true,
  onView,
  onMessage,
  onSuspend,
  onWarn,
  onClick,
  className,
}: PanelUserCardProps) => {
  const statusConfig = {
    active: { color: "bg-green-500", label: "Active" },
    suspended: { color: "bg-destructive", label: "Suspended" },
    pending: { color: "bg-yellow-500", label: "Pending" },
    warning: { color: "bg-amber-500", label: "Warned" },
  };

  return (
    <Card
      className={cn(
        "p-3 transition-all hover:bg-muted/30",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {status && (
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                  statusConfig[status].color
                )}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">
                {user.display_name || user.username}
              </span>
              {user.is_verified && <VerifiedBadge size="sm" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">@{user.username}</span>
              {subtitle && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{subtitle}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user.is_suspended && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <Ban className="h-3 w-3" />
              Suspended
            </Badge>
          )}

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                )}
                {onMessage && (
                  <DropdownMenuItem onClick={onMessage}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onWarn && (
                  <DropdownMenuItem onClick={onWarn}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Send Warning
                  </DropdownMenuItem>
                )}
                {onSuspend && (
                  <DropdownMenuItem
                    onClick={onSuspend}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    {user.is_suspended ? "Unsuspend" : "Suspend"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </Card>
  );
};
