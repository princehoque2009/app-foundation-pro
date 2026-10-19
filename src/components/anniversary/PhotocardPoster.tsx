import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Share2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Wrapped } from "@/hooks/useAnniversary";

interface PosterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  username: string;
  avatarUrl: string | null;
  stats: Wrapped | undefined;
  collectibles: number;
}

const W = 1080;
const H = 1350;

const THEMES = [
  { id: "ember", label: "Ember", bg: ["#16080d", "#2a0f16", "#0c060a"], glow: "rgba(255,79,90,0.55)", ring: ["#FF4F5A", "#FFB020", "#7CE7C4"], eyebrow: "#FFB9BE", name: "#ffffff", handle: "#FF8A92", card: "rgba(255,255,255,0.07)", cardLine: "rgba(255,255,255,0.16)", stat: "#ffffff", statLabel: "#c9a3a9", footer: "#ffffff", footerSub: "#8d6b72", sparks: ["#FF4F5A", "#FFB020", "#7CE7C4", "#ffffff"] },
  { id: "ocean", label: "Ocean", bg: ["#06121f", "#0a2338", "#040b14"], glow: "rgba(56,150,255,0.5)", ring: ["#3896FF", "#7CE7C4", "#ffffff"], eyebrow: "#a9d4ff", name: "#ffffff", handle: "#7cc0ff", card: "rgba(255,255,255,0.07)", cardLine: "rgba(255,255,255,0.16)", stat: "#ffffff", statLabel: "#9db8cc", footer: "#ffffff", footerSub: "#5f7d94", sparks: ["#3896FF", "#7CE7C4", "#ffffff", "#FFB020"] },
  { id: "royal", label: "Royal", bg: ["#150a24", "#241040", "#0a0512"], glow: "rgba(168,110,255,0.5)", ring: ["#A86EFF", "#FF7AC6", "#FFB020"], eyebrow: "#d8bdff", name: "#ffffff", handle: "#c99dff", card: "rgba(255,255,255,0.07)", cardLine: "rgba(255,255,255,0.16)", stat: "#ffffff", statLabel: "#b3a0cc", footer: "#ffffff", footerSub: "#7a6694", sparks: ["#A86EFF", "#FF7AC6", "#FFB020", "#ffffff"] },
  { id: "daylight", label: "Daylight", bg: ["#fff7f3", "#ffe9e4", "#fffdfB"], glow: "rgba(255,79,90,0.25)", ring: ["#FF4F5A", "#FFB020", "#FF8A92"], eyebrow: "#d45a63", name: "#241016", handle: "#FF4F5A", card: "rgba(36,16,22,0.05)", cardLine: "rgba(36,16,22,0.14)", stat: "#241016", statLabel: "#a07a80", footer: "#241016", footerSub: "#b08d92", sparks: ["#FF4F5A", "#FFB020", "#7CE7C4", "#FFD9DC"] },
] as const;
type ThemeId = (typeof THEMES)[number]["id"];

const LAYOUTS = [
  { id: "classic", label: "Classic", desc: "Centered avatar, stats row" },
  { id: "portrait", label: "Portrait", desc: "Big avatar top, stats grid" },
  { id: "minimal", label: "Minimal", desc: "Type-led, no sparks" },
] as const;
type LayoutId = (typeof LAYOUTS)[number]["id"];

