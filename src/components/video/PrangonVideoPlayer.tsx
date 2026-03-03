import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize,
  RotateCcw, Loader2, SkipForward, SkipBack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Global sound preference - persists across videos in session
let globalMuted = true;
const listeners = new Set<(m: boolean) => void>();
const setGlobalMuted = (m: boolean) => {
  globalMuted = m;
  try { sessionStorage.setItem("prangon_muted", String(m)); } catch {}
  listeners.forEach((fn) => fn(m));
};
try {
  const saved = sessionStorage.getItem("prangon_muted");
  if (saved !== null) globalMuted = saved === "true";
} catch {}

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
  onDoubleTapLike?: () => void;
}

export const PrangonVideoPlayer = memo(({
  src,
  poster,
  autoPlay = false,
  muted: _initialMuted,
  loop = false,
  className,
  onPlay,
  onPause,
  onEnded,
  isInView = true,
  compact = false,
  onDoubleTapLike,
}: PrangonVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout>>();
  const doubleTapTimeout = useRef<ReturnType<typeof setTimeout>>();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(globalMuted);
  const [volume, setVolume] = useState(globalMuted ? 0 : 0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showPlayPauseAnim, setShowPlayPauseAnim] = useState<"play" | "pause" | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [skipAnim, setSkipAnim] = useState<"fwd" | "bwd" | null>(null);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [isVisible, setIsVisible] = useState(isInView);

  // Sync with global mute state
  useEffect(() => {
    const handler = (m: boolean) => {
      setIsMuted(m);
      setVolume(m ? 0 : 0.7);
      if (videoRef.current) {
        videoRef.current.muted = m;
        if (!m) videoRef.current.volume = 0.7;
      }
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  // IntersectionObserver for auto-play at 70% visibility
  useEffect(() => {
    if (!containerRef.current) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.7 }
    );
    observerRef.current.observe(containerRef.current);
    return () => observerRef.current?.disconnect();
  }, []);

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (!videoRef.current) return;
    const shouldPlay = isVisible && (autoPlay || isInView);
    if (shouldPlay) {
      videoRef.current.muted = globalMuted;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isVisible, autoPlay, isInView]);

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
    setTimeout(() => setShowPlayPauseAnim(null), 500);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setGlobalMuted(newMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const v = parseFloat(e.target.value);
    videoRef.current.volume = v;
    videoRef.current.muted = v === 0;
    setVolume(v);
    setGlobalMuted(v === 0);
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
    setSkipAnim("fwd");
    setTimeout(() => setSkipAnim(null), 500);
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    setSkipAnim("bwd");
    setTimeout(() => setSkipAnim(null), 500);
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
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
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowVolumeSlider(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Double-tap handler: sides skip, center play/pause, double-tap center = like
  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const zone = x / rect.width;

    setTapCount((prev) => prev + 1);
    if (doubleTapTimeout.current) clearTimeout(doubleTapTimeout.current);

    doubleTapTimeout.current = setTimeout(() => {
      if (tapCount === 0) {
        togglePlay();
        resetControlsTimeout();
      }
      setTapCount(0);
    }, 250);

    if (tapCount >= 1) {
      clearTimeout(doubleTapTimeout.current);
      setTapCount(0);
      if (zone < 0.3) {
        skipBackward();
      } else if (zone > 0.7) {
        skipForward();
      } else {
        // Double tap center = like
        if (onDoubleTapLike) {
          onDoubleTapLike();
          setShowLikeAnim(true);
          setTimeout(() => setShowLikeAnim(false), 800);
        } else {
          togglePlay();
        }
      }
    }
  }, [tapCount, togglePlay, skipForward, skipBackward, resetControlsTimeout, onDoubleTapLike]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlayEv = () => { setIsPlaying(true); onPlay?.(); };
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

    video.addEventListener("play", onPlayEv);
    video.addEventListener("pause", onPauseEv);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("progress", onProgress);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    video.addEventListener("ended", onEndedEv);

    return () => {
      video.removeEventListener("play", onPlayEv);
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
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
      if (doubleTapTimeout.current) clearTimeout(doubleTapTimeout.current);
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
        preload="auto"
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleVideoClick}
      />

      {/* Like animation */}
      <AnimatePresence>
        {showLikeAnim && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <span className="text-7xl">❤️</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap skip animations */}
      <AnimatePresence>
        {skipAnim && (
          <motion.div
            key={skipAnim}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 pointer-events-none z-30",
              skipAnim === "bwd" ? "left-8" : "right-8"
            )}
          >
            <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {skipAnim === "bwd" ? (
                <SkipBack className="h-6 w-6 text-white" fill="white" />
              ) : (
                <SkipForward className="h-6 w-6 text-white" fill="white" />
              )}
              <span className="absolute -bottom-5 text-white text-xs font-semibold">10s</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause center animation */}
      <AnimatePresence>
        {showPlayPauseAnim && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
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

      {/* Sound toggle - always visible */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
        className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/60"
      >
        <VolumeIcon className="h-4 w-4 text-white" />
      </button>

      {/* Large play button when paused */}
      {!isPlaying && !isLoading && !hasError && showControls && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-16 w-16 rounded-full flex items-center justify-center shadow-xl"
            style={{ background: "rgba(255, 90, 95, 0.9)" }}
          >
            <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        <div className="relative px-3 pb-3 pt-8">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-1 group-hover:h-2 bg-white/20 rounded-full cursor-pointer mb-2.5 transition-all"
            onClick={handleProgressClick}
            onMouseDown={handleSeekStart}
            onMouseMove={isSeeking ? handleSeekMove : undefined}
            onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchMove={handleSeekMove}
            onTouchEnd={handleSeekEnd}
          >
            <div className="absolute h-full bg-white/30 rounded-full" style={{ width: `${bufferedProgress}%` }} />
            <div className="absolute h-full rounded-full transition-[width] duration-75" style={{ width: `${progress}%`, background: "#FF5A5F" }} />
            <div
              className="absolute top-1/2 h-4 w-4 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: "translate(-50%, -50%)", background: "#FF5A5F" }}
            />
          </div>

          {/* Buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button onClick={togglePlay} className="text-white hover:text-white/80 transition-colors p-1">
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

              {/* Volume (non-compact only) */}
              {!compact && (
                <div
                  className="relative flex items-center gap-1"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button onClick={toggleMute} className="text-white hover:text-white/80 transition-colors p-1">
                    <VolumeIcon className="h-4 w-4" />
                  </button>
                  <div className={cn(
                    "overflow-hidden transition-all duration-200",
                    showVolumeSlider ? "w-20 opacity-100" : "w-0 opacity-0"
                  )}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full accent-[#FF5A5F] h-1 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <span className="text-white/80 text-[11px] font-mono tabular-nums ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Playback speed */}
              {!compact && (
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="text-white/80 hover:text-white transition-colors px-1.5 py-0.5 text-[11px] font-semibold rounded"
                  >
                    {playbackRate}x
                  </button>
                  <AnimatePresence>
                    {showSpeedMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md rounded-lg overflow-hidden border border-white/10 shadow-xl"
                      >
                        {speeds.map((s) => (
                          <button
                            key={s}
                            onClick={() => changePlaybackRate(s)}
                            className={cn(
                              "block w-full px-4 py-1.5 text-xs text-left transition-colors whitespace-nowrap",
                              s === playbackRate ? "text-[#FF5A5F] bg-white/10" : "text-white/80 hover:bg-white/10"
                            )}
                          >
                            {s}x
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <button onClick={toggleFullscreen} className="text-white hover:text-white/80 transition-colors p-1">
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PrangonVideoPlayer.displayName = "PrangonVideoPlayer";
