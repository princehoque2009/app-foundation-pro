import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, Loader2, SkipForward, SkipBack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PrangonVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  isInView?: boolean;
  compact?: boolean;
}

export const PrangonVideoPlayer = ({
  src,
  poster,
  autoPlay = false,
  muted: initialMuted = true,
  loop = false,
  className,
  onPlay,
  onPause,
  onEnded,
  isInView = true,
  compact = false,
}: PrangonVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showPlayPauseAnim, setShowPlayPauseAnim] = useState<"play" | "pause" | null>(null);

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setShowPlayPauseAnim("pause");
    } else {
      videoRef.current.play().catch(console.error);
      setShowPlayPauseAnim("play");
    }
    setTimeout(() => setShowPlayPauseAnim(null), 600);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const v = parseFloat(e.target.value);
    videoRef.current.volume = v;
    setVolume(v);
    setIsMuted(v === 0);
    videoRef.current.muted = v === 0;
  }, []);

  const handleSeekStart = () => setIsSeeking(true);

  const handleSeekMove = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  }, [duration]);

  const handleSeekEnd = () => setIsSeeking(false);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  }, [duration]);

  const skipForward = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      // fallback for iOS
      const video = videoRef.current as any;
      if (video?.webkitEnterFullscreen) video.webkitEnterFullscreen();
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (!videoRef.current) return;
    setHasError(false);
    setIsLoading(true);
    videoRef.current.load();
  }, []);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => { setIsPlaying(true); onPlay?.(); };
    const onPauseEv = () => { setIsPlaying(false); onPause?.(); };
    const onTimeUpdate = () => { if (!isSeeking) setCurrentTime(video.currentTime); };
    const onDurationChange = () => setDuration(video.duration);
    const onProgress = () => {
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => { setHasError(true); setIsLoading(false); };
    const onEndedEv = () => { setIsPlaying(false); onEnded?.(); };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPauseEv);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("progress", onProgress);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    video.addEventListener("ended", onEndedEv);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPauseEv);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      video.removeEventListener("ended", onEndedEv);
    };
  }, [isSeeking]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isInView && autoPlay) {
      videoRef.current.play().catch(() => {});
    } else if (!isInView) {
      videoRef.current.pause();
    }
  }, [isInView, autoPlay]);

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  useEffect(() => {
    return () => { if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current); };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative group bg-black overflow-hidden select-none",
        isFullscreen ? "fixed inset-0 z-50" : "rounded-lg",
        className
      )}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Loading */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Error */}
      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 gap-3">
          <p className="text-sm text-white/70">Failed to load video</p>
          <button onClick={handleRetry} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
            <RotateCcw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={isMuted}
        loop={loop}
        playsInline
        preload="metadata"
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
      />

      {/* Play/Pause center animation */}
      <AnimatePresence>
        {showPlayPauseAnim && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <div className="h-16 w-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              {showPlayPauseAnim === "play" ? (
                <Play className="h-7 w-7 text-white ml-1" fill="white" />
              ) : (
                <Pause className="h-7 w-7 text-white" fill="white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Large play button when paused and controls visible */}
      {!isPlaying && !isLoading && !hasError && showControls && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center shadow-xl"
          >
            <Play className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" />
          </motion.div>
        </button>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-20 transition-all duration-300",
          showControls || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}
      >
        {/* Gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
        
        <div className="relative px-3 pb-3 pt-8">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-1 group-hover:h-1.5 bg-white/20 rounded-full cursor-pointer mb-2.5 transition-all"
            onClick={handleProgressClick}
            onMouseDown={handleSeekStart}
            onMouseMove={isSeeking ? handleSeekMove : undefined}
            onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchMove={handleSeekMove}
            onTouchEnd={handleSeekEnd}
          >
            {/* Buffered */}
            <div className="absolute h-full bg-white/30 rounded-full transition-all" style={{ width: `${bufferedProgress}%` }} />
            {/* Progress */}
            <div className="absolute h-full bg-primary rounded-full transition-[width] duration-75" style={{ width: `${progress}%` }} />
            {/* Thumb */}
            <div
              className="absolute top-1/2 h-3.5 w-3.5 bg-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
            />
          </div>

          {/* Buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="text-white hover:text-primary transition-colors p-1">
                {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
              </button>

              {!compact && (
                <>
                  <button onClick={skipBackward} className="text-white/80 hover:text-white transition-colors p-1">
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button onClick={skipForward} className="text-white/80 hover:text-white transition-colors p-1">
                    <SkipForward className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button onClick={toggleMute} className="text-white hover:text-primary transition-colors p-1">
                  {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/vol:w-16 transition-all duration-200 accent-primary h-1 cursor-pointer"
                />
              </div>

              <span className="text-white/80 text-[11px] font-mono tabular-nums ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors p-1">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
