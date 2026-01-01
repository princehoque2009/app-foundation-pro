import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Smile } from "lucide-react";

const REACTIONS = ["❤️", "👍", "😂", "🔥", "😢", "😮"];

interface MessageReactionsProps {
  messageId: string;
  reactions?: Record<string, string[]>; // emoji -> user ids
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  compact?: boolean;
}

export const MessageReactions = ({
  messageId,
  reactions = {},
  currentUserId,
  onReact,
  onRemoveReaction,
  compact = false,
}: MessageReactionsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleReact = (emoji: string) => {
    const userReacted = reactions[emoji]?.includes(currentUserId);
    if (userReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onReact(messageId, emoji);
    }
    setIsOpen(false);
  };

  const totalReactions = Object.entries(reactions).filter(([_, users]) => users.length > 0);

  return (
    <div className="flex items-center gap-1">
      {/* Show existing reactions */}
      {totalReactions.length > 0 && (
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-full px-1.5 py-0.5">
          {totalReactions.map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={cn(
                "text-xs hover:scale-125 transition-transform",
                users.includes(currentUserId) && "opacity-100",
                !users.includes(currentUserId) && "opacity-70"
              )}
            >
              {emoji}
              {users.length > 1 && (
                <span className="text-[10px] text-muted-foreground ml-0.5">{users.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Add reaction button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
              compact && "h-5 w-5"
            )}
          >
            <Smile className={cn("h-4 w-4", compact && "h-3 w-3")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="center">
          <div className="flex gap-1">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={cn(
                  "text-xl p-1 rounded-lg hover:bg-muted transition-colors hover:scale-125",
                  reactions[emoji]?.includes(currentUserId) && "bg-primary/10"
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
