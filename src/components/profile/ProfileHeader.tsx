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
      <div className="relative pb-4">
        {/* Cover — edge-to-edge, no radius, faded bottom */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {isOwner ? (
            <CoverPhotoUploader
              userId={userId}
              currentCoverUrl={profile?.cover_photo_url}
              isOwner
            />
          ) : profile?.cover_photo_url ? (
            <img
              src={optimizeCloudinaryUrl(profile.cover_photo_url, "c_fill,ar_16:9,g_auto")}
              alt="Cover"
              className="w-full h-full object-cover pointer-events-none select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted" />
          )}
          {/* Faded bottom gradient blending into page background */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-background" />
        </div>



        {/* Identity block — centered, avatar overlaps cover */}
        <div className="px-4 sm:px-6 max-w-2xl mx-auto">
          {/* Counters row with centered avatar */}
          <div className="relative flex items-center justify-between -mt-12 sm:-mt-14">
            {/* Followers */}
            <button
              className="flex-1 text-center pt-14"
              onClick={() => openFollowersDialog("followers")}
            >
              <div className="text-lg font-semibold text-foreground tabular-nums">
                {profile?.followers_count || 0}
              </div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </button>


            {/* Avatar — centered, overlapping */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative z-10"
            >
              <div
                className={cn(
                  "rounded-full bg-background p-1 shadow-md",
                  effects.hasNeonFrame && "ring-2 ring-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.5)]",
                  effects.hasPremiumFrame && !effects.hasNeonFrame && "ring-2 ring-amber-500",
                  effects.hasSpotlight && "shadow-[0_0_30px_rgba(249,115,22,0.6)]"
                )}
                onClick={isOwner ? onEditClick : undefined}
                role={isOwner ? "button" : undefined}
                tabIndex={isOwner ? 0 : undefined}
              >
                <Avatar className={cn("h-24 w-24 sm:h-28 sm:w-28", isOwner && "cursor-pointer")}>
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

            {/* Following */}
            <button
              className="flex-1 text-center pt-14"
              onClick={() => openFollowersDialog("following")}
            >
              <div className="text-lg font-semibold text-foreground tabular-nums">
                {profile?.following_count || 0}
              </div>
              <div className="text-xs text-muted-foreground">Following</div>
            </button>

          </div>

          {/* Name + handle — centered */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="mt-3 text-center"
          >
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1
                className={cn(
                  "text-xl sm:text-2xl font-semibold tracking-tight",
                  effects.hasRainbowName
                    ? "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-gradient-x"
                    : "text-foreground"
                )}
              >
                {profile?.display_name || profile?.username}
              </h1>
              {profile?.is_verified && <VerifiedBadge size="lg" />}
              <UserRolesDisplay userId={userId} size="sm" />
            </div>

            <div className="mt-1 text-sm text-muted-foreground">
              @{profile?.username}
            </div>

            {profile?.bio && (
              <p className="text-sm text-foreground/85 leading-relaxed pt-3 max-w-md mx-auto whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            {profile?.social_links && Object.keys(profile.social_links).length > 0 && (
              <div className="pt-3 flex justify-center">
                <SocialLinksInline links={profile.social_links} />
              </div>
            )}

            {profile?.country && (
              <div className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                {profile.country}
              </div>
            )}

            {/* Posts count row */}
            <div className="mt-4 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{postsCount}</span> Posts
            </div>
          </motion.div>

          {/* Action buttons */}
          {isOwner && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onEditClick}
                className="gap-1.5 rounded-full h-9 px-4 text-xs font-medium"
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
            </div>
          )}
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
