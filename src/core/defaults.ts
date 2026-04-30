import type { CookieDefaults, CreateStorageOptions, EncryptionConfig } from "./types";

export type GlobalDefaults = {
  defaultTtlMs?: number;
  cookieDefaults?: CookieDefaults;
  encryption?: EncryptionConfig;
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
  if (next.encryption) {
    globalDefaults.encryption = {
      ...(globalDefaults.encryption ?? {}),
      ...next.encryption,
      local: { ...(globalDefaults.encryption?.local ?? {}), ...(next.encryption.local ?? {}) },
      session: { ...(globalDefaults.encryption?.session ?? {}), ...(next.encryption.session ?? {}) },
      cookie: { ...(globalDefaults.encryption?.cookie ?? {}), ...(next.encryption.cookie ?? {}) },
      db: { ...(globalDefaults.encryption?.db ?? {}), ...(next.encryption.db ?? {}) },
    };
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

  const encryption = options?.encryption ?? g.encryption;
  if (encryption !== undefined) {
    const mergedEnc: EncryptionConfig = {
      ...(g.encryption ?? {}),
      ...(options?.encryption ?? {}),
      local: { ...(g.encryption?.local ?? {}), ...(options?.encryption?.local ?? {}) },
      session: { ...(g.encryption?.session ?? {}), ...(options?.encryption?.session ?? {}) },
      cookie: { ...(g.encryption?.cookie ?? {}), ...(options?.encryption?.cookie ?? {}) },
      db: { ...(g.encryption?.db ?? {}), ...(options?.encryption?.db ?? {}) },
    };
    merged.encryption = mergedEnc;
  }

  return merged;
};
