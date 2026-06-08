import { useEffect, useRef, useState, useMemo } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  isOwn?: boolean;
}

const BAR_COUNT = 28;

const generateBars = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  const bars: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1664525 + 1013904223) & 0xffffffff;
    bars.push(0.3 + (Math.abs(h) % 100) / 140);
  }
  return bars;
};

export const VoiceMessagePlayer = ({ src, isOwn }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const bars = useMemo(() => generateBars(src), [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCurrent(a.currentTime);
      setProgress(a.duration ? a.currentTime / a.duration : 0);
    };
    const onLoaded = () => setDuration(a.duration || 0);
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrent(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    a.currentTime = ratio * a.duration;
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-full w-[230px] max-w-full",
        isOwn ? "text-white" : "bg-muted text-foreground"
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition",
          isOwn ? "bg-white/25 hover:bg-white/35 text-white" : "bg-background text-foreground shadow-sm"
        )}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div onClick={seek} className="flex items-center gap-[2px] h-6 cursor-pointer">
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress;
            return (
              <span
                key={i}
                className={cn(
                  "w-[2px] rounded-full transition-colors",
                  isOwn
                    ? filled ? "bg-white" : "bg-white/40"
                    : filled ? "bg-primary" : "bg-muted-foreground/30"
                )}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>
      </div>
      <span className={cn("text-[10px] tabular-nums shrink-0", isOwn ? "text-white/90" : "text-muted-foreground")}>
        {fmt(playing || current ? current : duration)}
      </span>
    </div>
  );
};
