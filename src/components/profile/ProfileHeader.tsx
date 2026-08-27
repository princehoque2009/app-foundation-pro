import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, Share2, Edit3, BarChart3, Info } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { UserRolesDisplay } from "./UserRolesDisplay";
import { FollowersFollowingDialog } from "./FollowersFollowingDialog";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
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
  const theme = (profile as any)?.profile_theme || 'default';
  const isVerifiedTheme = profile?.is_verified && theme !== 'default';

  const openFollowersDialog = (tab: "followers" | "following") => {
    setFollowersDialogTab(tab);
    setIsFollowersDialogOpen(true);
  };

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${userId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${profile?.username} on Prangon`, url: profileUrl });
      } catch {}
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
      <div className={cn("relative pb-4", isVerifiedTheme && `profile-theme-${theme}`)}>
        <div className={cn("profile-banner relative w-full overflow-hidden bg-muted h-[180px] sm:h-[220px] md:h-[260px] lg:h-[300px] xl:h-[320px] lg:rounded-[24px] lg:max-w-[1024px] lg:mx-auto lg:border lg:shadow-sm", theme === 'yellow' ? "lg:border-amber-300/50 border-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_8px_24px_-8px_rgba(251,191,36,0.3)]" : "lg:border-border/50")}>
          {isOwner ? (
            <CoverPhotoUploader userId={userId} currentCoverUrl={profile?.cover_photo_url} isOwner />
          ) : profile?.cover_photo_url ? (
            <img src={optimizeCloudinaryUrl(profile.cover_photo_url, "c_fill,ar_3:1,g_auto,w_1200")} alt="cover" className={cn("w-full h-full object-cover", theme === 'mono' && "grayscale")} />
          ) : (
            <div className={cn("absolute inset-0", theme === 'yellow' ? "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/20" : theme === 'mono' ? "bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-300 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-900" : "bg-gradient-to-br from-muted via-background to-muted")} />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-background/60 lg:to-background/40" />
        </div>

        <div className="px-4 sm:px-6 max-w-2xl mx-auto">
          <div className="relative flex items-center justify-between -mt-12 sm:-mt-14">
            <button className="flex-1 text-center pt-14" onClick={() => openFollowersDialog("followers")}>
              <div className="text-lg font-semibold tabular-nums">{profile?.followers_count ?? 0}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </button>

            <div className="relative z-10">
              <div className={cn("profile-avatar-ring rounded-full bg-background p-1 shadow-md", theme === 'yellow' && "ring-2 ring-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.3),0_0_24px_rgba(251,191,36,0.4)]", theme === 'mono' && "ring-2 ring-zinc-300 dark:ring-zinc-600 shadow-[0_0_0_3px_white,0_0_0_6px_black,0_0_20px_rgba(0,0,0,0.15),0_0_40px_rgba(255,255,255,0.2)] dark:shadow-[0_0_0_3px_black,0_0_0_6px_white,0_0_20px_rgba(255,255,255,0.15)]")} onClick={isOwner ? onEditClick : undefined}>
                <Avatar className={cn("h-24 w-24 sm:h-28 sm:w-28", isOwner && "cursor-pointer")}>
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.display_name || profile?.username} className={cn("object-cover", theme === 'mono' && "grayscale")} />
                  <AvatarFallback className="bg-muted"><UserCircle className="h-12 w-12" /></AvatarFallback>
                </Avatar>
              </div>
            </div>

            <button className="flex-1 text-center pt-14" onClick={() => openFollowersDialog("following")}>
              <div className="text-lg font-semibold tabular-nums">{profile?.following_count ?? 0}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </button>
          </div>

          <div className="mt-3 text-center">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1 className={cn("profile-name text-xl sm:text-2xl font-semibold tracking-tight", theme === 'yellow' ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 bg-clip-text text-transparent" : theme === 'mono' ? "bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-300 dark:from-zinc-200 dark:via-white dark:to-zinc-400 bg-clip-text text-transparent" : "text-foreground")}>{profile?.display_name || profile?.username}</h1>
              {profile?.is_verified && <VerifiedBadge size="lg" />}
              <UserRolesDisplay userId={userId} size="sm" />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">@{profile?.username}</div>
            {profile?.bio && <p className="text-sm text-foreground/85 leading-relaxed pt-3 max-w-md mx-auto whitespace-pre-wrap">{profile.bio}</p>}
            {profile?.social_links && typeof profile.social_links === 'object' && Object.keys(profile.social_links as any).length > 0 && <div className="pt-3 flex justify-center"><SocialLinksInline links={profile.social_links} /></div>}
            {profile?.country && <div className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">{profile.country}</div>}
            <div className="mt-4 text-xs text-muted-foreground"><span className="font-semibold text-foreground tabular-nums">{postsCount}</span> Posts</div>
          </div>

          {isOwner && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={onEditClick} className="gap-1.5 rounded-full h-9 px-4 text-xs font-medium"><Edit3 className="h-3.5 w-3.5" />Edit</Button>
              <Button variant="ghost" size="icon" onClick={onAboutClick} className="rounded-full h-9 w-9 border" title="About"><Info className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={onAnalyticsClick} className="rounded-full h-9 w-9 border" title="Analytics"><BarChart3 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full h-9 w-9 border" title="Share"><Share2 className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>

      <FollowersFollowingDialog open={isFollowersDialogOpen} onOpenChange={setIsFollowersDialogOpen} userId={userId} initialTab={followersDialogTab} followersCount={profile?.followers_count ?? 0} followingCount={profile?.following_count ?? 0} />
    </>
  );
};
