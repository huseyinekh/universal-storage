import { isBrowser } from "../utils/env";
import { bytesToBase64 } from "./base64";

type KeyAndSalt = { key: CryptoKey; saltB64: string };

const subtle = (): SubtleCrypto | null => {
  if (!isBrowser()) return null;
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!c || !c.subtle) return null;
  return c.subtle;
};

const getRandomValues = (): Crypto["getRandomValues"] | null => {
  if (!isBrowser()) return null;
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!c || typeof c.getRandomValues !== "function") return null;
  return c.getRandomValues.bind(c);
};

const textEncoder = new TextEncoder();

const cache = new Map<string, Promise<KeyAndSalt | null>>();

const deriveSalt = async (secret: string): Promise<Uint8Array | null> => {
  const s = subtle();
  if (!s) return null;
  try {
    const digest = await s.digest("SHA-256", textEncoder.encode(`web-universal-storage:${secret}`));
    // Use first 16 bytes as salt (deterministic)
    return new Uint8Array(digest).slice(0, 16);
  } catch {
    return null;
  }
};

export const getKeyAndSalt = (secret: string): Promise<KeyAndSalt | null> => {
  const existing = cache.get(secret);
  if (existing) return existing;

  const p = (async (): Promise<KeyAndSalt | null> => {
    const s = subtle();
    if (!s) return null;

    const saltBytes = await deriveSalt(secret);
    if (!saltBytes) return null;

    try {
      const baseKey = await s.importKey("raw", textEncoder.encode(secret), "PBKDF2", false, ["deriveKey"]);
      const key = await s.deriveKey(
        {
          name: "PBKDF2",
          salt: saltBytes as unknown as BufferSource,
          iterations: 100_000,
          hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
      return { key, saltB64: bytesToBase64(saltBytes) };
    } catch {
      return null;
    }
  })();

  cache.set(secret, p);
  return p;
};

export const getIv = (): Uint8Array | null => {
  const rnd = getRandomValues();
  if (!rnd) return null;
  const iv = new Uint8Array(12);
  rnd(iv);
  return iv;
};
