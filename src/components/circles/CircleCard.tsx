import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Lock, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface CircleCardProps {
  circle: any;
  userId?: string;
  onJoin: (circle: any) => void;
  onOpen: (circle: any) => void;
}

const formatCount = (n: number) => {
  if (n >= 10000) return (n / 1000).toFixed(0) + "K";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};

export const CircleCard = ({ circle, onJoin, onOpen }: CircleCardProps) => {
  const isMember = circle.is_member;
  const [bannerLoaded, setBannerLoaded] = useState(!circle.banner_url);
  const [logoLoaded, setLogoLoaded] = useState(!circle.logo_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl overflow-hidden border border-border/40 shadow-sm"
    >
      {/* Banner */}
      <div
        className="h-24 bg-gradient-to-br from-primary/15 to-accent/15 cursor-pointer relative overflow-hidden"
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
      </div>

      <div className="px-3 pb-3 -mt-6 relative">
        <div className="flex items-end justify-between">
          <Avatar className="h-12 w-12 border-[3px] border-background shadow-md cursor-pointer" onClick={() => onOpen(circle)}>
            {circle.logo_url && !logoLoaded && <Skeleton className="h-full w-full rounded-full" />}
            <AvatarImage src={circle.logo_url} onLoad={() => setLogoLoaded(true)} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {circle.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <Button
            size="sm"
            variant={isMember ? "outline" : "default"}
            className="rounded-full text-xs h-7 px-3"
            style={!isMember ? { background: "#FF5A5F", borderColor: "#FF5A5F" } : {}}
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
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{circle.description || "No description"}</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{formatCount(circle.members_count || 0)} members</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
