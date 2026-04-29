import type { SetCommonOptions } from "./memoryStorage";

export type CookieOptions = {
  expires?: number | Date;
  path?: string;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  ttlMs?: number;
};

export type CookieDefaults = Omit<CookieOptions, "ttlMs">;

export type StorageChangeEvent = {
  storage: "local" | "session" | "cookie" | "db" | "memory";
  action: "set" | "remove" | "clear";
  key?: string;
};

export type CreateStorageOptions = {
  namespace?: string;
  defaultTtlMs?: number;
  cookieDefaults?: CookieDefaults;
  dbName?: string;
  dbStoreName?: string;
  onChange?: (event: StorageChangeEvent) => void;
};

export type SyncStorage = {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, options?: SetCommonOptions): void;
  remove(key: string): void;
  clear(): void;
};

export type CookieStorage = {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, options?: CookieOptions): void;
  remove(key: string, options?: Pick<CookieOptions, "path">): void;
  clear(): void;
};

export type AsyncStorage = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: SetCommonOptions): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
};

export type UniversalStorage = {
  local: SyncStorage;
  session: SyncStorage;
  cookie: CookieStorage;
  db: AsyncStorage;
};

