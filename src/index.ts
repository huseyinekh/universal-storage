import { createStorage as _createStorage } from "./core/storageFactory";
import type { CreateStorageOptions, InternalMeta, StorageKind, UniversalStorage } from "./core/types";
import { mergeWithGlobalDefaults, setGlobalDefaults, type GlobalDefaults } from "./core/defaults";

export const createStorage = _createStorage;

const cache = new Map<string, UniversalStorage>();

const cacheKeyFor = (options: CreateStorageOptions | undefined): string => {
  const ns = options?.namespace?.trim() ?? "";
  const dbName = options?.dbName ?? "";
  const dbStoreName = options?.dbStoreName ?? "";
  const defaultTtlMs = options?.defaultTtlMs ?? "";
  const cookieDefaults = options?.cookieDefaults
    ? JSON.stringify(options.cookieDefaults)
    : "";
  const encryption = options?.encryption ? JSON.stringify(options.encryption) : "";
  // Note: `onChange` is intentionally not part of the cache key.
  return `${ns}||${dbName}||${dbStoreName}||${defaultTtlMs}||${cookieDefaults}||${encryption}`;
};

export const getStorage = (options?: CreateStorageOptions): UniversalStorage => {
  const merged = mergeWithGlobalDefaults(options);
  const key = cacheKeyFor(merged);
  const existing = cache.get(key);
  if (existing) return existing;
  const created = _createStorage(merged);
  cache.set(key, created);
  return created;
};

export const getDefaultStorage = (): UniversalStorage => {
  return getStorage();
};

let defaultInstance = getDefaultStorage();

export const configureDefaults = (defaults: GlobalDefaults): void => {
  setGlobalDefaults(defaults);
  cache.clear();
  defaultInstance = getDefaultStorage();
};

type WithMeta = UniversalStorage & { __usMeta?: InternalMeta };

const getMeta = (s: UniversalStorage): InternalMeta | null => {
  const meta = (s as WithMeta).__usMeta;
  if (!meta) return null;
  return meta;
};

const safe = async (fn: () => void | Promise<void>): Promise<void> => {
  try {
    await fn();
  } catch {
    // never throw
  }
};

const deleteIndexedDbDatabase = (name: string): Promise<void> => {
  if (typeof indexedDB === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
};

const fullResetTypeImpl = async (kind: StorageKind): Promise<void> => {
  // Clear primary storage globally (best-effort).
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (kind === "local") {
      await safe(() => window.localStorage.clear());
    } else if (kind === "session") {
      await safe(() => window.sessionStorage.clear());
    } else if (kind === "cookie") {
      await safe(() => {
        const cookieStr = document.cookie;
        const parts = cookieStr.split(";");
        for (const part of parts) {
          const idx = part.indexOf("=");
          if (idx === -1) continue;
          const name = part.slice(0, idx).trim();
          if (!name) continue;
          document.cookie = `${name}=; Expires=${new Date(0).toUTCString()}; Path=/`;
        }
      });
    }
  }

  if (kind === "db") {
    const dbNames = new Set<string>();
    for (const s of cache.values()) {
      const meta = getMeta(s);
      if (meta) dbNames.add(meta.dbName);
    }
    for (const name of dbNames) {
      // sequential
      await deleteIndexedDbDatabase(name);
    }
  }

  // Also clear all cached instances of that kind (clears memory fallback too).
  for (const s of cache.values()) {
    await s.resetType(kind);
  }
};

const fullResetImpl = async (): Promise<void> => {
  // Reset all kinds globally + cached instances.
  for (const kind of ["local", "session", "cookie", "db"] as const) {
    await fullResetTypeImpl(kind);
  }
};

export type DefaultStorage = UniversalStorage & {
  /**
   * Configure global defaults for the default singleton instance.
   * Also affects `getStorage(...)` instances.
   */
  configure(defaults: GlobalDefaults): void;
  /**
   * Global destructive reset (clears all storages, not only the namespace).
   * Only available on the default import.
   */
  fullReset(): Promise<void>;
  /**
   * Global destructive reset for one storage kind.
   * Only available on the default import.
   */
  fullResetType(kind: StorageKind): Promise<void>;
};

// Proxy so `import storage from ...` keeps working even if defaults are reconfigured,
// while also exposing default-only helpers (full reset).
export const storage: DefaultStorage = new Proxy({} as DefaultStorage, {
  get(_t, prop) {
    if (prop === "configure") return configureDefaults;
    if (prop === "fullReset") return fullResetImpl;
    if (prop === "fullResetType") return fullResetTypeImpl;
    return (defaultInstance as unknown as Record<PropertyKey, unknown>)[prop] as never;
  },
}) as DefaultStorage;

export default storage;
export type {
  AsyncStorage,
  CookieOptions,
  CookieDefaults,
  CookieStorage,
  EncryptionConfig,
  EncryptionPayload,
  SecureUniversalStorage,
  CreateStorageOptions,
  StorageChangeEvent,
  SyncStorage,
  UniversalStorage,
} from "./core/types";
