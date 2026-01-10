import { MapPin, Calendar, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { getCountryName, getCountryFlag } from "@/lib/countries";

interface ProfileAboutSectionProps {
  bio?: string | null;
  dateOfBirth?: string | null;
  createdAt?: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  country?: string | null;
}

export const ProfileAboutSection = ({
  bio,
  dateOfBirth,
  createdAt,
  postsCount = 0,
  followersCount = 0,
  followingCount = 0,
  country,
}: ProfileAboutSectionProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          About
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bio */}
        {bio && (
          <div className="space-y-1">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{bio}</p>
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

          {dateOfBirth && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Born</span>
              <span className="text-foreground">
                {format(new Date(dateOfBirth), "MMMM d, yyyy")}
              </span>
            </div>
          )}
          
          {createdAt && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined</span>
              <span className="text-foreground">
                {format(new Date(createdAt), "MMMM yyyy")}
              </span>
            </div>
          )}
        </div>

        {!bio && !dateOfBirth && !country && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No additional information available
          </p>
        )}
      </CardContent>
    </Card>
  );
};
