import { useCallback, useEffect, useState } from "react";

export interface ProfileGridPrefs {
  columns: 2 | 3 | 4;
  gap: "none" | "sm" | "md";
  shape: "square" | "portrait";
  rounded: boolean;
  showStats: boolean;
}

export const DEFAULT_GRID_PREFS: ProfileGridPrefs = {
  columns: 3,
  gap: "none",
  shape: "square",
  rounded: false,
  showStats: true,
};

const KEY = "prangon:profile-grid-prefs";

export const useProfileGridPrefs = () => {
  const [prefs, setPrefs] = useState<ProfileGridPrefs>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULT_GRID_PREFS, ...JSON.parse(raw) } : DEFAULT_GRID_PREFS;
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
