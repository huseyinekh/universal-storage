export const isQuotaExceededError = (err: unknown): boolean => {
  if (err == null) return false;
  if (typeof err !== "object") return false;
  const maybe = err as { name?: unknown; code?: unknown };
  if (maybe.name === "QuotaExceededError") return true;
  // Legacy WebKit / IE
  if (maybe.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  if (maybe.code === 22 || maybe.code === 1014) return true;
  return false;
};

export const safeTry = <T>(fn: () => T, onError: () => T): T => {
  try {
    return fn();
  } catch {
    return onError();
  }
};

