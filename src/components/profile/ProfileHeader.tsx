import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserCircle, 
  Share2, 
  Edit3,
  BarChart3,
  Info,
} from "lucide-react";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { UserRolesDisplay } from "./UserRolesDisplay";
import { FollowersFollowingDialog } from "./FollowersFollowingDialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useActiveEffects } from "@/hooks/useActiveEffects";
import { CoverPhotoUploader } from "./CoverPhotoUploader";
import { SocialLinksInline } from "./SocialLinks";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";

interface ProfileHeaderProps {
  profile: any;
  userId: string;
  isOwner: boolean;
  postsCount: number;
  onEditClick?: () => void;
  onAnalyticsClick?: () => void;
  onAboutClick?: () => void;
  isLoading?: boolean;
}

export const ProfileHeader = ({
  profile,
  userId,
  isOwner,
  postsCount,
  onEditClick,
  onAnalyticsClick,
  onAboutClick,
  isLoading,
}: ProfileHeaderProps) => {
  const navigate = useNavigate();
  const [isFollowersDialogOpen, setIsFollowersDialogOpen] = useState(false);
  const [followersDialogTab, setFollowersDialogTab] = useState<"followers" | "following">("followers");
  const { effects } = useActiveEffects(userId);

  const openFollowersDialog = (tab: "followers" | "following") => {
    setFollowersDialogTab(tab);
    setIsFollowersDialogOpen(true);
  };

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${userId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${profile?.username} on Prangon`,
          text: `Check out @${profile?.username}'s profile on Prangon`,
          url: profileUrl,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast({ title: "Profile link copied!" });
    }
  };

  if (isLoading) {
    return (
      <div className="relative">
        <div className="h-36 sm:h-48 w-full shimmer" />
        <div className="px-4 sm:px-6 pb-4">
          <div className="flex items-end gap-4 -mt-12 sm:-mt-16">
            <Skeleton className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-background" />
            <div className="flex-1 pt-14 sm:pt-16 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        {/* Cover — full-bleed, thin outline */}
        <div className="relative h-40 sm:h-56 overflow-hidden border-b border-border">
          {isOwner ? (
            <CoverPhotoUploader
              userId={userId}
              currentCoverUrl={profile?.cover_photo_url}
              isOwner
            />
          ) : (
            <div className="relative h-full w-full overflow-hidden bg-muted">
              {profile?.cover_photo_url ? (
                <img
                  src={optimizeCloudinaryUrl(profile.cover_photo_url)}
                  alt="Cover"
                  className="w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted" />
              )}
            </div>
          )}
        </div>

        {/* Identity block */}
        <div className="px-4 sm:px-6 max-w-2xl mx-auto">
          <div className="flex items-end justify-between gap-3 -mt-14 sm:-mt-16 relative z-10">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div
                className={cn(
                  "rounded-full bg-background p-1 shadow-sm",
                  effects.hasNeonFrame && "ring-2 ring-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.5)]",
                  effects.hasPremiumFrame && !effects.hasNeonFrame && "ring-2 ring-amber-500",
                  effects.hasSpotlight && "shadow-[0_0_30px_rgba(249,115,22,0.6)]"
                )}
                onClick={isOwner ? onEditClick : undefined}
                role={isOwner ? "button" : undefined}
                tabIndex={isOwner ? 0 : undefined}
              >
                <Avatar className={cn(
                  "h-24 w-24 sm:h-28 sm:w-28",
                  isOwner && "cursor-pointer"
                )}>
                  <AvatarImage
                    src={profile?.avatar_url || ""}
                    alt={profile?.display_name || profile?.username}
                    className="object-cover pointer-events-none select-none"
                    draggable={false}
                    onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <UserCircle className="h-12 w-12 sm:h-14 sm:w-14" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </motion.div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 pt-16 sm:pt-20">
              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEditClick}
                    className="gap-1.5 rounded-full h-9 px-4 text-xs font-medium tracking-wide uppercase"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onAboutClick}
                    className="rounded-full h-9 w-9 border border-border"
                    title="About"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onAnalyticsClick}
                    className="rounded-full h-9 w-9 border border-border"
                    title="Analytics"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className="rounded-full h-9 w-9 border border-border"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Name + Handle chip */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="mt-4"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className={cn(
                  "text-3xl sm:text-4xl font-semibold leading-none tracking-tight",
                  "font-serif",
                  effects.hasRainbowName
                    ? "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-gradient-x"
                    : "text-foreground"
                )}
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {profile?.display_name || profile?.username}
              </h1>
              {profile?.is_verified && <VerifiedBadge size="lg" />}
              <UserRolesDisplay userId={userId} size="sm" />
            </div>

            {/* Handle pill */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[12px] font-mono text-foreground/70"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                @{profile?.username}
              </span>
              {profile?.country && (
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {profile.country}
                </span>
              )}
            </div>

            {profile?.bio && (
              <p className="text-[15px] text-foreground/85 leading-relaxed pt-4 max-w-xl whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            {profile?.social_links && Object.keys(profile.social_links).length > 0 && (
              <div className="pt-3">
                <SocialLinksInline links={profile.social_links} />
              </div>
            )}
          </motion.div>

          {/* Metrics — inline editorial row with hairline divider */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="flex items-center gap-6 mt-5 pt-4 pb-4 border-t border-border/60"
          >
            <button className="group text-left" onClick={() => {}}>
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Posts</div>
              <div className="text-xl font-semibold text-foreground tabular-nums group-hover:text-primary transition-colors">
                {postsCount}
              </div>
            </button>
            {(isOwner || profile?.account_type !== "private") ? (
              <>
                <div className="h-8 w-px bg-border" />
                <button className="group text-left" onClick={() => openFollowersDialog("followers")}>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Followers</div>
                  <div className="text-xl font-semibold text-foreground tabular-nums group-hover:text-primary transition-colors">
                    {profile?.followers_count || 0}
                  </div>
                </button>
                <div className="h-8 w-px bg-border" />
                <button className="group text-left" onClick={() => openFollowersDialog("following")}>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Following</div>
                  <div className="text-xl font-semibold text-foreground tabular-nums group-hover:text-primary transition-colors">
                    {profile?.following_count || 0}
                  </div>
                </button>
              </>
            ) : (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Followers</div>
                  <div className="text-xl font-semibold text-foreground tabular-nums">{profile?.followers_count || 0}</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Following</div>
                  <div className="text-xl font-semibold text-foreground tabular-nums">{profile?.following_count || 0}</div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>


      {/* Followers/Following Dialog */}
      <FollowersFollowingDialog
        open={isFollowersDialogOpen}
        onOpenChange={setIsFollowersDialogOpen}
        userId={userId}
        initialTab={followersDialogTab}
        followersCount={profile?.followers_count || 0}
        followingCount={profile?.following_count || 0}
      />
    </>
  );
};
