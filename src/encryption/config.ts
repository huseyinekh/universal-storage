import type { EncryptionConfig, StorageKind } from "../core/types";

export type ResolvedEncryption = {
  enabledFor: Record<StorageKind, boolean>;
  secret: string;
};

const kindEnabled = (cfg: EncryptionConfig | undefined, kind: StorageKind): boolean | undefined => {
  if (!cfg) return undefined;
  if (kind === "local") return cfg.local?.enabled;
  if (kind === "session") return cfg.session?.enabled;
  if (kind === "cookie") return cfg.cookie?.enabled;
  return cfg.db?.enabled;
};

export const resolveEncryption = (cfg: EncryptionConfig | undefined): ResolvedEncryption => {
  const baseEnabled = cfg?.enabled === true;
  const secret = (cfg?.secret && cfg.secret.length > 0 ? cfg.secret : "khid");

  const enabledFor = {
    local: kindEnabled(cfg, "local") ?? baseEnabled,
    session: kindEnabled(cfg, "session") ?? baseEnabled,
    cookie: kindEnabled(cfg, "cookie") ?? baseEnabled,
    db: kindEnabled(cfg, "db") ?? baseEnabled,
  };

  return { enabledFor, secret };
};

