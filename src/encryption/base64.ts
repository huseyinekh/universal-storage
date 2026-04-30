const hasBtoa = (): boolean => typeof btoa === "function" && typeof atob === "function";

export const bytesToBase64 = (bytes: Uint8Array): string => {
  if (hasBtoa()) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    return btoa(binary);
  }

  // Node fallback (used in tests)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  return "";
};

export const base64ToBytes = (b64: string): Uint8Array | null => {
  try {
    if (hasBtoa()) {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
    return null;
  } catch {
    return null;
  }
};

