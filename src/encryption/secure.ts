import type {
  AsyncStorage,
  CookieOptions,
  CookieStorage,
  EncryptionConfig,
  SecureAsyncStorage,
  SecureCookieStorage,
  SecureSyncStorage,
  SecureUniversalStorage,
  SyncStorage,
} from "../core/types";
import { decryptValue, isEncryptionPayload } from "./decrypt";
import { encryptValue } from "./encrypt";
import { resolveEncryption } from "./config";

type SecureLayerParams = {
  local: SyncStorage;
  session: SyncStorage;
  cookie: CookieStorage;
  db: AsyncStorage;
  encryption: EncryptionConfig | undefined;
};

const stripEncryptionFlag = <T extends object | undefined>(opts: T): T => {
  if (!opts) return opts;
  const o = opts as Record<string, unknown>;
  if (!("encryption" in o)) return opts;
  const { encryption: _enc, ...rest } = o;
  return rest as T;
};

const shouldEncrypt = (enabledForKind: boolean, override?: boolean): boolean => {
  if (override === false) return false;
  if (override === true) return true;
  return enabledForKind;
};

export const createSecureLayer = (params: SecureLayerParams): SecureUniversalStorage => {
  const { local, session, cookie, db, encryption } = params;
  const resolved = resolveEncryption(encryption);

  const decryptIfNeeded = async <T>(value: unknown, secret: string): Promise<T | null> => {
    if (value === null) return null;
    if (isEncryptionPayload(value)) return decryptValue<T>(value, secret);
    return value as T;
  };

  const secureLocal: SecureSyncStorage = {
    async get<T>(key: string): Promise<T | null> {
      try {
        const v = local.get<unknown>(key);
        return decryptIfNeeded<T>(v, resolved.secret);
      } catch {
        return null;
      }
    },
    async set<T>(key: string, value: T, options?: { ttlMs?: number; encryption?: boolean }): Promise<void> {
      try {
        const doEnc = shouldEncrypt(resolved.enabledFor.local, options?.encryption);
        if (!doEnc) {
          local.set(key, value, stripEncryptionFlag(options));
          return;
        }
        const payload = await encryptValue(value, resolved.secret);
        local.set(key, payload ?? value, stripEncryptionFlag(options));
      } catch {
        // never throw
      }
    },
    async remove(key: string): Promise<void> {
      try {
        local.remove(key);
      } catch {
        // ignore
      }
    },
    async clear(): Promise<void> {
      try {
        local.clear();
      } catch {
        // ignore
      }
    },
  };

  const secureSession: SecureSyncStorage = {
    async get<T>(key: string): Promise<T | null> {
      try {
        const v = session.get<unknown>(key);
        return decryptIfNeeded<T>(v, resolved.secret);
      } catch {
        return null;
      }
    },
    async set<T>(key: string, value: T, options?: { ttlMs?: number; encryption?: boolean }): Promise<void> {
      try {
        const doEnc = shouldEncrypt(resolved.enabledFor.session, options?.encryption);
        if (!doEnc) {
          session.set(key, value, stripEncryptionFlag(options));
          return;
        }
        const payload = await encryptValue(value, resolved.secret);
        session.set(key, payload ?? value, stripEncryptionFlag(options));
      } catch {
        // never throw
      }
    },
    async remove(key: string): Promise<void> {
      try {
        session.remove(key);
      } catch {
        // ignore
      }
    },
    async clear(): Promise<void> {
      try {
        session.clear();
      } catch {
        // ignore
      }
    },
  };

  const secureCookie: SecureCookieStorage = {
    async get<T>(key: string): Promise<T | null> {
      try {
        const v = cookie.get<unknown>(key);
        return decryptIfNeeded<T>(v, resolved.secret);
      } catch {
        return null;
      }
    },
    async set<T>(key: string, value: T, options?: CookieOptions & { encryption?: boolean }): Promise<void> {
      try {
        const doEnc = shouldEncrypt(resolved.enabledFor.cookie, options?.encryption);
        if (!doEnc) {
          cookie.set(key, value, stripEncryptionFlag(options));
          return;
        }
        const payload = await encryptValue(value, resolved.secret);
        cookie.set(key, payload ?? value, stripEncryptionFlag(options));
      } catch {
        // never throw
      }
    },
    async remove(key: string, options?: Pick<CookieOptions, "path">): Promise<void> {
      try {
        cookie.remove(key, options);
      } catch {
        // ignore
      }
    },
    async clear(): Promise<void> {
      try {
        cookie.clear();
      } catch {
        // ignore
      }
    },
  };

  const secureDb: SecureAsyncStorage = {
    async get<T>(key: string): Promise<T | null> {
      try {
        const v = await db.get<unknown>(key);
        return decryptIfNeeded<T>(v, resolved.secret);
      } catch {
        return null;
      }
    },
    async set<T>(key: string, value: T, options?: { ttlMs?: number; encryption?: boolean }): Promise<void> {
      try {
        const doEnc = shouldEncrypt(resolved.enabledFor.db, options?.encryption);
        if (!doEnc) {
          await db.set(key, value, stripEncryptionFlag(options));
          return;
        }
        const payload = await encryptValue(value, resolved.secret);
        await db.set(key, payload ?? value, stripEncryptionFlag(options));
      } catch {
        // never throw
      }
    },
    async remove(key: string): Promise<void> {
      try {
        await db.remove(key);
      } catch {
        // ignore
      }
    },
    async clear(): Promise<void> {
      try {
        await db.clear();
      } catch {
        // ignore
      }
    },
  };

  // Expose for typing completeness; also helps future extension.
  const secure: SecureUniversalStorage = {
    local: secureLocal,
    session: secureSession,
    cookie: secureCookie,
    db: secureDb,
  };

  return secure;
};
