import { describe, expect, it, beforeEach } from "vitest";
import storage, { createStorage, getStorage } from "../src/index";

type MockStorage = {
  length: number;
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
  clear: () => void;
  key: (i: number) => string | null;
};

const makeWebStorage = (opts?: { throwOnSet?: boolean }): MockStorage => {
  const map = new Map<string, string>();
  const keys = () => Array.from(map.keys());
  return {
    get length() {
      return map.size;
    },
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string) {
      if (opts?.throwOnSet) {
        const err = new Error("quota");
        (err as unknown as { name: string }).name = "QuotaExceededError";
        throw err;
      }
      map.set(k, v);
    },
    removeItem(k: string) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
    key(i: number) {
      return keys()[i] ?? null;
    },
  };
};

const installBrowserMocks = (params?: { quota?: boolean }) => {
  const local = makeWebStorage(params?.quota ? { throwOnSet: true } : undefined);
  const session = makeWebStorage();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: local,
    sessionStorage: session,
  };
  let cookie = "";
  (globalThis as unknown as { document: unknown }).document = {
    get cookie() {
      return cookie;
    },
    set cookie(v: string) {
      // emulate browser behavior roughly: append/replace by name
      const parts = v.split(";");
      const first = parts[0]?.trim() ?? "";
      const eq = first.indexOf("=");
      if (eq === -1) return;
      const name = first.slice(0, eq);
      const value = first.slice(eq + 1);
      const existing = cookie
        .split(";")
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && !p.startsWith(`${name}=`));
      if (value !== "") existing.push(`${name}=${value}`);
      cookie = existing.join("; ");
    },
  };
};

beforeEach(() => {
  // Ensure clean globals between tests
  delete (globalThis as unknown as { window?: unknown }).window;
  delete (globalThis as unknown as { document?: unknown }).document;
});

describe("universal-storage (SSR fallback)", () => {
  it("set/get/remove (local) works without window", () => {
    const storage = createStorage();
    storage.local.set("k", { a: 1 });
    expect(storage.local.get<{ a: number }>("k")).toEqual({ a: 1 });
    storage.local.remove("k");
    expect(storage.local.get("k")).toBeNull();
  });

  it("db is async and works in memory fallback", async () => {
    const storage = createStorage();
    await storage.db.set("big", { ok: true });
    await expect(storage.db.get<{ ok: boolean }>("big")).resolves.toEqual({ ok: true });
    await storage.db.remove("big");
    await expect(storage.db.get("big")).resolves.toBeNull();
  });

  it("default export singleton is usable", () => {
    storage.local.set("singleton", 123);
    expect(storage.local.get<number>("singleton")).toBe(123);
  });
});

describe("namespace singleton helper", () => {
  it("getStorage returns same instance for same namespace", () => {
    const a1 = getStorage({ namespace: "app" });
    const a2 = getStorage({ namespace: "app" });
    expect(a1).toBe(a2);
  });

  it("getStorage returns different instances for different namespaces", () => {
    const a = getStorage({ namespace: "a" });
    const b = getStorage({ namespace: "b" });
    expect(a).not.toBe(b);
  });

  it("createStorage still creates new instances", () => {
    const a1 = createStorage({ namespace: "app" });
    const a2 = createStorage({ namespace: "app" });
    expect(a1).not.toBe(a2);
  });
});

describe("serialization failures", () => {
  it("returns null on invalid JSON", () => {
    installBrowserMocks();
    const storage = createStorage({ namespace: "n" });
    // Write invalid JSON directly to localStorage slot
    (window as unknown as { localStorage: MockStorage }).localStorage.setItem("n:bad", "{not-json");
    expect(storage.local.get("bad")).toBeNull();
  });
});

describe("quota exceeded fallback", () => {
  it("falls back to memory and does not throw", () => {
    installBrowserMocks({ quota: true });
    const storage = createStorage({ namespace: "q" });
    expect(() => storage.local.set("x", 1)).not.toThrow();
    expect(storage.local.get<number>("x")).toBe(1);
  });
});

describe("cookies", () => {
  it("set/get/remove works", () => {
    installBrowserMocks();
    const storage = createStorage({ namespace: "c" });
    storage.cookie.set("t", "abc");
    expect(storage.cookie.get<string>("t")).toBe("abc");
    storage.cookie.remove("t");
    expect(storage.cookie.get("t")).toBeNull();
  });
});

