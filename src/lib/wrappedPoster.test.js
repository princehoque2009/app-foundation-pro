import { afterEach, expect, test } from "bun:test";
import { renderWrappedPoster, shareWrappedPoster } from "./wrappedPoster";

const stats = { posts: 4, reels: 2, stories: 7, likes: 11, comments: 8, views: 900, joined_at: "2025-10-17", top_post: null };
const originals = new Map();
function install(name, value) {
  if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, value });
}
afterEach(() => {
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
  originals.clear();
});

function environment() {
  let downloads = 0;
  const context = new Proxy({}, { get(target, key) {
    if (key in target) return target[key];
    if (key === "measureText") return value => ({ width: value.length * 10 });
    if (key === "createLinearGradient" || key === "createRadialGradient") return () => ({ addColorStop() {} });
    return () => {};
  } });
  const canvas = { getContext: () => context, toBlob: callback => callback(new Blob(["canvas"], { type: "image/png" })) };
  install("document", {
    documentElement: {}, fonts: { ready: Promise.resolve() }, body: { appendChild() {} },
    createElement: name => name === "canvas" ? canvas : { click() { downloads++; }, remove() {} },
  });
  install("getComputedStyle", () => ({ getPropertyValue: () => "#151f1d" }));
  install("window", { setTimeout: () => 1 });
  return { canvas, downloads: () => downloads };
}

test("Wrapped exports a 1080 by 1920 canvas", async () => {
  environment();
  const canvas = await renderWrappedPoster(stats, null);
  expect(canvas.width).toBe(1080);
  expect(canvas.height).toBe(1920);
});

test("unsupported file sharing downloads the recap", async () => {
  const env = environment();
  install("navigator", { canShare: () => false });
  expect(await shareWrappedPoster(stats, null)).toBe("downloaded");
  expect(env.downloads()).toBe(1);
});

test("supported file sharing sends a PNG without downloading", async () => {
  const env = environment();
  let received;
  install("navigator", { canShare: () => true, share: async value => { received = value.files[0]; } });
  expect(await shareWrappedPoster(stats, null)).toBe("shared");
  expect(received.type).toBe("image/png");
  expect(received.name).toBe("prangon-wrapped-2026.png");
  expect(env.downloads()).toBe(0);
});

test("canceling native sharing does not start an unwanted download", async () => {
  const env = environment();
  install("navigator", { canShare: () => true, share: async () => { throw new DOMException("Canceled", "AbortError"); } });
  await expect(shareWrappedPoster(stats, null)).rejects.toMatchObject({ name: "AbortError" });
  expect(env.downloads()).toBe(0);
});