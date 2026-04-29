import type { CookieDefaults, CreateStorageOptions } from "./types";

export type GlobalDefaults = {
  defaultTtlMs?: number;
  cookieDefaults?: CookieDefaults;
  dbName?: string;
  dbStoreName?: string;
};

let globalDefaults: GlobalDefaults = {
  cookieDefaults: { sameSite: "lax", secure: true, path: "/" },
};

export const getGlobalDefaults = (): GlobalDefaults => globalDefaults;

export const setGlobalDefaults = (next: GlobalDefaults): void => {
  globalDefaults = { ...globalDefaults, ...next };
  if (next.cookieDefaults) {
    globalDefaults.cookieDefaults = { ...globalDefaults.cookieDefaults, ...next.cookieDefaults };
  }
};

export const mergeWithGlobalDefaults = (options?: CreateStorageOptions): CreateStorageOptions => {
  const g = getGlobalDefaults();
  const merged: CreateStorageOptions = { ...(options ?? {}) };

  const defaultTtlMs = options?.defaultTtlMs ?? g.defaultTtlMs;
  if (defaultTtlMs !== undefined) merged.defaultTtlMs = defaultTtlMs;

  const dbName = options?.dbName ?? g.dbName;
  if (dbName !== undefined) merged.dbName = dbName;

  const dbStoreName = options?.dbStoreName ?? g.dbStoreName;
  if (dbStoreName !== undefined) merged.dbStoreName = dbStoreName;

  const cookieDefaults = options?.cookieDefaults ?? g.cookieDefaults;
  if (cookieDefaults !== undefined) merged.cookieDefaults = cookieDefaults;

  return merged;
};
