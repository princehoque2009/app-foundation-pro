import { EVENT_START, EVENT_END, eventIsActive } from "./anniversaryRules";
// PRANGON v2.0 — 7-Day Anniversary Edition feature flag.
// Reversible: when the event window ends, isAnniversaryActive() returns false
// and the original UI restores automatically — no deployment, no data changes.

export const ANNIVERSARY_START = EVENT_START;
export const ANNIVERSARY_END = EVENT_END;
export const ANNIVERSARY_EDITION = "v2.0-anniversary";

const DISMISS_KEY = `anniversary-modal-dismissed-${ANNIVERSARY_EDITION}`;

export const isAnniversaryActive = (): boolean => {
  const now = Date.now();
  return eventIsActive(now);
};

export const anniversaryTimeLeft = (): { days: number; hours: number } => {
  const ms = Math.max(0, ANNIVERSARY_END - Date.now());
  return { days: Math.floor(ms / 86400000), hours: Math.floor((ms % 86400000) / 3600000) };
};

export const isAnniversaryModalDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

export const dismissAnniversaryModal = (): void => {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode */
  }
};
