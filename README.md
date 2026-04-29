# universal-storage

Unified, type-safe API for browser storage:

- `localStorage` (sync)
- `sessionStorage` (sync)
- `document.cookie` (sync)
- `IndexedDB` (async)

Works in JavaScript and TypeScript. SSR-safe: in non-browser environments it automatically uses in-memory storage.

![CI](https://github.com/huseyinekh/universal-storage/actions/workflows/ci.yml/badge.svg)

## Install

```bash
npm i web-universal-storage
```

## Usage

```ts
import storage, { createStorage } from "web-universal-storage";

type User = { id: string; name: string };

// Option A (like axios): default singleton instance
storage.local.set<User>("user", { id: "1", name: "Ada" });
const u1 = storage.local.get<User>("user");

// Option B: create your own configured instance
const storage2 = createStorage({ namespace: "app" });

storage2.local.set<User>("user", { id: "1", name: "Ada" });
const user = storage2.local.get<User>("user"); // User | null

storage2.session.remove("token");

storage2.cookie.set("token", "abc", { expires: 7, sameSite: "lax" });
const token = storage2.cookie.get<string>("token");

await storage2.db.set("large_data", { ok: true });
const large = await storage2.db.get<{ ok: boolean }>("large_data");
```

## API

### `createStorage(options?)`

```ts
type CreateStorageOptions = {
  namespace?: string;
  /**
   * Default TTL (ms) applied when `set()` is called without `ttl`.
   * TTL is implemented via metadata wrapper (not native storage expiration).
   */
  defaultTtlMs?: number;
  /**
   * IndexedDB database name.
   * Default: "universal-storage"
   */
  dbName?: string;
  /**
   * IndexedDB object store name.
   * Default: "keyval"
   */
  dbStoreName?: string;
  /**
   * Listen to in-process changes (set/remove/clear).
   */
  onChange?: (event: StorageChangeEvent) => void;
};
```

### Sync storages: `local`, `session`, `cookie`

```ts
storage.local.get<T>(key): T | null
storage.local.set<T>(key, value, { ttlMs? }): void
storage.local.remove(key): void
storage.local.clear(): void
```

### Async storage: `db` (IndexedDB)

```ts
await storage.db.get<T>(key): Promise<T | null>
await storage.db.set<T>(key, value, { ttlMs? }): Promise<void>
await storage.db.remove(key): Promise<void>
await storage.db.clear(): Promise<void>
```

### Cookies

```ts
storage.cookie.set(key, value, {
  expires?: number | Date,
  path?: string,
  secure?: boolean,
  sameSite?: "strict" | "lax" | "none",
  ttlMs?: number
})
```

## SSR / Disabled storage

- If `typeof window === "undefined"` or a storage is unavailable/throws, the library falls back to an in-memory `Map`.
- `get()` never throws and never returns `undefined` (returns `null` on miss or errors).

### Default singleton import

If you import the default export, you get a singleton instance created with default options:

```ts
import storage from "web-universal-storage";
storage.local.set("k", 1);
```

If you need a namespace, TTL defaults, custom IndexedDB name, or a change listener, use `createStorage(...)`.

## Fallback behavior

- If a write fails (e.g. `QuotaExceededError`), the value is stored in memory as a best-effort fallback.
- Reads check the primary storage first, then memory fallback.

## Example (JS)

```js
import { createStorage } from "universal-storage";

const storage = createStorage();
storage.local.set("count", 1);
console.log(storage.local.get("count")); // 1
```

