import type { Wrapped } from "@/hooks/useAnniversary";

type PosterProfile = { display_name?: string | null; username?: string | null; avatar_url?: string | null } | null | undefined;
const WIDTH = 1080;
const HEIGHT = 1920;
const FILENAME = "prangon-wrapped-2026.png";

function loadImage(url: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise(resolve => {
    const image = new Image();
    const timer = window.setTimeout(() => { image.src = ""; resolve(null); }, 8000);
    const finish = (result: HTMLImageElement | null) => { window.clearTimeout(timer); resolve(result); };
    image.crossOrigin = "anonymous";
    image.onload = () => finish(image.naturalWidth ? image : null);
    image.onerror = () => finish(null);
    image.src = url;
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, size: number, width: number, weight = 600, minimum = size) {
  let fittedSize = size;
  const font = () => { ctx.font = `${weight} ${fittedSize}px Inter, system-ui, sans-serif`; };
  font();
  while (ctx.measureText(text).width > width && fittedSize > minimum) { fittedSize -= 1; font(); }
  const chars = Array.from(text.replace(/\s+/g, " "));
  if (ctx.measureText(chars.join("")).width <= width) return chars.join("");
  while (chars.length && ctx.measureText(`${chars.join("")}…`).width > width) chars.pop();
  return `${chars.join("")}…`;
}

function cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, size: number) {
  const crop = Math.min(image.naturalWidth, image.naturalHeight);
  ctx.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, x, y, size, size);
}

