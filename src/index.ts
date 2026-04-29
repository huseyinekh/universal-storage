import { createStorage as _createStorage } from "./core/storageFactory";
import type { UniversalStorage } from "./core/types";

export const createStorage = _createStorage;

let _defaultStorage: UniversalStorage | null = null;

export const getDefaultStorage = (): UniversalStorage => {
  if (_defaultStorage) return _defaultStorage;
  _defaultStorage = _createStorage();
  return _defaultStorage;
};

export const storage = getDefaultStorage();

export default storage;
export type {
  AsyncStorage,
  CookieOptions,
  CookieStorage,
  CreateStorageOptions,
  StorageChangeEvent,
  SyncStorage,
  UniversalStorage,
} from "./core/types";
