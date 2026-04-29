# web-universal-storage

Unified, type-safe API for browser storage:

- `localStorage` (sync)
- `sessionStorage` (sync)
- `document.cookie` (sync)
- `IndexedDB` (async)

SSR-safe: in non-browser environments it automatically falls back to in-memory storage.

![CI](https://github.com/huseyinekh/universal-storage/actions/workflows/ci.yml/badge.svg)

## Install

```bash
npm i web-universal-storage
```

## Basic Usage

All storages support generics and `get<T>()` returns `T | null` (never `undefined`).

### Default instance

The default export is a singleton instance created with default options:

```ts
import storage from "web-universal-storage";
```

### `localStorage` (sync)

```ts
import storage from "web-universal-storage";

type User = { id: string; name: string };

storage.local.set<User>("user", { id: "1", name: "Ada" });
const user = storage.local.get<User>("user");
storage.local.remove("user");
```

### `sessionStorage` (sync)

```ts
import storage from "web-universal-storage";

storage.session.set("token", "abc");
const token = storage.session.get<string>("token");
storage.session.remove("token");
```

### Cookies (sync)

```ts
import storage from "web-universal-storage";

storage.cookie.set("token", "abc", { expires: 7, sameSite: "lax", secure: true });
const token = storage.cookie.get<string>("token");
storage.cookie.remove("token");
```

### IndexedDB (async)

```ts
import storage from "web-universal-storage";

await storage.db.set("large_data", { ok: true });
const large = await storage.db.get<{ ok: boolean }>("large_data");
await storage.db.remove("large_data");
```

## `createStorage(options?)`

Create a custom instance when you need namespacing, default TTL, custom IndexedDB names, or change events.

```ts
import { createStorage } from "web-universal-storage";

const storage = createStorage({ namespace: "app" });
```

### One instance per namespace

If you want to ensure a single instance per `namespace` (singleton per config), use `getStorage(...)`:

```ts
import { getStorage } from "web-universal-storage";

const storage = getStorage({ namespace: "app" });
```

## Options

```ts
type CreateStorageOptions = {
  namespace?: string;
  /**
   * Default TTL (ms) applied when `set()` is called without `ttlMs`.
   * TTL is implemented via metadata wrapper (not native storage expiration).
   */
  defaultTtlMs?: number;
  /**
   * Default cookie attributes for this storage instance.
   * Note: `ttlMs` is per-call (not a default).
   */
  cookieDefaults?: {
    expires?: number | Date;
    path?: string;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
  };
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
   * In-process events for this instance only (set/remove/clear).
   */
  onChange?: (event: StorageChangeEvent) => void;
};
```

## Features

### Namespacing

```ts
import { createStorage } from "web-universal-storage";

const s1 = createStorage({ namespace: "app" });
const s2 = createStorage({ namespace: "admin" });

s1.local.set("key", 1);
s2.local.set("key", 2);
```

### TTL (expiration)

TTL works for all storage types. Expired values return `null` and are removed on read.

```ts
import storage from "web-universal-storage";

storage.local.set("temp", { ok: true }, { ttlMs: 5_000 });
```

### Change events

```ts
import { createStorage } from "web-universal-storage";

const storage = createStorage({
  onChange(e) {
    console.log(e.storage, e.action, e.key);
  },
});
```

### Global defaults (for default instance)

You can configure defaults used by the default singleton and by any instance that does not override those defaults.

```ts
import storage, { configureDefaults } from "web-universal-storage";

configureDefaults({
  cookieDefaults: { sameSite: "lax", secure: true, path: "/" },
});

storage.cookie.set("token", "abc"); // uses configured cookie defaults
```

## API Reference

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

- If `typeof window === "undefined"` or a storage is unavailable/throws, the library uses in-memory storage.
- `get()` never throws and never returns `undefined` (returns `null`).

## Fallback behavior

- Reads: primary storage → memory fallback
- Writes: try primary storage → memory fallback (best-effort; e.g. quota exceeded / storage blocked)

## Example (JS)

```js
import storage from "web-universal-storage";

storage.local.set("count", 1);
console.log(storage.local.get("count")); // 1
```
