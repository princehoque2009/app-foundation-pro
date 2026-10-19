export const YEAR_ONE_START = Date.parse("2025-10-17T00:00:00Z");
export const EVENT_START = Date.parse("2026-10-01T00:00:00Z");
export const EVENT_END = Date.parse("2026-11-01T00:00:00Z");
export const CAPSULE_OPEN = Date.parse("2027-10-17T00:00:00Z");
export type CollectibleId = "founding" | "star" | "pioneer";
export const eventIsActive = (now: number) => now >= EVENT_START && now < EVENT_END;
export const canEarnCollectible = (badge: CollectibleId, joined: number, yearOneCreations: number, now: number) =>
  eventIsActive(now) && (badge === "star" || (badge === "founding" ? joined < EVENT_START : yearOneCreations > 0));
export const canOpenCapsule = (now: number) => now >= CAPSULE_OPEN;
