import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserCircle, Pause, Play, Trash2, Send, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useStories, StoryGroup } from "@/hooks/useStories";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  initialStoryIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORY_DURATION = 6000; // 6 seconds for images
const REACTIONS = ["❤️", "🔥", "👏", "😂", "😮", "😢"];

export const StoryViewer = ({
  storyGroups,
  initialGroupIndex,
  initialStoryIndex = 0,
  open,
  onOpenChange,
}: StoryViewerProps) => {
  const { user } = useAuth();
  const { deleteStory, recordView, sendReaction } = useStories();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const isOwner = user?.id === currentGroup?.user?.id;
  const isVideo = currentStory?.media_type === "video";

  // Reset when opening
  useEffect(() => {
    if (open) {
      setGroupIndex(initialGroupIndex);
      setStoryIndex(initialStoryIndex);
      setProgress(0);
      setIsPaused(false);
      setShowViewers(false);
      elapsedRef.current = 0;
    }
  }, [open, initialGroupIndex, initialStoryIndex]);

  // Record view
  useEffect(() => {
    if (open && currentStory && user?.id && currentStory.user_id !== user.id) {
      recordView.mutate(currentStory.id);
    }
  }, [open, currentStory?.id]);

  // Auto-advance timer
  const startTimer = useCallback(() => {
    if (isVideo) return; // Video controls its own timing
    startTimeRef.current = Date.now();
    
    const tick = () => {
      const now = Date.now();
      const total = elapsedRef.current + (now - startTimeRef.current);
      const pct = Math.min((total / STORY_DURATION) * 100, 100);
      setProgress(pct);
      
      if (pct >= 100) {
        goNext();
        return;
      }
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
  }, [isVideo, groupIndex, storyIndex]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    if (startTimeRef.current > 0) {
      elapsedRef.current += Date.now() - startTimeRef.current;
      startTimeRef.current = 0;
    }
  }, []);

  useEffect(() => {
    if (!open || isPaused || isVideo) return;
    elapsedRef.current = 0;
    startTimer();
    return stopTimer;
  }, [open, groupIndex, storyIndex, isPaused, isVideo, startTimer, stopTimer]);

  const goNext = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    
    if (storyIndex < (currentGroup?.stories.length || 0) - 1) {
      setStoryIndex(s => s + 1);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex(g => g + 1);
      setStoryIndex(0);
    } else {
      onOpenChange(false);
    }
  }, [storyIndex, groupIndex, currentGroup, storyGroups.length, onOpenChange]);

  const goPrev = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    
    if (storyIndex > 0) {
      setStoryIndex(s => s - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(g => g - 1);
      const prevGroup = storyGroups[groupIndex - 1];
      setStoryIndex(prevGroup ? prevGroup.stories.length - 1 : 0);
    }
  }, [storyIndex, groupIndex, storyGroups]);

  // Touch/click navigation
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const half = rect.width / 2;
    
    if (x < half) {
      goPrev();
    } else {
      goNext();
    }
  }, [goPrev, goNext]);

  // Long press to pause
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const handlePointerDown = () => {
    longPressTimer.current = setTimeout(() => {
      setIsPaused(true);
      stopTimer();
    }, 200);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isPaused) {
      setIsPaused(false);
    }
  };

  const handleDelete = async () => {
    if (!currentStory) return;
    await deleteStory.mutateAsync(currentStory.id);
    goNext();
  };

  const handleReaction = (reaction: string) => {
    if (!currentStory) return;
    sendReaction.mutate({ storyId: currentStory.id, reaction });
  };

  const handleVideoEnded = () => {
    goNext();
  };

  if (!currentStory || !currentGroup) return null;

  const totalStories = currentGroup.stories.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none w-screen h-screen p-0 border-0 bg-black rounded-none [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="relative w-full h-full flex flex-col">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-3 pt-3">
            {currentGroup.stories.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden"
              >
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{
                    width: `${i < storyIndex ? 100 : i === storyIndex ? progress : 0}%`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 z-30 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-white/40">
                <AvatarImage src={currentGroup.user.avatar_url || ""} />
                <AvatarFallback className="bg-muted">
                  <UserCircle className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {currentGroup.user.display_name || currentGroup.user.username}
                </p>
                <p className="text-white/60 text-[11px]">
                  {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPaused && (
                <span className="text-white/80 text-xs">Paused</span>
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="text-white hover:bg-white/10 h-8 w-8"
                  disabled={deleteStory.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/10 h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Story content - tap zones */}
          <div
            className="flex-1 flex items-center justify-center relative touch-none select-none"
            onClick={handleTap}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStory.id}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full flex items-center justify-center"
              >
                {currentStory.media_type === "image" ? (
                  <img
                    src={currentStory.media_url}
                    alt="Story"
                    className="max-w-full max-h-full object-contain pointer-events-none select-none"
                    draggable={false}
                    loading="eager"
                    fetchPriority="high"
                  />
                ) : (
                  <video
                    src={currentStory.media_url}
                    autoPlay
                    playsInline
                    className="max-w-full max-h-full object-contain pointer-events-none"
                    onEnded={handleVideoEnded}
                    muted={false}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation arrows (desktop) */}
            {groupIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 hidden sm:block"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {groupIndex < storyGroups.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 hidden sm:block"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Bottom section */}
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-6 px-4">
            {isOwner ? (
              /* Owner: view count */
              <button
                onClick={() => setShowViewers(!showViewers)}
                className="flex items-center gap-2 text-white/80 text-sm mb-3"
              >
                <Eye className="h-4 w-4" />
                <span>{currentStory.views_count || 0} views</span>
              </button>
            ) : (
              /* Viewer: reactions + reply */
              <div className="space-y-3">
                {/* Reaction emojis */}
                <div className="flex justify-center gap-4">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                      className="text-2xl active:scale-125 transition-transform hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Reply input */}
                <div className="flex gap-2">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Send a reply..."
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full h-10"
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => { setIsPaused(true); stopTimer(); }}
                    onBlur={() => setIsPaused(false)}
                  />
                  {replyText && (
                    <Button
                      size="icon"
                      className="rounded-full h-10 w-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Send reply as DM
                        setReplyText("");
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
