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
        {/* Hero Layer - Cover Photo (owner can edit inline; instant refresh via React Query) */}
        <div className="relative h-36 sm:h-48 overflow-hidden mx-3 mt-2 rounded-xl">
          {isOwner ? (
            <CoverPhotoUploader
              userId={userId}
              currentCoverUrl={profile?.cover_photo_url}
              isOwner
            />
          ) : (
            <div className="relative h-36 sm:h-48 w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
              {profile?.cover_photo_url ? (
                <img
                  src={optimizeCloudinaryUrl(profile.cover_photo_url)}
                  alt="Cover"
                  className="w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />

              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />
              )}
            </div>
          )}
          {/* Gradient overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Identity Layer - Avatar + Name */}
        <div className="px-4 sm:px-6">
          <div className="flex items-end gap-4 -mt-12 sm:-mt-16 relative z-10">
            {/* Avatar (no editing, no fullscreen - tap opens Edit Profile for owner) */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div
                className={cn(
                  "p-[3px] rounded-full bg-card shadow-lg",
                  "ring-4 ring-background",
                  effects.hasNeonFrame && "ring-4 ring-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.5)]",
                  effects.hasPremiumFrame && !effects.hasNeonFrame && "ring-4 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
                  effects.hasSpotlight && "shadow-[0_0_30px_rgba(249,115,22,0.6)]"
                )}
                onClick={isOwner ? onEditClick : undefined}
                role={isOwner ? "button" : undefined}
                tabIndex={isOwner ? 0 : undefined}
              >
                <Avatar className={cn(
                  "h-24 w-24 sm:h-28 sm:w-28 border-2 border-background",
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

            {/* Action Layer - Buttons */}
            <div className="flex-1 flex justify-end items-center gap-2 pt-16 sm:pt-20">
              {isOwner ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEditClick}
                    className="gap-1.5 rounded-full border-border"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onAboutClick}
                    className="rounded-full h-8 w-8"
                    title="About"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onAnalyticsClick}
                    className="rounded-full h-8 w-8"
                    title="Analytics"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className="rounded-full h-8 w-8"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {/* Name, Handle, Bio */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="mt-3 space-y-1"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={cn(
                "text-xl sm:text-2xl font-bold leading-tight",
                effects.hasRainbowName
                  ? "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-gradient-x"
                  : "text-foreground"
              )}>
                {profile?.display_name || profile?.username}
              </h1>
              {profile?.is_verified && <VerifiedBadge size="lg" />}
              <UserRolesDisplay userId={userId} size="sm" />
            </div>
            
            <p className="text-sm text-muted-foreground font-medium">
              @{profile?.username}
            </p>

            {profile?.bio && (
              <p className="text-sm text-foreground leading-relaxed pt-2 max-w-xl whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            {profile?.social_links && Object.keys(profile.social_links).length > 0 && (
              <div className="pt-2">
                <SocialLinksInline links={profile.social_links} />
              </div>
            )}
          </motion.div>

          {/* Metrics Row */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="flex gap-5 mt-4 pb-4"
          >
            <button className="group text-left" onClick={() => {}}>
              <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {postsCount}
              </span>
              <span className="text-sm text-muted-foreground ml-1.5">posts</span>
            </button>
            {/* Hide follower/following counts for private accounts viewed by non-owners */}
            {(isOwner || profile?.account_type !== "private") ? (
              <>
                <button className="group text-left" onClick={() => openFollowersDialog("followers")}>
                  <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {profile?.followers_count || 0}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1.5">followers</span>
                </button>
                <button className="group text-left" onClick={() => openFollowersDialog("following")}>
                  <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {profile?.following_count || 0}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1.5">following</span>
                </button>
              </>
            ) : (
              <>
                <div className="text-left">
                  <span className="text-lg font-bold text-foreground">{profile?.followers_count || 0}</span>
                  <span className="text-sm text-muted-foreground ml-1.5">followers</span>
                </div>
                <div className="text-left">
                  <span className="text-lg font-bold text-foreground">{profile?.following_count || 0}</span>
                  <span className="text-sm text-muted-foreground ml-1.5">following</span>
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
