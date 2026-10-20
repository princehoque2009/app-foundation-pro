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
  const color = (role: string) => {
    const value = css.getPropertyValue(`--edition-recap-${role}`).trim();
    if (!value) throw new Error("Recap colors could not load. Please reload and try again.");
    return value;
  };
  const ink = color("ink"), middle = color("middle"), bottom = color("bottom");
  const paper = color("paper"), silver = color("silver"), mint = color("mint"), gold = color("gold");
  const card = color("card"), border = color("border");
  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  background.addColorStop(0, ink); background.addColorStop(.5, middle); background.addColorStop(1, bottom);
  ctx.fillStyle = background; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (const [x, y, radius, tone, opacity] of [[170, 300, 760, mint, .2], [960, 1560, 820, gold, .16]] as const) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, tone); glow.addColorStop(1, "transparent");
    ctx.globalAlpha = opacity; ctx.fillStyle = glow; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  let seed = 2026;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 120; i++) {
    ctx.globalAlpha = .1 + random() * .3;
    ctx.fillStyle = [mint, gold, paper][i % 3];
    ctx.beginPath(); ctx.arc(random() * WIDTH, random() * HEIGHT, 1 + random() * 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  const text = (value: string, x: number, y: number, size: number, tone: string, width = 920, weight = 600, minimum = size) => {
    ctx.fillStyle = tone;
    ctx.fillText(fitText(ctx, value, size, width, weight, minimum), x, y);
  };
  const label = (value: string, x: number, y: number, size: number, tone: string, width = 920) => {
    ctx.letterSpacing = "3px";
    text(value, x, y, size, tone, width);
    ctx.letterSpacing = "0px";
  };
  const drawCard = (x: number, y: number, width: number, height: number) => {
    ctx.beginPath(); ctx.roundRect(x, y, width, height, 30);
    ctx.fillStyle = card; ctx.fill(); ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke();
  };
  label("PRANGON · YEAR ONE", 540, 132, 28, silver);
  text("MY YEAR ONE", 540, 260, 104, paper, 920, 800, 72);
  label("PRANGON WRAPPED · 2026", 540, 318, 34, mint);
  const ring = ctx.createLinearGradient(372, 352, 708, 688);
  ring.addColorStop(0, gold); ring.addColorStop(.5, mint); ring.addColorStop(1, silver);
  ctx.beginPath(); ctx.arc(540, 520, 168, 0, Math.PI * 2);
  ctx.strokeStyle = ring; ctx.lineWidth = 12; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(540, 520, 156, 0, Math.PI * 2); ctx.clip();
  if (avatar) cover(ctx, avatar, 384, 364, 312);
  else {
    ctx.fillStyle = card; ctx.fillRect(372, 352, 336, 336);
    ctx.textBaseline = "middle";
    text(Array.from(profile?.display_name?.trim() || profile?.username || "P")[0].toUpperCase(), 540, 526, 132, mint, 260, 700);
  }
  ctx.restore();
  text(profile?.display_name?.trim() || "Prangon member", 540, 782, 68, paper, 900, 800, 48);
  text(`@${profile?.username || "member"}`, 540, 842, 34, mint, 900);
  const cells = [["Posts", stats.posts], ["Reels", stats.reels], ["Stories", stats.stories], ["Likes", stats.likes], ["Comments", stats.comments], ["Views", stats.views]] as const;
  cells.forEach(([name, value], i) => {
    const x = 80 + (i % 3) * 314, y = 906 + Math.floor(i / 3) * 216;
    drawCard(x, y, 292, 192);
    text(value.toLocaleString(), x + 146, y + 95, 76, paper, 252, 800, 32);
    label(name.toUpperCase(), x + 146, y + 150, 24, silver, 252);
  });
  if (stats.top_post) {
    label("MOST-LOVED POST", 540, 1380, 24, silver);
    drawCard(80, 1410, 920, 210);
    ctx.save(); ctx.beginPath(); ctx.roundRect(110, 1440, 150, 150, 18); ctx.clip();
    if (thumbnail) cover(ctx, thumbnail, 110, 1440, 150);
    else { ctx.fillStyle = card; ctx.fillRect(110, 1440, 150, 150); text("P", 185, 1535, 64, mint, 120, 800); }
    ctx.restore(); ctx.textAlign = "left";
    text(stats.top_post.caption?.trim() || "A moment worth revisiting", 292, 1488, 30, paper, 670);
    text(`${stats.top_post.likes.toLocaleString()} likes`, 292, 1552, 34, mint, 670, 700, 26);
    ctx.textAlign = "center";
  }
  text("One year. All of us.", 540, 1740, 48, paper, 920, 800);
  label("OCTOBER 17, 2025 — OCTOBER 16, 2026", 540, 1804, 26, silver);
  label("PRANGON / YEAR ONE", 540, 1860, 22, mint);
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