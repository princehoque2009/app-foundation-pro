import { useRef, useState } from "react";
import { Download, Share2, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
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

  const draw = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setBusy(true);

    // Background: deep night with coral glow
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#16080d");
    bg.addColorStop(0.55, "#2a0f16");
    bg.addColorStop(1, "#0c060a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W / 2, 420, 60, W / 2, 420, 620);
    glow.addColorStop(0, "rgba(255,79,90,0.55)");
    glow.addColorStop(1, "rgba(255,79,90,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Confetti sparks
    const sparks: [number, number, number, string][] = [];
    let seed = 42;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const palette = ["#FF4F5A", "#FFB020", "#7CE7C4", "#ffffff"];
    for (let i = 0; i < 90; i++) sparks.push([rand() * W, rand() * H, 2 + rand() * 5, palette[i % 4]]);
    sparks.forEach(([x, y, r, c]) => { ctx.globalAlpha = 0.25 + rand() * 0.5; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;

    // Eyebrow
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFB9BE";
    ctx.font = "600 34px Inter, system-ui, sans-serif";
    ctx.fillText("P R A N G O N   v 2 . 0   ·   Y E A R   O N E", W / 2, 150);

    // Avatar ring
    const cx = W / 2, cy = 430, R = 190;
    const ring = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    ring.addColorStop(0, "#FF4F5A");
    ring.addColorStop(0.5, "#FFB020");
    ring.addColorStop(1, "#7CE7C4");
    ctx.strokeStyle = ring;
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    const avatar = avatarUrl ? await loadImage(avatarUrl) : null;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R - 16, 0, Math.PI * 2); ctx.clip();
    if (avatar) {
      const s = Math.min(avatar.width, avatar.height);
      ctx.drawImage(avatar, (avatar.width - s) / 2, (avatar.height - s) / 2, s, s, cx - R + 16, cy - R + 16, (R - 16) * 2, (R - 16) * 2);
    } else {
      ctx.fillStyle = "#3a1620";
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.fillStyle = "#FF8A92";
      ctx.font = "700 150px Inter, system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText((name || "P").charAt(0).toUpperCase(), cx, cy + 8);
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();

    // Name + handle
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 84px Inter, system-ui, sans-serif";
    ctx.fillText(name || "Prangon member", W / 2, 740);
    ctx.fillStyle = "#FF8A92";
    ctx.font = "500 40px Inter, system-ui, sans-serif";
    ctx.fillText(`@${username}`, W / 2, 800);

    // Stat cards
    const items: [string, string][] = [
      [String(stats?.posts ?? 0), "POSTS"],
      [String(stats?.reels ?? 0), "REELS"],
      [String(stats?.likes ?? 0), "LIKES"],
      [String(collectibles), "AWARDS"],
    ];
    const cw = 220, ch = 170, gap = 24, x0 = (W - (cw * 4 + gap * 3)) / 2, y0 = 870;
    items.forEach(([value, label], i) => {
      const x = x0 + i * (cw + gap);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      roundRect(ctx, x, y0, cw, ch, 28);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 2;
      roundRect(ctx, x, y0, cw, ch, 28);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 56px Inter, system-ui, sans-serif";
      ctx.fillText(value, x + cw / 2, y0 + 78);
      ctx.fillStyle = "#c9a3a9";
      ctx.font = "600 24px Inter, system-ui, sans-serif";
      ctx.fillText(label, x + cw / 2, y0 + 128);
    });

    // Footer
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px Inter, system-ui, sans-serif";
    ctx.fillText("One year. All of us.", W / 2, 1150);
    ctx.fillStyle = "#8d6b72";
    ctx.font = "500 30px Inter, system-ui, sans-serif";
    ctx.fillText("OCTOBER 2026 · THE ANNIVERSARY EDITION", W / 2, 1210);

    setBusy(false);
    setReady(true);
  };

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
        <DialogDescription>A personalized poster of your year one — save it or share it with the world.</DialogDescription>
        <div className="edition-poster-frame">
          <canvas ref={canvasRef} width={W} height={H} className="edition-poster-canvas" />
          {!ready && (
            <div className="edition-poster-placeholder">
              <ImageIcon />
              <span>Your poster preview appears here</span>
            </div>
          )}
        </div>
        {!ready ? (
          <Button className="edition-primary w-full" disabled={busy} onClick={draw}>
            {busy ? <Loader2 className="animate-spin" /> : <ImageIcon />} Generate my photocard
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button className="edition-primary flex-1" onClick={share}><Share2 /> Share</Button>
            <Button variant="outline" className="flex-1" onClick={download}><Download /> Save PNG</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
