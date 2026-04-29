import type { MemoryStorage } from "../core/memoryStorage";
import type { CookieOptions, StorageChangeEvent } from "../core/types";
import { hasCookies } from "../utils/env";
import { deserialize, serialize } from "../utils/serialize";

const computeExpires = (opts: CookieOptions | undefined): Date | undefined => {
  if (!opts) return undefined;
  if (typeof opts.ttlMs === "number" && Number.isFinite(opts.ttlMs) && opts.ttlMs > 0) {
    return new Date(Date.now() + opts.ttlMs);
  }
  if (typeof opts.expires === "number" && Number.isFinite(opts.expires)) {
    const days = opts.expires;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  if (opts.expires instanceof Date) return opts.expires;
  return undefined;
};

const normalizeSameSite = (
  v: CookieOptions["sameSite"] | undefined,
): "Strict" | "Lax" | "None" | undefined => {
  if (!v) return undefined;
  if (v === "strict") return "Strict";
  if (v === "lax") return "Lax";
  return "None";
};

const parseCookies = (cookieStr: string): Map<string, string> => {
  const out = new Map<string, string>();
  const parts = cookieStr.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k.length === 0) continue;
    out.set(k, v);
  }
  return out;
};

const buildCookie = (name: string, value: string, opts?: CookieOptions, remove = false): string => {
  const encName = encodeURIComponent(name);
  const encValue = encodeURIComponent(value);
  const pieces: string[] = [`${encName}=${encValue}`];

  const path = opts?.path ?? "/";
  pieces.push(`Path=${path}`);

  const sameSite = normalizeSameSite(opts?.sameSite);
  if (sameSite) pieces.push(`SameSite=${sameSite}`);
  if (opts?.secure) pieces.push("Secure");

  const expires = remove ? new Date(0) : computeExpires(opts);
  if (expires) pieces.push(`Expires=${expires.toUTCString()}`);

  return pieces.join("; ");
};

export type CreateCookieStorageParams = {
  keyPrefix: string;
  memory: MemoryStorage;
  defaultTtlMs: number | undefined;
  onChange: ((event: StorageChangeEvent) => void) | undefined;
};

export const createCookieStorage = (params: CreateCookieStorageParams) => {
  const { keyPrefix, memory, defaultTtlMs, onChange } = params;
  const available = hasCookies();
  const fullKey = (key: string) => `${keyPrefix}${key}`;

  const readRaw = (key: string): string | null => {
    const k = fullKey(key);
    if (available) {
      try {
        const cookies = parseCookies(document.cookie);
        const encodedName = encodeURIComponent(k);
        const val = cookies.get(encodedName);
        return val ?? null;
      } catch {
        // fallthrough
      }
    }
    return memory.getRaw(k);
  };

  const writeRaw = (key: string, raw: string, opts?: CookieOptions): void => {
    const k = fullKey(key);
    let wrotePrimary = false;
    if (available) {
      try {
        const expiresAtMs =
          opts?.ttlMs != null
            ? Date.now() + Math.max(0, opts.ttlMs)
            : defaultTtlMs != null
              ? Date.now() + Math.max(0, defaultTtlMs)
              : null;
        const adjustedOpts: CookieOptions = { ...opts };
        if (expiresAtMs != null && adjustedOpts.expires == null && adjustedOpts.ttlMs == null) {
          adjustedOpts.ttlMs = expiresAtMs - Date.now();
        }
        document.cookie = buildCookie(k, raw, adjustedOpts, false);
        wrotePrimary = true;
      } catch {
        // ignore
      }
    }
    if (!wrotePrimary) memory.setRaw(k, raw);
    onChange?.({ storage: "cookie", action: "set", key: k });
  };

  const deleteKey = (key: string, opts?: Pick<CookieOptions, "path">): void => {
    const k = fullKey(key);
    if (available) {
      try {
        document.cookie = buildCookie(k, "", { path: opts?.path ?? "/" }, true);
      } catch {
        // ignore
      }
    }
    memory.remove(k);
    onChange?.({ storage: "cookie", action: "remove", key: k });
  };

  const clearAll = (): void => {
    if (available) {
      try {
        const cookies = parseCookies(document.cookie);
        for (const encodedName of cookies.keys()) {
          const name = decodeURIComponent(encodedName);
          if (name.startsWith(keyPrefix)) {
            document.cookie = buildCookie(name, "", { path: "/" }, true);
          }
        }
      } catch {
        // ignore
      }
    }
    memory.clear(keyPrefix);
    onChange?.({ storage: "cookie", action: "clear" });
  };

  const computeExpiresAt = (ttlMs: number | undefined): number | null => {
    const effective = ttlMs ?? defaultTtlMs;
    if (effective == null) return null;
    if (!Number.isFinite(effective) || effective <= 0) return null;
    return Date.now() + effective;
  };

  return {
    get<T>(key: string): T | null {
      const rawEncoded = readRaw(key);
      if (rawEncoded === null) return null;
      let raw = rawEncoded;
      try {
        raw = decodeURIComponent(rawEncoded);
      } catch {
        // memory fallback may store non-encoded values; keep as-is
      }
      const res = deserialize<T>(raw);
      if (!res.ok) return null;
      if (res.expired) {
        deleteKey(key);
        return null;
      }
      return res.value;
    },
    set<T>(key: string, value: T, options?: CookieOptions): void {
      const expiresAtMs = computeExpiresAt(options?.ttlMs);
      const raw = serialize(value, { expiresAtMs });
      writeRaw(key, raw, options);
    },
    remove(key: string, options?: Pick<CookieOptions, "path">): void {
      deleteKey(key, options);
    },
    clear(): void {
      clearAll();
    },
  };
};
