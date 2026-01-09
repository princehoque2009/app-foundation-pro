import { Sparkles, Image, Video, Pin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface Creation {
  id: string;
  type: "image" | "video" | "reel";
  thumbnail?: string;
  caption?: string;
  likes: number;
  isPinned?: boolean;
}

interface ProfileCreationsProps {
  creations: Creation[];
  totalPosts: number;
  totalReels: number;
}

export const ProfileCreations = ({
  creations = [],
  totalPosts = 0,
  totalReels = 0,
}: ProfileCreationsProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Creations
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              <Image className="h-3 w-3 mr-1" />
              {totalPosts} Posts
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Video className="h-3 w-3 mr-1" />
              {totalReels} Reels
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {creations.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {creations.slice(0, 6).map((creation, index) => (
              <motion.div
                key={creation.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer"
              >
                {creation.thumbnail ? (
                  <img
                    src={creation.thumbnail}
                    alt={creation.caption || "Creation"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {creation.type === "video" || creation.type === "reel" ? (
                      <Video className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <Image className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    ❤️ {creation.likes}
                  </span>
                </div>

                {/* Pinned indicator */}
                {creation.isPinned && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground p-1 rounded-full">
                    <Pin className="h-3 w-3" />
                  </div>
                )}

                {/* Type indicator */}
                {(creation.type === "video" || creation.type === "reel") && (
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded">
                    <Video className="h-3 w-3" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No creations yet
          </p>
        )}
      </CardContent>
    </Card>
  );
};
