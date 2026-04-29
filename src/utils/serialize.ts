type Wrapped = {
  __us: 1;
  v: unknown;
  e: number | null;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isWrapped = (v: unknown): v is Wrapped => {
  if (!isRecord(v)) return false;
  return v.__us === 1 && "v" in v && "e" in v;
};

export type SerializeOptions = {
  expiresAtMs: number | null;
};

export const serialize = (value: unknown, opts: SerializeOptions): string => {
  const wrapped: Wrapped = { __us: 1, v: value, e: opts.expiresAtMs };
  return JSON.stringify(wrapped);
};

export type DeserializeResult<T> =
  | { ok: true; value: T | null; expired: boolean; wasWrapped: boolean }
  | { ok: false; value: null; expired: false; wasWrapped: false };

export const deserialize = <T>(raw: string | null): DeserializeResult<T> => {
  if (raw === null) {
    return { ok: true, value: null, expired: false, wasWrapped: false };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (isWrapped(parsed)) {
      const expiresAt = parsed.e;
      if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
        if (Date.now() >= expiresAt) {
          return { ok: true, value: null, expired: true, wasWrapped: true };
        }
      }
      return { ok: true, value: parsed.v as T, expired: false, wasWrapped: true };
    }

    // Back-compat / non-wrapped values: treat parsed JSON as value.
    return { ok: true, value: parsed as T, expired: false, wasWrapped: false };
  } catch {
    return { ok: false, value: null, expired: false, wasWrapped: false };
  }
};

