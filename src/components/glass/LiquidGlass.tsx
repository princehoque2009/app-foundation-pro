import { useCallback, useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * iOS 27 "Liquid Glass" primitives — Prangon v2.0
 * Reusable translucent-surface components shared by the whole app.
 * All colors come from semantic tokens in src/index.css (no hardcoded colors).
 */

/* ------------------------------------------------------------------ */
/* LiquidGlassCard — translucent container with refractive glare       */
/* ------------------------------------------------------------------ */
export const LiquidGlassCard = ({
  children,
  className,
  glare = true,
  focusable = false,
  onClick,
  style,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  glare?: boolean;
  focusable?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "style">) => (
  <div
    className={cn("lg-glass lg-sheen overflow-hidden rounded-2xl", glare && "lg-glare", className)}
    style={style}
    onClick={onClick}
    tabIndex={focusable ? 0 : undefined}
    role={focusable ? "button" : undefined}
    {...rest}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* LiquidInput — translucent field with liquid focus bloom             */
/* ------------------------------------------------------------------ */
export const LiquidInput = ({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "lg-field liquid-input w-full rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground",
      className
    )}
    {...rest}
  />
);

/* ------------------------------------------------------------------ */
/* LiquidButton — press surface with radial ripple from tap point      */
/* ------------------------------------------------------------------ */
export const LiquidButton = ({
  children,
  className,
  onClick,
  variant = "glass",
  type = "button",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "glass" | "primary";
  type?: "button" | "submit";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) => {
  const ripple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const span = document.createElement("span");
    const size = Math.max(rect.width, rect.height) * 2;
    span.className = "liquid-ripple";
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${e.clientX - rect.left - size / 2}px`;
    span.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(span);
    window.setTimeout(() => span.remove(), 700);
    onClick?.(e);
  };
  return (
    <button
      type={type}
      onClick={ripple}
      className={cn("liquid-btn relative overflow-hidden", variant === "primary" ? "liquid-btn-primary" : "lg-glass lg-glare", className)}
      {...rest}
    >
      {children}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Photocard3DViewer — gyro / cursor parallax tilt container           */
/* ------------------------------------------------------------------ */
export const Photocard3DViewer = ({
  children,
  className,
  maxTilt = 10,
  style,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  style?: CSSProperties;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const applyTilt = useCallback((px: number, py: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", `${px.toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${py.toFixed(2)}deg`);
  }, []);

  const handleMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        applyTilt(-ny * maxTilt * 2, nx * maxTilt * 2);
        el.style.setProperty("--foil-x", `${(nx * 100 + 50).toFixed(1)}%`);
        el.style.setProperty("--foil-y", `${(ny * 100 + 50).toFixed(1)}%`);
      });
    },
    [applyTilt, maxTilt]
  );

  const reset = useCallback(() => {
    cancelAnimationFrame(raf.current);
    applyTilt(0, 0);
    ref.current?.style.setProperty("--foil-x", "50%");
    ref.current?.style.setProperty("--foil-y", "50%");
  }, [applyTilt]);

  useEffect(() => {
    // Device orientation tilt for phones (no permission gate needed for rotation-only events)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const gx = Math.max(-1, Math.min(1, e.gamma / 45));
      const gy = Math.max(-1, Math.min(1, (e.beta - 40) / 45));
      applyTilt(gy * maxTilt, gx * maxTilt);
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      cancelAnimationFrame(raf.current);
    };
  }, [applyTilt, maxTilt]);

  return (
    <div
      ref={ref}
      className={cn("tilt3d", className)}
      style={style}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerDown={handleMove}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* GlassShatterParticle — glass-fragment burst on unlock               */
/* ------------------------------------------------------------------ */
interface Fragment {
  x: number; y: number; vx: number; vy: number; size: number; rot: number; vr: number; life: number; hue: number;
}

export const GlassShatterParticle = ({
  trigger,
  className,
}: {
  /** Bump this value (e.g. a counter) to fire a burst */
  trigger: number;
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // motion-free: the CSS unlock reveal is enough
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;
    const coral = getComputedStyle(canvas).getPropertyValue("--primary").trim() || "355 100% 65%";
    const fragments: Fragment[] = [];
    for (let i = 0; i < 34; i++) {
      const angle = (Math.PI * 2 * i) / 34 + Math.random() * 0.5;
      const speed = 2.2 + Math.random() * 3.4;
      fragments.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 5 + Math.random() * 11,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1,
        hue: Math.random(),
      });
    }

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      let alive = false;
      for (const f of fragments) {
        f.vy += 0.12; // gravity
        f.x += f.vx; f.y += f.vy;
        f.rot += f.vr;
        f.life -= 0.022;
        if (f.life <= 0) continue;
        alive = true;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.globalAlpha = Math.max(0, f.life);
        const light = f.hue > 0.6;
        ctx.fillStyle = light
          ? `hsl(${coral} / ${0.85 * f.life})`
          : `hsl(0 0% 100% / ${0.75 * f.life})`;
        // irregular glass shard
        ctx.beginPath();
        ctx.moveTo(-f.size * 0.5, -f.size * 0.3);
        ctx.lineTo(f.size * 0.6, -f.size * 0.45);
        ctx.lineTo(f.size * 0.45, f.size * 0.5);
        ctx.lineTo(-f.size * 0.4, f.size * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `hsl(0 0% 100% / ${0.5 * f.life})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      if (alive) rafRef.current = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, width, height);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("shatter-canvas pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
};
