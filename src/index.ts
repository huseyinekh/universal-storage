import { createStorage as _createStorage } from "./core/storageFactory";
import type { CreateStorageOptions, UniversalStorage } from "./core/types";

export const createStorage = _createStorage;

const cache = new Map<string, UniversalStorage>();

const cacheKeyFor = (options: CreateStorageOptions | undefined): string => {
  const ns = options?.namespace?.trim() ?? "";
  const dbName = options?.dbName ?? "";
  const dbStoreName = options?.dbStoreName ?? "";
  const defaultTtlMs = options?.defaultTtlMs ?? "";
  // Note: `onChange` is intentionally not part of the cache key.
  return `${ns}||${dbName}||${dbStoreName}||${defaultTtlMs}`;
};

export const getStorage = (options?: CreateStorageOptions): UniversalStorage => {
  const key = cacheKeyFor(options);
  const existing = cache.get(key);
  if (existing) return existing;
  const created = _createStorage(options ?? {});
  cache.set(key, created);
  return created;
};

export const getDefaultStorage = (): UniversalStorage => {
  return getStorage();
};

export const storage = getDefaultStorage();

export default storage;
export type {
  AsyncStorage,
  CookieOptions,
  CookieStorage,
  CreateStorageOptions,
  StorageChangeEvent,
  SyncStorage,
  UniversalStorage,
} from "./core/types";