/** Resolves to an offscreen canvas after optional profile/post images load. */
export async function renderWrappedPoster(stats: Wrapped, profile: PosterProfile): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create the recap image.");
  const [avatar, thumbnail] = await Promise.all([loadImage(profile?.avatar_url), loadImage(stats.top_post?.media_url)]);
  await document.fonts?.ready;
  const css = getComputedStyle(document.documentElement);
  const color = (role: string, opacity = 1) => {
    const value = css.getPropertyValue(`--edition-${role}`).trim();
    if (!value) throw new Error("Recap colors could not load. Please reload and try again.");
    return `hsl(${value} / ${opacity})`;
  };
  const ink = color("ink"), paper = color("paper");
  const muted = color("ink", .64), mint = color("mint", .55), gold = color("gold", .45);
  const card = color("paper", .86), border = color("ink", .09);
  // Build the quiet, light base first. All tones come from the anniversary
  // tokens, not the legacy dark recap palette or the user's current theme.
  ctx.fillStyle = paper; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, color("mint", .19));
  background.addColorStop(.55, color("paper", .15));
  background.addColorStop(1, color("gold", .055));
  ctx.fillStyle = background; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // An oversized, feathered wash has no visible circular boundary.
  const wash = ctx.createRadialGradient(WIDTH, HEIGHT, 0, WIDTH, HEIGHT, HEIGHT);
  wash.addColorStop(0, color("gold", .035));
  wash.addColorStop(1, color("gold", 0));
  ctx.fillStyle = wash; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  let seed = 2026;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  ctx.fillStyle = ink;
  for (let i = 0; i < 38000; i++) {
    ctx.globalAlpha = .008 + random() * .012;
    ctx.fillRect(Math.floor(random() * WIDTH), Math.floor(random() * HEIGHT), 1, 1);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  const text = (value: string, x: number, y: number, size: number, tone: string, width = 920, weight = 600, minimum = size) => {
    ctx.fillStyle = tone;
    ctx.fillText(fitText(ctx, value, size, width, weight, minimum), x, y);
  };
  const label = (value: string, x: number, y: number, size: number, tone: string, width = 920) => {
    // Tracking is included in measurement, so long labels still fit.
    ctx.letterSpacing = "0px";
    text(value, x, y, size, tone, width);
    ctx.letterSpacing = "0px";
  };
  const drawCard = (x: number, y: number, width: number, height: number) => {
    ctx.save();
    ctx.shadowColor = color("ink", .045); ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.beginPath(); ctx.roundRect(x, y, width, height, 8);
    ctx.fillStyle = card; ctx.fill();
    ctx.shadowColor = color("ink", 0);
    ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  };
  label("PRANGON · YEAR ONE", 540, 132, 28, muted);
  text("MY YEAR ONE", 540, 260, 104, ink, 920, 800, 72);
  label("PRANGON WRAPPED · 2026", 540, 318, 34, muted);
  const ring = ctx.createLinearGradient(372, 352, 708, 688);
  ring.addColorStop(0, gold); ring.addColorStop(1, mint);
  ctx.beginPath(); ctx.arc(540, 520, 168, 0, Math.PI * 2);
  ctx.strokeStyle = ring; ctx.lineWidth = 5; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(540, 520, 156, 0, Math.PI * 2); ctx.clip();
  if (avatar) cover(ctx, avatar, 384, 364, 312);
  else {
    ctx.fillStyle = card; ctx.fillRect(372, 352, 336, 336);
    ctx.textBaseline = "middle";
    text(Array.from(profile?.display_name?.trim() || profile?.username || "P")[0].toUpperCase(), 540, 526, 132, ink, 260, 700);
  }
  ctx.restore();
  text(profile?.display_name?.trim() || "Prangon member", 540, 782, 68, ink, 900, 800, 48);
  text(`@${profile?.username || "member"}`, 540, 842, 34, muted, 900);
  const cells = [["Posts", stats.posts], ["Reels", stats.reels], ["Stories", stats.stories], ["Likes", stats.likes], ["Comments", stats.comments], ["Views", stats.views]] as const;
  cells.forEach(([name, value], i) => {
    const x = 80 + (i % 3) * 314, y = 906 + Math.floor(i / 3) * 216;
    drawCard(x, y, 292, 192);
    text(value.toLocaleString(), x + 146, y + 95, 76, ink, 252, 800, 32);
    label(name.toUpperCase(), x + 146, y + 150, 24, muted, 252);
  });
  if (stats.top_post) {
    label("MOST-LOVED POST", 540, 1380, 24, muted);
    drawCard(80, 1410, 920, 210);
    ctx.save(); ctx.beginPath(); ctx.roundRect(110, 1440, 150, 150, 8); ctx.clip();
    if (thumbnail) cover(ctx, thumbnail, 110, 1440, 150);
    else { ctx.fillStyle = card; ctx.fillRect(110, 1440, 150, 150); text("P", 185, 1535, 64, ink, 120, 800); }
    ctx.restore(); ctx.textAlign = "left";
    text(stats.top_post.caption?.trim() || "A moment worth revisiting", 292, 1488, 30, ink, 670);
    text(`${stats.top_post.likes.toLocaleString()} likes`, 292, 1552, 34, muted, 670, 700, 26);
    ctx.textAlign = "center";
  }
  text("One year. All of us.", 540, 1740, 48, ink, 920, 800);
  label("OCTOBER 17, 2025 — OCTOBER 16, 2026", 540, 1804, 26, muted);
  label("PRANGON / YEAR ONE", 540, 1860, 22, muted);
  return canvas;
}

async function posterBlob(stats: Wrapped, profile: PosterProfile) {
  const canvas = await renderWrappedPoster(stats, profile);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob); else reject(new Error("The recap image could not be saved. Please try again."));
  }, "image/png"));
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = FILENAME;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadWrappedPoster(stats: Wrapped, profile: PosterProfile): Promise<void> {
  downloadBlob(await posterBlob(stats, profile));
}

export async function shareWrappedPoster(stats: Wrapped, profile: PosterProfile): Promise<"shared" | "downloaded"> {
  const blob = await posterBlob(stats, profile);
  const file = new File([blob], FILENAME, { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My Prangon Wrapped · 2026" });
      return "shared";
    } catch (error) {
      if (!(error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "NotSupportedError"))) throw error;
    }
  }
  downloadBlob(blob);
  return "downloaded";
}