import { test, expect } from "bun:test";
import { eventIsActive, canEarnCollectible, canOpenCapsule, EVENT_START, EVENT_END, CAPSULE_OPEN } from "./anniversaryRules";
test("edition lasts the whole month of October and ends exclusively", () => {
  expect(EVENT_END - EVENT_START).toBe(31 * 86400000);
  expect(eventIsActive(EVENT_START - 1)).toBe(false);
  expect(eventIsActive(EVENT_START)).toBe(true);
  expect(eventIsActive(EVENT_END)).toBe(false);
});
test("founding award requires joining before the anniversary month", () => {
  expect(canEarnCollectible("founding", EVENT_START - 1, 0, EVENT_START)).toBe(true);
  expect(canEarnCollectible("founding", EVENT_START, 0, EVENT_START)).toBe(false);
});
test("star is available during the event only", () => {
  expect(canEarnCollectible("star", EVENT_START, 0, EVENT_START)).toBe(true);
  expect(canEarnCollectible("star", EVENT_START, 0, EVENT_END)).toBe(false);
});
test("pioneer requires a recorded year-one creation", () => {
  expect(canEarnCollectible("pioneer", EVENT_START - 1, 1, EVENT_START)).toBe(true);
  expect(canEarnCollectible("pioneer", EVENT_START - 1, 0, EVENT_START)).toBe(false);
});
test("capsule opens on next anniversary, never before", () => {
  expect(canOpenCapsule(CAPSULE_OPEN - 1)).toBe(false);
  expect(canOpenCapsule(CAPSULE_OPEN)).toBe(true);
});
