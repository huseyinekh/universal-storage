import { MemoryStorage } from "./memoryStorage";
import type { CreateStorageOptions, UniversalStorage } from "./types";
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
    onChange,
  });

  const db = createIndexedDBStorage({
    dbName: options.dbName ?? "universal-storage",
    storeName: options.dbStoreName ?? "keyval",
    keyPrefix,
    memory,
    defaultTtlMs,
    onChange,
  });

  return { local, session, cookie, db };
};

