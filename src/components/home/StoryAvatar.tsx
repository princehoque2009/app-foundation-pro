import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StoryAvatarProps {
  imageUrl?: string;
  name: string;
  hasActiveStory?: boolean;
  hasUnviewedStory?: boolean;
  isAddStory?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

export const StoryAvatar = ({
  imageUrl,
  name,
  hasActiveStory = false,
  hasUnviewedStory = false,
  isAddStory = false,
  size = "md",
  onClick,
  className,
}: StoryAvatarProps) => {
  const sizeClasses = {
    sm: {
      container: "h-12 w-12",
      avatar: "h-10 w-10",
      ring: "p-[2px]",
      plus: "h-3 w-3",
      plusContainer: "p-0.5",
      icon: "h-5 w-5",
    },
    md: {
      container: "h-[68px] w-[68px]",
      avatar: "h-[62px] w-[62px]",
      ring: "p-[3px]",
      plus: "h-3.5 w-3.5",
      plusContainer: "p-1",
      icon: "h-8 w-8",
    },
    lg: {
      container: "h-20 w-20",
      avatar: "h-[74px] w-[74px]",
      ring: "p-[3px]",
      plus: "h-4 w-4",
      plusContainer: "p-1.5",
      icon: "h-10 w-10",
    },
  };

  const s = sizeClasses[size];

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 flex-shrink-0 group",
        className
      )}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative">
        <div
          className={cn(
            s.ring,
            "rounded-full transition-transform duration-200 group-hover:scale-105",
            hasActiveStory && hasUnviewedStory && "story-ring",
            hasActiveStory && !hasUnviewedStory && "bg-muted",
            !hasActiveStory && !isAddStory && "bg-muted/80"
          )}
        >
          <Avatar className={cn(s.avatar, "border-[3px] border-background")}>
            <AvatarImage
              src={imageUrl}
              alt={name}
              className="object-cover"
            />
            <AvatarFallback className="bg-muted text-muted-foreground">
              <UserCircle className={s.icon} />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Add story button indicator */}
        {isAddStory && (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 rounded-full",
              "bg-primary text-primary-foreground shadow-lg",
              "border-2 border-background",
              s.plusContainer
            )}
          >
            <Plus className={s.plus} strokeWidth={3} />
          </div>
        )}

        {/* Story count indicator (optional) */}
      </div>

      <span
        className={cn(
          "text-[11px] font-medium max-w-[72px] truncate text-center",
          "group-hover:text-foreground transition-colors",
          isAddStory ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {name}
      </span>
    </motion.button>
  );
};
