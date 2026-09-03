import { useCallback, useEffect, useState } from "react";

export type GridLayout = "grid" | "masonry";
export type GridShape = "square" | "portrait" | "landscape" | "auto";
export type GridGap = "none" | "xs" | "sm" | "md" | "lg";
export type GridRadius = "none" | "sm" | "md" | "lg";
export type GridOverlay = "hover" | "always" | "never";

export interface ProfileGridPrefs {
  layout: GridLayout;
  columns: 2 | 3 | 4 | 5;
  gap: GridGap;
  shape: GridShape;
  radius: GridRadius;
  overlay: GridOverlay;
  showStats: boolean;
  showCaption: boolean;
  showTypeIcon: boolean;
  pinnedFirst: boolean;
  /** Legacy key kept for backwards compatibility with stored prefs. */
  rounded?: boolean;
}

export const DEFAULT_GRID_PREFS: ProfileGridPrefs = {
  layout: "grid",
  columns: 3,
  gap: "none",
  shape: "square",
  radius: "none",
  overlay: "hover",
  showStats: true,
  showCaption: false,
  showTypeIcon: true,
  pinnedFirst: true,
};

const KEY = "prangon:profile-grid-prefs";

const migrate = (raw: Partial<ProfileGridPrefs>): ProfileGridPrefs => {
  const next: ProfileGridPrefs = { ...DEFAULT_GRID_PREFS, ...raw };
  // Old prefs stored `rounded: boolean` instead of `radius`
  if (raw.radius === undefined && typeof raw.rounded === "boolean") {
    next.radius = raw.rounded ? "lg" : "none";
  }
  delete next.rounded;
  return next;
};

export const useProfileGridPrefs = () => {
  const [prefs, setPrefs] = useState<ProfileGridPrefs>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? migrate(JSON.parse(raw)) : DEFAULT_GRID_PREFS;
    } catch {
      return DEFAULT_GRID_PREFS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const update = useCallback(<K extends keyof ProfileGridPrefs>(key: K, value: ProfileGridPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  const reset = useCallback(() => setPrefs(DEFAULT_GRID_PREFS), []);

  return { prefs, update, reset };
};
