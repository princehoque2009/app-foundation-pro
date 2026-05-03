import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserCircle, Trash2, Send, ChevronLeft, ChevronRight, Eye, Volume2, VolumeX, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useStories, StoryGroup } from "@/hooks/useStories";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  initialStoryIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORY_DURATION = 6000;
const STORY_FILTERS: Record<string, string> = {
  warm: "brightness(1.1) saturate(1.3) sepia(0.15)",
  cool: "brightness(1.05) saturate(0.9) hue-rotate(15deg)",
  vintage: "sepia(0.4) contrast(1.1) brightness(0.95)",
  dramatic: "contrast(1.4) saturate(1.2) brightness(0.9)",
  fade: "contrast(0.85) brightness(1.1) saturate(0.8)",
  bw: "grayscale(1) contrast(1.2)",
  vivid: "saturate(1.6) contrast(1.1)",
};

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
  const [isMuted, setIsMuted] = useState(false);
  const [flyingReaction, setFlyingReaction] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const isOwner = user?.id === currentGroup?.user?.id;
  const isVideo = currentStory?.media_type === "video";
  const storyTextStyle = (currentStory?.text_style as any) || {};
  const storyTexts = Array.isArray(storyTextStyle?.texts) ? storyTextStyle.texts : [];
  const storyStickers = Array.isArray((currentStory?.sticker_data as any)?.stickers)
    ? ((currentStory?.sticker_data as any)?.stickers as any[])
    : [];
  const filterCss = currentStory?.filter_name ? STORY_FILTERS[currentStory.filter_name] || "" : "";

  // Fetch viewers + reactions for owner
  const { data: viewersData } = useQuery({
    queryKey: ["story-viewers-detail", currentStory?.id],
    queryFn: async () => {
      if (!currentStory?.id) return { viewers: [], reactions: [] };
      const [viewsRes, reactionsRes] = await Promise.all([
        supabase
          .from("story_views")
          .select("viewer_id, viewed_at")
          .eq("story_id", currentStory.id)
          .order("viewed_at", { ascending: false }),
        supabase
          .from("story_reactions")
          .select("user_id, reaction, created_at")
          .eq("story_id", currentStory.id),
      ]);
      
      // Fetch profiles for viewers
      const viewerIds = [...new Set([
        ...(viewsRes.data || []).map(v => v.viewer_id),
        ...(reactionsRes.data || []).map(r => r.user_id),
      ])];
      
      let profiles: Record<string, any> = {};
      if (viewerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", viewerIds);
        profiles = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
      }
      
      return {
        viewers: (viewsRes.data || []).map(v => ({
          ...v,
          profile: profiles[v.viewer_id],
        })),
        reactions: (reactionsRes.data || []).map(r => ({
          ...r,
          profile: profiles[r.user_id],
        })),
        reactionMap: Object.fromEntries(
          (reactionsRes.data || []).map(r => [r.user_id, r.reaction])
        ),
      };
    },
    enabled: !!currentStory?.id && isOwner && showViewers,
  });

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

  useEffect(() => {
    if (open && currentStory && user?.id && currentStory.user_id !== user.id) {
      recordView.mutate(currentStory.id);
    }
    // Preload existing reaction so heart stays filled across sessions
    if (open && currentStory && user?.id) {
      supabase
        .from("story_reactions")
        .select("id")
        .eq("story_id", currentStory.id)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setLikedStoryIds(prev => new Set(prev).add(currentStory.id));
        });
    }
  }, [open, currentStory?.id]);

  const startTimer = useCallback(() => {
    if (isVideo) return;
    startTimeRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const total = elapsedRef.current + (now - startTimeRef.current);
      const pct = Math.min((total / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) { goNext(); return; }
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
  }, [isVideo, groupIndex, storyIndex]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { cancelAnimationFrame(timerRef.current); timerRef.current = null; }
    if (startTimeRef.current > 0) { elapsedRef.current += Date.now() - startTimeRef.current; startTimeRef.current = 0; }
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
    setShowViewers(false);
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

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    if (x < rect.width / 3) goPrev();
    else if (x > (rect.width * 2) / 3) goNext();
  }, [goPrev, goNext]);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const handlePointerDown = () => {
    longPressTimer.current = setTimeout(() => { setIsPaused(true); stopTimer(); }, 200);
  };
  const handlePointerUp = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (isPaused) setIsPaused(false);
  };

  const handleDeleteRequest = () => {
    if (!currentStory) return;
    setIsPaused(true);
    stopTimer();
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!currentStory) return;
    await deleteStory.mutateAsync(currentStory.id);
    setConfirmDelete(false);
    setIsPaused(false);
    goNext();
  };

  // Track which stories the current viewer has already liked (one heart per story, like Instagram)
  const [likedStoryIds, setLikedStoryIds] = useState<Set<string>>(new Set());
  const hasLikedCurrent = currentStory ? likedStoryIds.has(currentStory.id) : false;

  const handleHeartReaction = () => {
    if (!currentStory || hasLikedCurrent) return;
    sendReaction.mutate({ storyId: currentStory.id, reaction: "❤️" });
    setLikedStoryIds(prev => new Set(prev).add(currentStory.id));
    setFlyingReaction("❤️");
    setTimeout(() => setFlyingReaction(null), 800);
  };

  const handleVideoEnded = () => goNext();

  // Swipe gesture
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    handlePointerDown();
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    handlePointerUp();
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dy) > 100 && dy > 0 && Math.abs(dx) < 50) {
      onOpenChange(false);
      return;
    }
    if (Math.abs(dx) > 60) {
      if (dx < 0 && groupIndex < storyGroups.length - 1) { setGroupIndex(g => g + 1); setStoryIndex(0); setProgress(0); elapsedRef.current = 0; }
      else if (dx > 0 && groupIndex > 0) { setGroupIndex(g => g - 1); setStoryIndex(0); setProgress(0); elapsedRef.current = 0; }
      return;
    }
    handleTap(e);
    touchStartRef.current = null;
  };

  if (!currentStory || !currentGroup) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none w-screen h-screen p-0 border-0 bg-black rounded-none [&>button]:hidden"
        onInteractOutside={e => e.preventDefault()}
      >
        <div className="relative w-full h-full flex flex-col">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-30 flex gap-[3px] px-3 pt-2">
            {currentGroup.stories.map((_, i) => (
              <div key={i} className="flex-1 h-[2.5px] rounded-full bg-white/25 overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${i < storyIndex ? 100 : i === storyIndex ? progress : 0}%` }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-5 left-0 right-0 z-30 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9 border-2 border-white/50">
                <AvatarImage src={currentGroup.user.avatar_url || ""} />
                <AvatarFallback className="bg-muted"><UserCircle className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-white text-[13px] font-semibold truncate leading-tight">
                  {currentGroup.user.display_name || currentGroup.user.username}
                </p>
                <p className="text-white/50 text-[10px] leading-tight">
                  {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isPaused && <span className="text-white/60 text-[10px] bg-white/10 px-2 py-0.5 rounded-full">Paused</span>}
              {isVideo && (
                <Button variant="ghost" size="icon" onClick={() => {
                  setIsMuted(!isMuted);
                  if (videoRef.current) videoRef.current.muted = !isMuted;
                }} className="text-white hover:bg-white/10 h-8 w-8">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              )}
              {isOwner && (
                <Button variant="ghost" size="icon" onClick={handleDeleteRequest} className="text-white hover:bg-white/10 h-8 w-8" disabled={deleteStory.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10 h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Story content */}
          <div
            className="flex-1 flex items-center justify-center relative touch-none select-none"
            onClick={handleTap}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
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
                    style={{ filter: filterCss }}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={currentStory.media_url}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="max-w-full max-h-full object-contain pointer-events-none"
                    onEnded={handleVideoEnded}
                    style={{ filter: filterCss }}
                  />
                )}

                {(storyTexts.length > 0 || storyStickers.length > 0) && (
                  <div className="absolute inset-0 pointer-events-none">
                    {storyTexts.map((text: any) => (
                      <div
                        key={text.id}
                        className="absolute"
                        style={{ left: `${text.x}%`, top: `${text.y}%`, transform: "translate(-50%, -50%)" }}
                      >
                        <p
                          className="px-3 py-1.5 rounded-lg text-center max-w-[80vw]"
                          style={{
                            color: text.color,
                            backgroundColor: text.bgColor || "transparent",
                            fontSize: `${text.fontSize || 24}px`,
                            fontWeight: text.bold ? 700 : 400,
                            fontStyle: text.italic ? "italic" : "normal",
                          }}
                        >
                          {text.text}
                        </p>
                      </div>
                    ))}

                    {storyStickers.map((sticker: any) => (
                      <div
                        key={sticker.id}
                        className="absolute"
                        style={{
                          left: `${sticker.x}%`,
                          top: `${sticker.y}%`,
                          transform: `translate(-50%, -50%) scale(${sticker.scale || 1})`,
                        }}
                      >
                        {sticker.type === "emoji" && <span className="text-5xl">{sticker.data?.emoji}</span>}
                        {sticker.type === "poll" && (
                          <div className="bg-white/95 rounded-2xl p-3 min-w-[180px] shadow-xl">
                            <p className="text-sm font-bold text-foreground mb-2">{sticker.data?.question}</p>
                            {(sticker.data?.options || []).map((option: string, index: number) => (
                              <div key={index} className="bg-muted rounded-full py-1.5 px-3 mb-1 text-sm text-center">
                                {option}
                              </div>
                            ))}
                          </div>
                        )}
                        {sticker.type === "question" && (
                          <div className="bg-white/95 rounded-2xl p-3 min-w-[180px] text-center shadow-xl">
                            <p className="text-xs font-semibold text-primary mb-1">{sticker.data?.question}</p>
                            <div className="bg-muted rounded-full py-1.5 px-3 text-sm text-muted-foreground">Reply</div>
                          </div>
                        )}
                        {sticker.type === "countdown" && (
                          <div className="bg-primary rounded-2xl p-3 min-w-[160px] text-center text-primary-foreground shadow-xl">
                            <p className="text-xs font-semibold mb-1">{sticker.data?.label || "Countdown"}</p>
                            <p className="text-xl font-bold">24:00:00</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Flying reaction */}
            <AnimatePresence>
              {flyingReaction && (
                <motion.span
                  initial={{ scale: 0.5, opacity: 1, y: 0 }}
                  animate={{ scale: 2, opacity: 0, y: -120 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                  className="absolute bottom-32 left-1/2 -translate-x-1/2 text-5xl pointer-events-none z-40"
                >
                  {flyingReaction}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Desktop navigation arrows */}
            {groupIndex > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setGroupIndex(g => g - 1); setStoryIndex(0); setProgress(0); elapsedRef.current = 0; }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 hidden sm:block"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {groupIndex < storyGroups.length - 1 && (
              <button
                onClick={e => { e.stopPropagation(); setGroupIndex(g => g + 1); setStoryIndex(0); setProgress(0); elapsedRef.current = 0; }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 hidden sm:block"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Bottom section */}
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-6 px-4">
            {isOwner ? (
              <div>
                <button
                  onClick={() => setShowViewers(!showViewers)}
                  className="flex items-center gap-2 text-white/80 text-sm mb-2 hover:text-white transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>{currentStory.views_count || 0} views</span>
                </button>
                
                {/* Viewers panel */}
                <AnimatePresence>
                  {showViewers && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-black/80 rounded-2xl p-3 mb-3 max-h-[40vh] overflow-y-auto"
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-white text-xs font-semibold mb-2">
                        Viewers ({viewersData?.viewers?.length || 0})
                      </p>
                      {viewersData?.viewers?.map((viewer: any) => (
                        <div key={viewer.viewer_id} className="flex items-center gap-2 py-1.5">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={viewer.profile?.avatar_url || ""} />
                            <AvatarFallback className="text-[10px]">
                              {viewer.profile?.username?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white text-xs flex-1 truncate">
                            {viewer.profile?.display_name || viewer.profile?.username || "User"}
                          </span>
                          {viewersData?.reactionMap?.[viewer.viewer_id] && (
                            <span className="text-sm">{viewersData.reactionMap[viewer.viewer_id]}</span>
                          )}
                        </div>
                      ))}
                      {(!viewersData?.viewers || viewersData.viewers.length === 0) && (
                        <p className="text-white/50 text-xs py-2">No viewers yet</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Reply input + heart */}
                <div className="flex gap-2 items-center">
                  <Input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Send a reply..."
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full h-10 text-sm"
                    onClick={e => e.stopPropagation()}
                    onFocus={() => { setIsPaused(true); stopTimer(); }}
                    onBlur={() => setIsPaused(false)}
                  />
                  {replyText ? (
                    <Button
                      size="icon"
                      className="rounded-full h-10 w-10"
                      onClick={e => { e.stopPropagation(); setReplyText(""); }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : (
                    <motion.button
                      onClick={e => { e.stopPropagation(); handleHeartReaction(); }}
                      whileTap={{ scale: 1.4 }}
                      disabled={hasLikedCurrent}
                      className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-100"
                      aria-label={hasLikedCurrent ? "Liked" : "Like"}
                    >
                      <Heart className={cn("h-6 w-6 transition-colors", hasLikedCurrent ? "fill-red-500 text-red-500" : "text-white")} />
                    </motion.button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={confirmDelete} onOpenChange={(open) => { setConfirmDelete(open); if (!open) setIsPaused(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this story?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this story? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};