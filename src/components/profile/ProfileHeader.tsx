import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, Share2, Edit3, BarChart3, Info } from "lucide-react";
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
  const [isFollowersDialogOpen, setIsFollowersDialogOpen] = useState(false);
  const [followersDialogTab, setFollowersDialogTab] = useState<"followers" | "following">("followers");
  const { effects } = useActiveEffects(userId);
  const theme = profile?.profile_theme || 'default';
  const isVerifiedTheme = profile?.is_verified && theme !== 'default';

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
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast({ title: "Profile link copied!" });
    }
  };

  if (isLoading) {
    return (
      <div className="relative">
        <div className="h-[180px] sm:h-[220px] md:h-[260px] lg:h-[300px] w-full shimmer lg:rounded-[24px] lg:max-w-[1024px] lg:mx-auto" />
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
      <div className={cn("relative pb-4", isVerifiedTheme && `profile-theme-${theme}`, theme === 'yellow' && "bg-gradient-to-b from-amber-50/50 to-yellow-50/30 dark:from-amber-950/10 dark:to-yellow-950/10", theme === 'mono' && "bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-black")}>
        {/* Cover — FIXED: smaller banner on desktop + verified theme */}
        <div className={cn("profile-banner relative w-full overflow-hidden bg-muted h-[180px] sm:h-[220px] md:h-[260px] lg:h-[300px] xl:h-[320px] lg:rounded-[24px] lg:max-w-[1024px] lg:mx-auto lg:border lg:shadow-sm", theme === 'yellow' ? "lg:border-amber-300/50 border-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_8px_24px_-8px_rgba(251,191,36,0.3)] lg:shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_8px_24px_-8px_rgba(251,191,36,0.3)]" : "lg:border-border/50", theme === 'mono' && "grayscale contrast-[1.05]")}>
          {isOwner ? (
            <CoverPhotoUploader userId={userId} currentCoverUrl={profile?.cover_photo_url} isOwner />
          ) : profile?.cover_photo_url ? (
            <img src={optimizeCloudinaryUrl(profile.cover_photo_url, "c_fill,ar_3:1,g_auto,w_1200")} alt={`${profile?.display_name || profile?.username || "User"} cover`} className={cn("w-full h-full object-cover pointer-events-none select-none", theme === 'mono' && "grayscale")} draggable={false} onContextMenu={(e) => e.preventDefault()} />
          ) : (
            <div className={cn("absolute inset-0", theme === 'yellow' ? "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/20" : theme === 'mono' ? "bg-gradient-to-br from-zinc-100 via-zinc-50 to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-black" : "bg-gradient-to-br from-muted via-background to-muted")} />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-background lg:to-background/80" />
          {isVerifiedTheme && theme === 'yellow' && <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-black text-[10px] font-bold shadow-md">★ VERIFIED THEME</div>}
          {isVerifiedTheme && theme === 'mono' && <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold shadow-md">MONO • VERIFIED</div>}
        </div>

        <div className="px-4 sm:px-6 max-w-2xl mx-auto">
          <div className="relative flex items-center justify-between -mt-12 sm:-mt-14">
            <button className="flex-1 text-center pt-14" onClick={() => openFollowersDialog("followers")}>
              <div className="text-lg font-semibold text-foreground tabular-nums">{profile?.followers_count || 0}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </button>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} className="relative z-10">
              <div className={cn("profile-avatar-ring rounded-full bg-background p-1 shadow-md", effects.hasNeonFrame && "ring-2 ring-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.5)]", effects.hasPremiumFrame && !effects.hasNeonFrame && "ring-2 ring-amber-500", effects.hasSpotlight && "shadow-[0_0_30px_rgba(249,115,22,0.6)]", theme === 'yellow' && "ring-2 ring-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.3),0_0_24px_rgba(251,191,36,0.4)]", theme === 'mono' && "ring-2 ring-white dark:ring-black shadow-[0_0_0_4px_black,0_4px_16px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_4px_white,0_4px_16px_rgba(255,255,255,0.15)]")} onClick={isOwner ? onEditClick : undefined} role={isOwner ? "button" : undefined} tabIndex={isOwner ? 0 : undefined}>
                <Avatar className={cn("h-24 w-24 sm:h-28 sm:w-28", isOwner && "cursor-pointer")}>
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.display_name || profile?.username} className={cn("object-cover pointer-events-none select-none", theme === 'mono' && "grayscale")} draggable={false} onContextMenu={(e: React.MouseEvent) => e.preventDefault()} />
                  <AvatarFallback className="bg-muted text-muted-foreground"><UserCircle className="h-12 w-12 sm:h-14 sm:w-14" /></AvatarFallback>
                </Avatar>
              </div>
            </motion.div>

            <button className="flex-1 text-center pt-14" onClick={() => openFollowersDialog("following")}>
              <div className="text-lg font-semibold text-foreground tabular-nums">{profile?.following_count || 0}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </button>
          </div>

          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }} className="mt-3 text-center">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1 className={cn("profile-name text-xl sm:text-2xl font-semibold tracking-tight", effects.hasRainbowName ? "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-gradient-x" : theme === 'yellow' ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 bg-clip-text text-transparent" : "text-foreground")}>{profile?.display_name || profile?.username}</h1>
              {profile?.is_verified && <VerifiedBadge size="lg" />}
              <UserRolesDisplay userId={userId} size="sm" />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">@{profile?.username}</div>
            {profile?.bio && <p className="text-sm text-foreground/85 leading-relaxed pt-3 max-w-md mx-auto whitespace-pre-wrap">{profile.bio}</p>}
            {profile?.social_links && Object.keys(profile.social_links).length > 0 && <div className="pt-3 flex justify-center"><SocialLinksInline links={profile.social_links} /></div>}
            {profile?.country && <div className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">{profile.country}</div>}
            <div className="mt-4 text-xs text-muted-foreground"><span className="font-semibold text-foreground tabular-nums">{postsCount}</span> Posts</div>
          </motion.div>

          {isOwner && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={onEditClick} className="gap-1.5 rounded-full h-9 px-4 text-xs font-medium"><Edit3 className="h-3.5 w-3.5" />Edit</Button>
              <Button variant="ghost" size="icon" onClick={onAboutClick} className="rounded-full h-9 w-9 border border-border" title="About"><Info className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={onAnalyticsClick} className="rounded-full h-9 w-9 border border-border" title="Analytics"><BarChart3 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full h-9 w-9 border border-border" title="Share"><Share2 className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>

      <FollowersFollowingDialog open={isFollowersDialogOpen} onOpenChange={setIsFollowersDialogOpen} userId={userId} initialTab={followersDialogTab} followersCount={profile?.followers_count || 0} followingCount={profile?.following_count || 0} />
    </>
  );
};
