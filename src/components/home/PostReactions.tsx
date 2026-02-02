import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const REACTIONS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😡", label: "Angry" },
  { emoji: "👍", label: "Like" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "🎉", label: "Celebrate" },
];

interface PostReactionsProps {
  postId: string;
  currentReaction?: string;
  reactionCounts?: Record<string, number>;
  onReact: (emoji: string) => void;
  onRemoveReaction: () => void;
  disabled?: boolean;
}

export const PostReactions = ({
  postId,
  currentReaction,
  reactionCounts = {},
  onReact,
  onRemoveReaction,
  disabled = false,
}: PostReactionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAnimation, setShowAnimation] = useState<string | null>(null);

  const handleReact = (emoji: string) => {
    if (currentReaction === emoji) {
      onRemoveReaction();
    } else {
      setShowAnimation(emoji);
      setTimeout(() => setShowAnimation(null), 600);
      onReact(emoji);
    }
    setIsOpen(false);
  };

  const totalReactions = Object.entries(reactionCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalCount = totalReactions.reduce((sum, [_, count]) => sum + count, 0);

  return (
    <div className="relative flex items-center">
      {/* Floating animation */}
      <AnimatePresence>
        {showAnimation && (
          <motion.span
            initial={{ scale: 0.5, opacity: 1, y: 0 }}
            animate={{ scale: 1.5, opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute -top-2 left-4 text-2xl pointer-events-none z-10"
          >
            {showAnimation}
          </motion.span>
        )}
      </AnimatePresence>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className={cn(
              "gap-1.5 h-10 px-3 rounded-full hover:bg-primary/10 transition-all",
              currentReaction && "text-primary"
            )}
          >
            <span className="text-xl">{currentReaction || "❤️"}</span>
            {totalCount > 0 && (
              <span className="text-sm font-semibold tabular-nums">{totalCount}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <div className="flex gap-1">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReact(reaction.emoji)}
                className={cn(
                  "text-2xl p-2 rounded-xl hover:bg-muted transition-all hover:scale-125",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  currentReaction === reaction.emoji && "bg-primary/10 scale-110"
                )}
                title={reaction.label}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Display reaction summary */}
      {totalReactions.length > 0 && (
        <div className="flex items-center -ml-1">
          <div className="flex -space-x-1">
            {totalReactions.slice(0, 3).map(([emoji]) => (
              <span key={emoji} className="text-sm">
                {emoji}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
