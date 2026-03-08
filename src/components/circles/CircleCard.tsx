import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, TrendingUp, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface CircleCardProps {
  circle: any;
  userId?: string;
  onJoin: (circle: any) => void;
  onOpen: (circle: any) => void;
  compact?: boolean;
}

const formatCount = (n: number) => {
  if (n >= 10000) return (n / 1000).toFixed(0) + "K";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};

export const CircleCard = ({ circle, onJoin, onOpen, compact }: CircleCardProps) => {
  const isMember = circle.is_member;
  const [bannerLoaded, setBannerLoaded] = useState(!circle.banner_url);
  const [logoLoaded, setLogoLoaded] = useState(!circle.logo_url);

  const isNew = circle.created_at && Date.now() - new Date(circle.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  const isTrending = (circle.members_count || 0) >= 10;
  const hasRecentActivity = (circle.recent_posts || 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl overflow-hidden border border-border/40 shadow-sm"
    >
      {/* Banner */}
      <div
        className={`${compact ? "h-20" : "h-24"} bg-gradient-to-br from-primary/15 to-accent/15 cursor-pointer relative overflow-hidden`}
        onClick={() => onOpen(circle)}
      >
        {circle.banner_url && (
          <>
            {!bannerLoaded && <Skeleton className="absolute inset-0" />}
            <img
              src={circle.banner_url}
              className={`w-full h-full object-cover ${bannerLoaded ? "" : "opacity-0"}`}
              alt=""
              loading="lazy"
              onLoad={() => setBannerLoaded(true)}
            />
          </>
        )}
        {/* Activity & status badges */}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          {isNew && (
            <Badge className="bg-emerald-500/90 text-white border-0 text-[9px] px-1.5 py-0 h-4">New</Badge>
          )}
          {isTrending && !isNew && (
            <Badge className="bg-amber-500/90 text-white border-0 text-[9px] px-1.5 py-0 h-4 gap-0.5">
              <TrendingUp className="h-2.5 w-2.5" /> Hot
            </Badge>
          )}
        </div>
      </div>

      <div className={`${compact ? "px-2 pb-2" : "px-3 pb-3"} -mt-6 relative`}>
        <div className="flex items-end justify-between">
          <Avatar className="h-12 w-12 border-[3px] border-card shadow-md cursor-pointer" onClick={() => onOpen(circle)}>
            {circle.logo_url && !logoLoaded && <Skeleton className="h-full w-full rounded-full" />}
            <AvatarImage src={circle.logo_url} onLoad={() => setLogoLoaded(true)} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {circle.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <Button
            size="sm"
            variant={isMember ? "outline" : "default"}
            className="rounded-full text-[10px] h-7 px-3"
            onClick={(e) => { e.stopPropagation(); onJoin(circle); }}
          >
            {isMember ? "Joined" : "Join"}
          </Button>
        </div>
        <div className="mt-1.5 cursor-pointer" onClick={() => onOpen(circle)}>
          <h3 className="font-bold text-sm text-foreground line-clamp-1 flex items-center gap-1">
            {circle.name}
            {circle.privacy === "private" && <Lock className="h-3 w-3 text-muted-foreground" />}
          </h3>
          {!compact && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{circle.description || "No description"}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {formatCount(circle.members_count || 0)}
            </span>
            {circle.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60">{circle.category}</span>
            )}
            {hasRecentActivity && (
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <Zap className="h-2.5 w-2.5" /> Active
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
