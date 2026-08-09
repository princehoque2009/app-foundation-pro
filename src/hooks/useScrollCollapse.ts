import { useSyncExternalStore, useEffect } from "react";

/**
 * Single shared scroll-state store so the top header and bottom nav
 * collapse/expand in perfect sync (one listener, not several).
 */

type State = { collapsed: boolean; intensity: number };

let state: State = { collapsed: false, intensity: 0 };
const listeners = new Set<() => void>();
let attached = false;
let lastY = 0;
let ticking = false;
let forced: boolean | null = null;

const COLLAPSE_AT = 22;

const emit = () => listeners.forEach((l) => l());

const setState = (next: State) => {
  if (next.collapsed === state.collapsed && next.intensity === state.intensity) return;
  state = next;
  document.documentElement.style.setProperty("--lg-intensity", String(next.intensity));
  emit();
};

const compute = () => {
  ticking = false;
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  const intensity = Math.min(1, y / 120);
  let collapsed = state.collapsed;
  if (forced !== null) {
    collapsed = forced;
  } else if (y <= COLLAPSE_AT) {
    collapsed = false;
  } else if (y > lastY + 4) {
    collapsed = true;
  } else if (y < lastY - 4) {
    collapsed = false;
  }
  lastY = y;
  setState({ collapsed, intensity: Math.round(intensity * 100) / 100 });
};

const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(compute);
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  if (!attached) {
    attached = true;
    lastY = window.scrollY || 0;
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      window.removeEventListener("scroll", onScroll);
      attached = false;
    }
  };
};

const getSnapshot = () => state;
const getServerSnapshot = () => state;

export const useScrollCollapse = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/** Force the bars into a fixed collapsed state (used by Reels). */
export const useForceCollapsed = (value: boolean | null) => {
  useEffect(() => {
    if (value === null) return;
    forced = value;
    setState({ ...state, collapsed: value });
    return () => {
      forced = null;
      compute();
    };
  }, [value]);
};

export const usePrefersReducedMotion = () => {
  const sub = (cb: () => void) => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
  return useSyncExternalStore(
    sub,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
};

export const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