const STAT_OPTIONS = [
  { id: "posts", label: "Posts" },
  { id: "reels", label: "Reels" },
  { id: "likes", label: "Likes" },
  { id: "comments", label: "Comments" },
  { id: "views", label: "Views" },
  { id: "awards", label: "Awards" },
] as const;
type StatId = (typeof STAT_OPTIONS)[number]["id"];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export const PhotocardPoster = ({ open, onOpenChange, name, username, avatarUrl, stats, collectibles }: PosterProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [themeId, setThemeId] = useState<ThemeId>("ember");
  const [layoutId, setLayoutId] = useState<LayoutId>("classic");
  const [selectedStats, setSelectedStats] = useState<StatId[]>(["posts", "reels", "likes", "awards"]);

  const toggleStat = (id: StatId) =>
    setSelectedStats((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : prev.length >= 4 ? prev : [...prev, id]));

  const statValue = (id: StatId): string => {
    switch (id) {
      case "posts": return String(stats?.posts ?? 0);
      case "reels": return String(stats?.reels ?? 0);
      case "likes": return String(stats?.likes ?? 0);
      case "comments": return String(stats?.comments ?? 0);
      case "views": return String(stats?.views ?? 0);
      case "awards": return String(collectibles);
    }
  };

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setBusy(true);
    const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, theme.bg[0]);
    bg.addColorStop(0.55, theme.bg[1]);
    bg.addColorStop(1, theme.bg[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glowY = layoutId === "portrait" ? 330 : 420;
    const glow = ctx.createRadialGradient(W / 2, glowY, 60, W / 2, glowY, 620);
    glow.addColorStop(0, theme.glow);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    if (layoutId !== "minimal") {
      let seed = 42;
      const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
      for (let i = 0; i < 90; i++) {
        ctx.globalAlpha = 0.25 + rand() * 0.5;
        ctx.fillStyle = theme.sparks[i % 4];
        ctx.beginPath();
        ctx.arc(rand() * W, rand() * H, 2 + rand() * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = "center";
    ctx.fillStyle = theme.eyebrow;
    ctx.font = "600 34px Inter, system-ui, sans-serif";
    ctx.fillText("P R A N G O N   v 2 . 0   ·   Y E A R   O N E", W / 2, layoutId === "portrait" ? 120 : 150);

    const cx = W / 2;
    const cy = layoutId === "portrait" ? 380 : layoutId === "minimal" ? 460 : 430;
    const R = layoutId === "portrait" ? 230 : layoutId === "minimal" ? 150 : 190;

    const ring = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    ring.addColorStop(0, theme.ring[0]);
    ring.addColorStop(0.5, theme.ring[1]);
    ring.addColorStop(1, theme.ring[2]);
    ctx.strokeStyle = ring;
    ctx.lineWidth = layoutId === "minimal" ? 8 : 14;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    const avatar = avatarUrl ? await loadImage(avatarUrl) : null;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R - 16, 0, Math.PI * 2); ctx.clip();
    if (avatar) {
      const s = Math.min(avatar.width, avatar.height);
      ctx.drawImage(avatar, (avatar.width - s) / 2, (avatar.height - s) / 2, s, s, cx - R + 16, cy - R + 16, (R - 16) * 2, (R - 16) * 2);
    } else {
      ctx.fillStyle = theme.card;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.fillStyle = theme.handle;
      ctx.font = `700 ${Math.round(R * 0.8)}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText((name || "P").charAt(0).toUpperCase(), cx, cy + 8);
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();

    const nameY = cy + R + (layoutId === "portrait" ? 120 : 110);
    ctx.fillStyle = theme.name;
    ctx.font = `800 ${layoutId === "minimal" ? 96 : 84}px Inter, system-ui, sans-serif`;
    ctx.fillText(name || "Prangon member", cx, nameY);
    ctx.fillStyle = theme.handle;
    ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.fillText(`@${username}`, cx, nameY + 60);

    const chosen = selectedStats.length > 0 ? selectedStats : (["posts"] as StatId[]);
    const cols = chosen.length <= 2 ? chosen.length : chosen.length === 3 ? 3 : layoutId === "portrait" ? 2 : chosen.length;
    const rows = Math.ceil(chosen.length / cols);
    const gap = 24;
    const cw = Math.min(240, (W - 160 - gap * (cols - 1)) / cols);
    const ch = 170;
    const gridW = cw * cols + gap * (cols - 1);
    const x0 = (W - gridW) / 2;
    const y0 = Math.min(nameY + 120, H - 300 - rows * (ch + gap));
    chosen.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = x0 + col * (cw + gap);
      const y = y0 + row * (ch + gap);
      ctx.fillStyle = theme.card;
      roundRect(ctx, x, y, cw, ch, 28);
      ctx.fill();
      ctx.strokeStyle = theme.cardLine;
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, cw, ch, 28);
      ctx.stroke();
      ctx.fillStyle = theme.stat;
      ctx.font = "800 56px Inter, system-ui, sans-serif";
      ctx.fillText(statValue(id), x + cw / 2, y + 78);
      ctx.fillStyle = theme.statLabel;
      ctx.font = "600 24px Inter, system-ui, sans-serif";
      ctx.fillText(STAT_OPTIONS.find((s) => s.id === id)?.label.toUpperCase() ?? "", x + cw / 2, y + 128);
    });

    ctx.fillStyle = theme.footer;
    ctx.font = "700 44px Inter, system-ui, sans-serif";
    ctx.fillText("One year. All of us.", cx, H - 200);
    ctx.fillStyle = theme.footerSub;
    ctx.font = "500 30px Inter, system-ui, sans-serif";
    ctx.fillText("OCTOBER 2026 · THE ANNIVERSARY EDITION", cx, H - 140);

    setBusy(false);
    setReady(true);
  }, [themeId, layoutId, selectedStats, avatarUrl, name, username, stats, collectibles]);

  useEffect(() => {
    if (open) {
      setReady(false);
      const t = window.setTimeout(() => { void draw(); }, 60);
      return () => window.clearTimeout(t);
    }
  }, [open, draw]);

  const blob = (): Promise<Blob | null> =>
    new Promise((resolve) => canvasRef.current?.toBlob((b) => resolve(b), "image/png"));

  const download = async () => {
    const b = await blob();
    if (!b) return;
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prangon-v2-photocard.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const b = await blob();
    if (!b) return;
    const file = new File([b], "prangon-v2-photocard.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Prangon v2.0 photocard", text: "Celebrating one year of Prangon." });
      } else {
        await download();
        toast({ title: "Poster downloaded — share it anywhere" });
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast({ title: "Could not share", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="edition-poster-dialog">
        <DialogTitle>Your anniversary photocard</DialogTitle>
        <DialogDescription>Pick a style, choose your stats, then save or share your personalized poster.</DialogDescription>

        <div className="edition-poster-frame">
          <canvas ref={canvasRef} width={W} height={H} className="edition-poster-canvas" />
          {busy && <div className="edition-poster-loading"><Loader2 className="animate-spin" /></div>}
        </div>

        <div className="edition-poster-controls">
          <div className="edition-poster-group">
            <span className="edition-eyebrow">COLOR THEME</span>
            <div className="edition-poster-themes">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeId(t.id)}
                  className={cn("edition-poster-theme", themeId === t.id && "is-active")}
                  aria-pressed={themeId === t.id}
                >
                  <span className="edition-poster-swatch" style={{ background: `linear-gradient(135deg, ${t.ring[0]}, ${t.ring[1]}, ${t.ring[2]})` }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="edition-poster-group">
            <span className="edition-eyebrow">LAYOUT</span>
            <div className="edition-poster-layouts">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLayoutId(l.id)}
                  className={cn("edition-poster-layout", layoutId === l.id && "is-active")}
                  aria-pressed={layoutId === l.id}
                >
                  <strong>{l.label}</strong>
                  <span>{l.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="edition-poster-group">
            <span className="edition-eyebrow">STATS ON THE POSTER · UP TO 4</span>
            <div className="edition-poster-stats">
              {STAT_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStat(s.id)}
                  className={cn("edition-poster-stat", selectedStats.includes(s.id) && "is-active")}
                  aria-pressed={selectedStats.includes(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="icon" aria-label="Regenerate" title="Regenerate" disabled={busy} onClick={() => void draw()}>
            <RefreshCw />
          </Button>
          <Button className="edition-primary flex-1" disabled={busy || !ready} onClick={share}><Share2 /> Share</Button>
          <Button variant="outline" className="flex-1" disabled={busy || !ready} onClick={download}><Download /> Save PNG</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
