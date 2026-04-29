import { MemoryStorage } from "./memoryStorage";
import type { CreateStorageOptions, InternalMeta, ResetOptions, StorageKind, UniversalStorage } from "./types";
import { createCookieStorage } from "../storages/cookieStorage";
import { createIndexedDBStorage } from "../storages/indexedDBStorage";
import { createWebStorage } from "../storages/localStorage";

const normalizeNamespacePrefix = (namespace: string | undefined): string => {
  if (!namespace) return "";
  const trimmed = namespace.trim();
  if (trimmed.length === 0) return "";
  return `${trimmed}:`;
};

export const createStorage = (options: CreateStorageOptions = {}): UniversalStorage => {
  const memory = new MemoryStorage();
  const keyPrefix = normalizeNamespacePrefix(options.namespace);

  const onChange = options.onChange;
  const defaultTtlMs = options.defaultTtlMs;
  const cookieDefaults = options.cookieDefaults;
  const dbName = options.dbName ?? "universal-storage";
  const dbStoreName = options.dbStoreName ?? "keyval";

  const local = createWebStorage({
    kind: "local",
    keyPrefix,
    memory,
    defaultTtlMs,
    onChange,
  });

  const session = createWebStorage({
    kind: "session",
    keyPrefix,
    memory,
    defaultTtlMs,
    onChange,
  });

  const cookie = createCookieStorage({
    keyPrefix,
    memory,
    defaultTtlMs,
    cookieDefaults,
    onChange,
  });

  const db = createIndexedDBStorage({
    dbName,
    storeName: dbStoreName,
    keyPrefix,
    memory,
    defaultTtlMs,
    onChange,
  });

  const resetType = async (kind: StorageKind): Promise<void> => {
    try {
      if (kind === "local") {
        local.clear();
      } else if (kind === "session") {
        session.clear();
      } else if (kind === "cookie") {
        cookie.clear();
      } else {
        await db.clear();
      }
      onChange?.({ storage: kind === "db" ? "db" : kind, action: "reset" });
    } catch {
      // never throw
    }
  };

  const reset = async (opts?: ResetOptions): Promise<void> => {
    const kinds: StorageKind[] = opts?.storages ?? ["local", "session", "cookie", "db"];
    for (const k of kinds) {
      // sequential to reduce contention and keep predictable ordering
      await resetType(k);
    }
  };

  const meta: InternalMeta = {
    namespace: options.namespace,
    keyPrefix,
    dbName,
    dbStoreName,
  };

  const storage: UniversalStorage = {
    local,
    session,
    cookie,
    db,
    reset,
    resetType,
  };

  // Non-exported metadata for tooling/full resets.
  Object.defineProperty(storage, "__usMeta", {
    value: meta,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return storage;
};

