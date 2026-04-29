export type SetCommonOptions = {
  ttlMs?: number;
};

type MemoryEntry = {
  raw: string;
};

export class MemoryStorage {
  private readonly map = new Map<string, MemoryEntry>();

  getRaw(key: string): string | null {
    const v = this.map.get(key);
    return v ? v.raw : null;
  }

  setRaw(key: string, raw: string): void {
    this.map.set(key, { raw });
  }

  remove(key: string): void {
    this.map.delete(key);
  }

  clear(prefix?: string): void {
    if (!prefix) {
      this.map.clear();
      return;
    }
    for (const k of this.map.keys()) {
      if (k.startsWith(prefix)) this.map.delete(k);
    }
  }
}

