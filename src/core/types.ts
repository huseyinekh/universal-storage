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
  action: "set" | "remove" | "clear" | "reset";
  key?: string;
};

export type StorageKind = "local" | "session" | "cookie" | "db";

export type ResetOptions = {
  /**
   * Reset only a subset of storages. Default: all.
   */
  storages?: StorageKind[];
};

export type EncryptionPayload = {
  __type: "encrypted";
  v: 1;
  iv: string;
  data: string;
  salt: string;
};

export type EncryptionConfig = {
  enabled?: boolean;
  /**
   * Deterministic secret used for key derivation.
   * If encryption is enabled and secret is not provided, defaults to "khid".
   */
  secret?: string;
  local?: { enabled?: boolean };
  session?: { enabled?: boolean };
  cookie?: { enabled?: boolean };
  db?: { enabled?: boolean };
};

export type SecureOverride = {
  /**
   * Runtime override for a single call.
   * When false, skips encryption and stores plain values.
   */
  encryption?: boolean;
};

export type CreateStorageOptions = {
  namespace?: string;
  defaultTtlMs?: number;
  cookieDefaults?: CookieDefaults;
  encryption?: EncryptionConfig;
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

export type SecureSyncStorage = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: SetCommonOptions & SecureOverride): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
};

export type CookieStorage = {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, options?: CookieOptions): void;
  remove(key: string, options?: Pick<CookieOptions, "path">): void;
  clear(): void;
};

export type SecureCookieStorage = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CookieOptions & SecureOverride): Promise<void>;
  remove(key: string, options?: Pick<CookieOptions, "path">): Promise<void>;
  clear(): Promise<void>;
};

export type AsyncStorage = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: SetCommonOptions): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
};

export type SecureAsyncStorage = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: SetCommonOptions & SecureOverride): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
};

export type SecureUniversalStorage = {
  local: SecureSyncStorage;
  session: SecureSyncStorage;
  cookie: SecureCookieStorage;
  db: SecureAsyncStorage;
};

export type UniversalStorage = {
  local: SyncStorage;
  session: SyncStorage;
  cookie: CookieStorage;
  db: AsyncStorage;
  /**
   * Async encryption-aware wrapper layer.
   * Does not affect existing sync APIs.
   */
  secure: SecureUniversalStorage;
  /**
   * Clears all configured storages for this instance's namespace.
   * Always resolves (never throws).
   */
  reset(options?: ResetOptions): Promise<void>;
  /**
   * Clears a single storage kind for this instance's namespace.
   * Always resolves (never throws).
   */
  resetType(kind: StorageKind): Promise<void>;
};

export type InternalMeta = {
  namespace: string | undefined;
  keyPrefix: string;
  dbName: string;
  dbStoreName: string;
};


