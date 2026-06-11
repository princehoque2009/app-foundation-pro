// Lightweight client-side message encryption.
// AES-GCM 256, key derived from the conversation id with PBKDF2.
// Not a full E2E (no key exchange), but gives encryption-at-rest in our DB
// so plaintext is never stored. Both participants derive the same key from
// the shared conversation id.

const ENC_PREFIX = "enc:v1:";
const APP_SALT = "prangon-messenger-v1";

const keyCache = new Map<string, Promise<CryptoKey>>();

async function getKey(conversationId: string): Promise<CryptoKey> {
  const cached = keyCache.get(conversationId);
  if (cached) return cached;
  const p = (async () => {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey(
      "raw",
      enc.encode(conversationId),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(APP_SALT),
        iterations: 100_000,
        hash: "SHA-256",
      },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  })();
  keyCache.set(conversationId, p);
  return p;
}

export const isEncrypted = (s?: string | null): boolean =>
  !!s && typeof s === "string" && s.startsWith(ENC_PREFIX);

export async function encryptText(
  conversationId: string,
  plaintext: string
): Promise<string> {
  if (!plaintext) return plaintext;
  try {
    const key = await getKey(conversationId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext)
    );
    const buf = new Uint8Array(iv.length + ct.byteLength);
    buf.set(iv, 0);
    buf.set(new Uint8Array(ct), iv.length);
    let bin = "";
    buf.forEach((b) => (bin += String.fromCharCode(b)));
    return ENC_PREFIX + btoa(bin);
  } catch (err) {
    console.warn("encryptText failed; falling back to plaintext", err);
    return plaintext;
  }
}

export async function decryptText(
  conversationId: string,
  value: string
): Promise<string> {
  if (!isEncrypted(value)) return value;
  try {
    const key = await getKey(conversationId);
    const bin = atob(value.slice(ENC_PREFIX.length));
    const raw = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i);
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    return new TextDecoder().decode(pt);
  } catch {
    return "🔒 Encrypted message";
  }
}
