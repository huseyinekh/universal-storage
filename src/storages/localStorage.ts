import type { MemoryStorage, SetCommonOptions } from "../core/memoryStorage";
import type { StorageChangeEvent } from "../core/types";
import { hasStorage } from "../utils/env";
import { isQuotaExceededError } from "../utils/errors";
import { deserialize, serialize } from "../utils/serialize";

type CreateSyncStorageParams = {
  kind: "local" | "session";
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

export const createWebStorage = (params: CreateSyncStorageParams) => {
  const { kind, keyPrefix, memory, defaultTtlMs, onChange } = params;
  const available = hasStorage(kind);

  const fullKey = (key: string) => `${keyPrefix}${key}`;

  const getRaw = (key: string): string | null => {
    const k = fullKey(key);
    if (available) {
      try {
        const storage = kind === "local" ? window.localStorage : window.sessionStorage;
        return storage.getItem(k);
      } catch {
        // fallthrough to memory
      }
    }
    return memory.getRaw(k);
  };

  const setRaw = (key: string, raw: string): void => {
    const k = fullKey(key);
    let wroteToPrimary = false;

    if (available) {
      try {
        const storage = kind === "local" ? window.localStorage : window.sessionStorage;
        storage.setItem(k, raw);
        wroteToPrimary = true;
      } catch (err) {
        // Quota or disabled storage: fallback to memory
        if (!isQuotaExceededError(err)) {
          // still fallback
        }
      }
    }

    if (!wroteToPrimary) {
      memory.setRaw(k, raw);
    }

    onChange?.({ storage: kind, action: "set", key: k });
  };

  const removeRaw = (key: string): void => {
    const k = fullKey(key);
    if (available) {
      try {
        const storage = kind === "local" ? window.localStorage : window.sessionStorage;
        storage.removeItem(k);
      } catch {
        // ignore
      }
    }
    memory.remove(k);
    onChange?.({ storage: kind, action: "remove", key: k });
  };

  const clearAll = (): void => {
    if (available) {
      try {
        const storage = kind === "local" ? window.localStorage : window.sessionStorage;
        if (keyPrefix.length === 0) {
          storage.clear();
        } else {
          const toRemove: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i);
            if (k && k.startsWith(keyPrefix)) toRemove.push(k);
          }
          for (const k of toRemove) storage.removeItem(k);
        }
      } catch {
        // ignore
      }
    }
    memory.clear(keyPrefix);
    onChange?.({ storage: kind, action: "clear" });
  };

  return {
    get<T>(key: string): T | null {
      const raw = getRaw(key);
      const res = deserialize<T>(raw);
      if (!res.ok) return null;
      if (res.expired) {
        removeRaw(key);
        return null;
      }
      return res.value;
    },
    set<T>(key: string, value: T, options?: SetCommonOptions): void {
      const expiresAtMs = computeExpiresAt(options?.ttlMs, defaultTtlMs);
      const raw = serialize(value, { expiresAtMs });
      setRaw(key, raw);
    },
    remove(key: string): void {
      removeRaw(key);
    },
    clear(): void {
      clearAll();
    },
  };
};
