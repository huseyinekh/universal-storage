import { createStorage as _createStorage } from "./core/storageFactory";
import type { CreateStorageOptions, UniversalStorage } from "./core/types";
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
  // Note: `onChange` is intentionally not part of the cache key.
  return `${ns}||${dbName}||${dbStoreName}||${defaultTtlMs}||${cookieDefaults}`;
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

// Proxy so `import storage from ...` keeps working even if defaults are reconfigured.
export const storage: UniversalStorage = new Proxy({} as UniversalStorage, {
  get(_t, prop) {
    return (defaultInstance as unknown as Record<PropertyKey, unknown>)[prop] as never;
  },
}) as UniversalStorage;

export default storage;
export type {
  AsyncStorage,
  CookieOptions,
  CookieDefaults,
  CookieStorage,
  CreateStorageOptions,
  StorageChangeEvent,
  SyncStorage,
  UniversalStorage,
} from "./core/types";
