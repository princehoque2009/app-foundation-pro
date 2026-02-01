import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Settings, 
  UserCircle, 
  Share2, 
  Edit3,
  Camera 
} from "lucide-react";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { UserRolesDisplay } from "./UserRolesDisplay";
import { CoverPhotoUploader } from "./CoverPhotoUploader";
import { AvatarUploader } from "./AvatarUploader";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface ProfileHeaderProps {
  profile: any;
  userId: string;
  isOwner: boolean;
  postsCount: number;
  onEditClick?: () => void;
  isLoading?: boolean;
}

export const ProfileHeader = ({
  profile,
  userId,
  isOwner,
  postsCount,
  onEditClick,
  isLoading,
}: ProfileHeaderProps) => {
  const navigate = useNavigate();
  const [isAvatarUploaderOpen, setIsAvatarUploaderOpen] = useState(false);

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
        {/* Banner Skeleton */}
        <div className="h-36 sm:h-48 w-full shimmer" />
        
        {/* Profile Info Skeleton */}
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
        {/* Hero Layer - Cover Photo with Overlay */}
        <div className="relative h-36 sm:h-48 overflow-hidden">
          <CoverPhotoUploader
            userId={userId}
            currentCoverUrl={profile?.cover_photo_url}
            isOwner={isOwner}
          />
          {/* Gradient overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Identity Layer - Avatar + Name */}
        <div className="px-4 sm:px-6">
          <div className="flex items-end gap-4 -mt-12 sm:-mt-16 relative z-10">
            {/* Avatar with story ring effect */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative group"
            >
              <div className={cn(
                "p-[3px] rounded-full bg-card shadow-lg",
                "ring-4 ring-background"
              )}>
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-background">
                  <AvatarImage 
                    src={profile?.avatar_url || ""} 
                    alt={profile?.display_name || profile?.username}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <UserCircle className="h-12 w-12 sm:h-14 sm:w-14" />
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Edit avatar button for owner */}
              {isOwner && (
                <button
                  onClick={() => setIsAvatarUploaderOpen(true)}
                  className={cn(
                    "absolute bottom-0 right-0 p-2 rounded-full",
                    "bg-primary text-primary-foreground shadow-lg",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:bg-primary/90 active:scale-95"
                  )}
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>

            {/* Action Layer - Buttons (Right aligned on same row) */}
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
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="gap-1.5 rounded-full border-border"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate("/settings")}
                    className="rounded-full border-border h-8 w-8"
                  >
                    <Settings className="h-4 w-4" />
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
            {/* Name + Verified + Roles */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                {profile?.display_name || profile?.username}
              </h1>
              {profile?.is_verified && <VerifiedBadge size="lg" />}
              <UserRolesDisplay userId={userId} size="sm" />
            </div>
            
            {/* Handle */}
            <p className="text-sm text-muted-foreground font-medium">
              @{profile?.username}
            </p>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm text-foreground leading-relaxed pt-2 max-w-xl">
                {profile.bio}
              </p>
            )}
          </motion.div>

          {/* Metrics Row */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="flex gap-5 mt-4 pb-4"
          >
            <button 
              className="group text-left"
              onClick={() => {/* Navigate to posts */}}
            >
              <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {postsCount}
              </span>
              <span className="text-sm text-muted-foreground ml-1.5">posts</span>
            </button>
            <button 
              className="group text-left"
              onClick={() => {/* Navigate to followers */}}
            >
              <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {profile?.followers_count || 0}
              </span>
              <span className="text-sm text-muted-foreground ml-1.5">followers</span>
            </button>
            <button 
              className="group text-left"
              onClick={() => {/* Navigate to following */}}
            >
              <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {profile?.following_count || 0}
              </span>
              <span className="text-sm text-muted-foreground ml-1.5">following</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Avatar Uploader Dialog */}
      <AvatarUploader
        currentAvatar={profile?.avatar_url}
        open={isAvatarUploaderOpen}
        onOpenChange={setIsAvatarUploaderOpen}
      />
    </>
  );
};
