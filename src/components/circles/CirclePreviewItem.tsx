import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Zap } from "lucide-react";

interface CirclePreviewItemProps {
  circle: any;
  onOpen: (circle: any) => void;
  variant?: "compact" | "list";
}

const formatCount = (n: number) => {
  if (n >= 10000) return (n / 1000).toFixed(0) + "K";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};

export const CirclePreviewItem = ({ circle, onOpen, variant = "list" }: CirclePreviewItemProps) => {
  const recentPosts = circle.recent_posts || 0;
  const hasActivity = recentPosts > 0;

  if (variant === "compact") {
    return (
      <button
        onClick={() => onOpen(circle)}
        className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 group"
      >
        <div className="relative">
          <Avatar className={`h-14 w-14 border-2 transition-all duration-200 group-hover:scale-105 ${hasActivity ? "border-primary" : "border-border/50"}`}>
            <AvatarImage src={circle.logo_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {circle.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {hasActivity && (
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center border-2 border-card">
              <Zap className="h-2 w-2 text-primary-foreground" />
            </div>
          )}
        </div>
        <p className="text-[10px] text-foreground font-medium text-center line-clamp-2 leading-tight w-full">
          {circle.name}
        </p>
      </button>
    );
  }

  return (
    <button
      onClick={() => onOpen(circle)}
      className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
    >
      <div className="relative">
        <Avatar className={`h-11 w-11 border ${hasActivity ? "border-primary" : "border-border/50"}`}>
          <AvatarImage src={circle.logo_url} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
            {circle.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {hasActivity && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center border-2 border-card">
            <Zap className="h-2 w-2 text-primary-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{circle.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatCount(circle.members_count || 0)} members
          {recentPosts > 0 && <span className="text-primary font-medium ml-1">· {recentPosts} new posts</span>}
        </p>
      </div>
      {circle.category && (
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground shrink-0">{circle.category}</span>
      )}
    </button>
  );
};
