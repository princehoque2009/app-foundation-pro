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
      outer: "h-14 w-14",
      avatar: "h-12 w-12",
      plus: "h-3 w-3",
      plusContainer: "h-5 w-5",
      icon: "h-5 w-5",
      nameWidth: "max-w-[56px]",
    },
    md: {
      outer: "h-[72px] w-[72px]",
      avatar: "h-[64px] w-[64px]",
      plus: "h-3.5 w-3.5",
      plusContainer: "h-[22px] w-[22px]",
      icon: "h-8 w-8",
      nameWidth: "max-w-[72px]",
    },
    lg: {
      outer: "h-20 w-20",
      avatar: "h-[74px] w-[74px]",
      plus: "h-4 w-4",
      plusContainer: "h-6 w-6",
      icon: "h-10 w-10",
      nameWidth: "max-w-[80px]",
    },
  };

  const s = sizeClasses[size];

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1 flex-shrink-0 group",
        className
      )}
      whileTap={{ scale: 0.92 }}
    >
      <div className="relative">
        {/* Gradient ring */}
        <div
          className={cn(
            s.outer,
            "rounded-full p-[3px] transition-transform duration-200 group-hover:scale-105",
            hasActiveStory && hasUnviewedStory &&
              "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600",
            hasActiveStory && !hasUnviewedStory && "bg-muted",
            !hasActiveStory && !isAddStory && "bg-transparent"
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

        {/* Add story plus */}
        {isAddStory && (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 rounded-full",
              "bg-primary text-primary-foreground shadow-md",
              "border-2 border-background",
              "flex items-center justify-center",
              s.plusContainer
            )}
          >
            <Plus className={s.plus} strokeWidth={3} />
          </div>
        )}
      </div>

      <span
        className={cn(
          "text-[11px] font-medium truncate text-center leading-tight",
          "group-hover:text-foreground transition-colors",
          s.nameWidth,
          isAddStory ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {name}
      </span>
    </motion.button>
  );
};
