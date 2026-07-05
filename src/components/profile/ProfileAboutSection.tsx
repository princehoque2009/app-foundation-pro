import { MapPin, Calendar, User, Link2, Mail, Shield, Heart, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { getCountryName, getCountryFlag } from "@/lib/countries";
import { SocialLinksDisplay, type SocialLinksMap } from "./SocialLinks";

interface ProfileAboutSectionProps {
  bio?: string | null;
  dateOfBirth?: string | null;
  createdAt?: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  country?: string | null;
  isVerified?: boolean;
  accountType?: string | null;
  displayName?: string | null;
  username?: string;
  socialLinks?: SocialLinksMap | null;
}

export const ProfileAboutSection = ({
  bio,
  dateOfBirth,
  createdAt,
  postsCount = 0,
  followersCount = 0,
  followingCount = 0,
  country,
  isVerified = false,
  accountType = "public",
  displayName,
  username,
  socialLinks,
}: ProfileAboutSectionProps) => {
  // Calculate account age
  const accountAge = createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: false }) : null;
  
  // Calculate user's age if date of birth is provided
  const userAge = dateOfBirth ? Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          About
          {isVerified && (
            <Badge variant="secondary" className="ml-2 gap-1">
              <Sparkles className="h-3 w-3" />
              Verified
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bio */}
        {bio && (
          <div className="space-y-1">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">{bio}</p>
          </div>
        )}





        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 py-3 border-y border-border">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{postsCount}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{followersCount}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{followingCount}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Info Items */}
        <div className="space-y-3">
          {/* Username */}
          {username && (
            <div className="flex items-center gap-3 text-sm">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Username</span>
              <span className="text-foreground font-medium">@{username}</span>
            </div>
          )}

          {/* Account Type */}
          <div className="flex items-center gap-3 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Account</span>
            <Badge variant={accountType === "private" ? "secondary" : "outline"} className="capitalize">
              {accountType || "Public"}
            </Badge>
          </div>

          {/* Country */}
          {country && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">From</span>
              <span className="text-foreground flex items-center gap-1.5">
                <span className="text-base">{getCountryFlag(country)}</span>
                {getCountryName(country)}
              </span>
            </div>
          )}

          {/* Date of Birth / Age */}
          {dateOfBirth && (
            <div className="flex items-center gap-3 text-sm">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Age</span>
              <span className="text-foreground">
                {userAge} years old
              </span>
            </div>
          )}

          {/* Member Since */}
          {createdAt && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined</span>
              <span className="text-foreground">
                {format(new Date(createdAt), "MMMM yyyy")}
                <span className="text-muted-foreground ml-1">({accountAge})</span>
              </span>
            </div>
          )}
        </div>

        {/* Empty State */}
        {!bio && !dateOfBirth && !country && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No additional information available
          </p>
        )}
      </CardContent>
    </Card>
  );
};
