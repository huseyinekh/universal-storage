import type { EncryptionPayload } from "../core/types";
import { base64ToBytes } from "./base64";
import { getKeyAndSalt } from "./key";

const subtle = (): SubtleCrypto | null => {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  return c?.subtle ?? null;
};

const decoder = new TextDecoder();

export const isEncryptionPayload = (v: unknown): v is EncryptionPayload => {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return r.__type === "encrypted" && r.v === 1 && typeof r.iv === "string" && typeof r.data === "string" && typeof r.salt === "string";
};

export const decryptValue = async <T>(payload: EncryptionPayload, secret: string): Promise<T | null> => {
  const s = subtle();
  if (!s) return null;

  const iv = base64ToBytes(payload.iv);
  const data = base64ToBytes(payload.data);
  if (!iv || !data) return null;

  // salt is included in payload for validation/corruption detection, but is derived from secret.
  const ks = await getKeyAndSalt(secret);
  if (!ks) return null;
  if (payload.salt !== ks.saltB64) return null;

  try {
    const plaintext = await s.decrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      ks.key,
      data as unknown as BufferSource,
    );
    const text = decoder.decode(plaintext);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};
