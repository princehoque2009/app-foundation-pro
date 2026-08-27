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
  onPlusClick?: () => void;
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
  onPlusClick,
  className,
}: StoryAvatarProps) => {
  const sizeClasses = {
    sm: { outer: "h-14 w-14", avatar: "h-full w-full", plus: "h-3 w-3", plusContainer: "h-5 w-5", icon: "h-5 w-5", nameWidth: "max-w-[56px]" },
    md: { outer: "h-[72px] w-[72px]", avatar: "h-full w-full", plus: "h-3.5 w-3.5", plusContainer: "h-[22px] w-[22px]", icon: "h-8 w-8", nameWidth: "max-w-[72px]" },
    lg: { outer: "h-20 w-20", avatar: "h-full w-full", plus: "h-4 w-4", plusContainer: "h-6 w-6", icon: "h-10 w-10", nameWidth: "max-w-[80px]" },
  };

  const s = sizeClasses[size];

  return (
    <div className={cn("relative flex flex-col items-center gap-1.5 flex-shrink-0 group", className)}>
      <div className="relative">
        <motion.button
          onClick={onClick}
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.03 }}
          className={cn(
            s.outer,
            "rounded-full p-[3.5px] aspect-square flex items-center justify-center transition-all duration-300",
            hasActiveStory && hasUnviewedStory && "story-ring shadow-[0_2px_12px_hsl(var(--primary)/0.25)]",
            hasActiveStory && !hasUnviewedStory && "bg-muted-foreground/20",
            !hasActiveStory && isAddStory && "bg-gradient-to-br from-border to-border/50 p-[1.5px]",
            !hasActiveStory && !isAddStory && "bg-transparent"
          )}
        >
          <Avatar className={cn(s.avatar, "border-[3px] border-background aspect-square shadow-sm")}>
            <AvatarImage src={imageUrl} alt={name} className="object-cover" />
            <AvatarFallback className="bg-muted text-muted-foreground">
              <UserCircle className={s.icon} />
            </AvatarFallback>
          </Avatar>
        </motion.button>

        {isAddStory && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlusClick?.();
            }}
            aria-label="Add to your story"
            className={cn(
              "absolute -bottom-1 -right-1 rounded-full",
              "bg-primary text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.4)]",
              "border-[2.5px] border-background",
              "flex items-center justify-center z-10",
              "hover:scale-110 hover:shadow-[0_4px_12px_hsl(var(--primary)/0.5)] active:scale-95 transition-all duration-200",
              s.plusContainer
            )}
          >
            <Plus className={s.plus} strokeWidth={3} />
          </button>
        )}
      </div>

      <span
        className={cn(
          "text-[11px] font-medium truncate text-center leading-tight tracking-tight",
          "transition-colors duration-200",
          s.nameWidth,
          isAddStory ? "text-foreground font-semibold" : hasUnviewedStory ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {name}
      </span>
    </div>
  );
};
