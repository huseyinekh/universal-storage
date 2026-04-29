import type { MemoryStorage, SetCommonOptions } from "../core/memoryStorage";
import type { StorageChangeEvent } from "../core/types";
import { hasIndexedDB } from "../utils/env";
import { deserialize, serialize } from "../utils/serialize";

type CreateIndexedDBStorageParams = {
  dbName: string;
  storeName: string;
  keyPrefix: string;
  memory: MemoryStorage;
  defaultTtlMs: number | undefined;
  onChange: ((event: StorageChangeEvent) => void) | undefined;
};

const computeExpiresAt = (ttlMs: number | undefined, defaultTtlMs: number | undefined): number | null => {
  const effective = ttlMs ?? defaultTtlMs;
  if (effective == null) return null;
  if (!Number.isFinite(effective) || effective <= 0) return null;
  return Date.now() + effective;
};

const requestToPromise = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });

const txDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction error"));
  });

const deleteByPrefix = (store: IDBObjectStore, prefix: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve();
        return;
      }
      const key = cursor.key;
      if (typeof key === "string" && key.startsWith(prefix)) {
        cursor.delete();
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error ?? new Error("IndexedDB cursor failed"));
  });

export const createIndexedDBStorage = (params: CreateIndexedDBStorageParams) => {
  const { dbName, storeName, keyPrefix, memory, defaultTtlMs, onChange } = params;
  const supported = hasIndexedDB();

  let disabled = !supported;
  let dbPromise: Promise<IDBDatabase> | null = null;

  const fullKey = (key: string) => `${keyPrefix}${key}`;

  const openDb = (): Promise<IDBDatabase> => {
    if (disabled) return Promise.reject(new Error("IndexedDB disabled"));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
        req.onblocked = () => {
          // Treat as failure (private mode / blocked upgrade).
          reject(new Error("IndexedDB open blocked"));
        };
      } catch (err) {
        reject(err instanceof Error ? err : new Error("IndexedDB open threw"));
      }
    }).catch((err) => {
      disabled = true;
      dbPromise = null;
      throw err;
    });
    return dbPromise;
  };

  const withDb = async <T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> => {
    try {
      const db = await openDb();
      return await fn(db);
    } catch {
      disabled = true;
      throw new Error("IndexedDB unavailable");
    }
  };

  const getRawPrimary = async (key: string): Promise<string | null> => {
    const k = fullKey(key);
    return withDb(async (db) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const val = await requestToPromise<unknown>(store.get(k));
      await txDone(tx);
      return typeof val === "string" ? val : null;
    });
  };

  const setRawPrimary = async (key: string, raw: string): Promise<void> => {
    const k = fullKey(key);
    return withDb(async (db) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.put(raw, k);
      await txDone(tx);
    });
  };

  const removePrimary = async (key: string): Promise<void> => {
    const k = fullKey(key);
    return withDb(async (db) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.delete(k);
      await txDone(tx);
    });
  };

  const clearPrimary = async (): Promise<void> => {
    return withDb(async (db) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      if (keyPrefix.length === 0) {
        store.clear();
      } else {
        await deleteByPrefix(store, keyPrefix);
      }
      await txDone(tx);
    });
  };

  return {
    async get<T>(key: string): Promise<T | null> {
      const k = fullKey(key);
      let raw: string | null = null;
      if (!disabled) {
        try {
          raw = await getRawPrimary(key);
        } catch {
          raw = null;
        }
      }
      if (raw == null) raw = memory.getRaw(k);
      const res = deserialize<T>(raw);
      if (!res.ok) return null;
      if (res.expired) {
        await this.remove(key);
        return null;
      }
      return res.value;
    },
    async set<T>(key: string, value: T, options?: SetCommonOptions): Promise<void> {
      const expiresAtMs = computeExpiresAt(options?.ttlMs, defaultTtlMs);
      const raw = serialize(value, { expiresAtMs });
      const k = fullKey(key);
      let wrotePrimary = false;
      if (!disabled) {
        try {
          await setRawPrimary(key, raw);
          wrotePrimary = true;
        } catch {
          // fallback
        }
      }
      if (!wrotePrimary) memory.setRaw(k, raw);
      onChange?.({ storage: "db", action: "set", key: k });
    },
    async remove(key: string): Promise<void> {
      const k = fullKey(key);
      if (!disabled) {
        try {
          await removePrimary(key);
        } catch {
          // ignore
        }
      }
      memory.remove(k);
      onChange?.({ storage: "db", action: "remove", key: k });
    },
    async clear(): Promise<void> {
      if (!disabled) {
        try {
          await clearPrimary();
        } catch {
          // ignore
        }
      }
      memory.clear(keyPrefix);
      onChange?.({ storage: "db", action: "clear" });
    },
  };
};
