export const isBrowser = (): boolean =>
  typeof window !== "undefined" && typeof document !== "undefined";

export const hasStorage = (kind: "local" | "session"): boolean => {
  if (!isBrowser()) return false;
  try {
    const storage = kind === "local" ? window.localStorage : window.sessionStorage;
    const testKey = "__universal_storage_test__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const hasCookies = (): boolean => {
  if (!isBrowser()) return false;
  try {
    return typeof document.cookie === "string";
  } catch {
    return false;
  }
};

export const hasIndexedDB = (): boolean => {
  if (!isBrowser()) return false;
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
};

