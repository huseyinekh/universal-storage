import type { EncryptionPayload } from "../core/types";
import { bytesToBase64 } from "./base64";
import { getIv, getKeyAndSalt } from "./key";

const subtle = (): SubtleCrypto | null => {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  return c?.subtle ?? null;
};

const encoder = new TextEncoder();

const safeJsonStringify = (value: unknown): string | null => {
  try {
    const s = JSON.stringify(value);
    return s === undefined ? "null" : s;
  } catch {
    return null;
  }
};

export const encryptValue = async (value: unknown, secret: string): Promise<EncryptionPayload | null> => {
  const s = subtle();
  if (!s) return null;

  const iv = getIv();
  if (!iv) return null;

  const json = safeJsonStringify(value);
  if (json === null) return null;

  const ks = await getKeyAndSalt(secret);
  if (!ks) return null;

  try {
    const ciphertext = await s.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      ks.key,
      encoder.encode(json) as unknown as BufferSource,
    );
    return {
      __type: "encrypted",
      v: 1,
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(ciphertext)),
      salt: ks.saltB64,
    };
  } catch {
    return null;
  }
};
