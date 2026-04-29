import "./style.css";
import storage, { configureDefaults, createStorage, getStorage } from "web-universal-storage";

type StorageKind = "local" | "session" | "cookie" | "db";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const parseValue = (text: string): unknown => {
  const t = text.trim();
  if (t.length === 0) return "";
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
};

const stringify = (v: unknown): string => {
  if (v === null) return "null";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

const setOutput = (text: string) => {
  $("#out").textContent = text;
};

const getSelectedStorage = (kind: StorageKind, mode: "default" | "getStorage" | "createStorage") => {
  if (mode === "default") return storage[kind];

  const ns = ($("#namespace") as HTMLInputElement).value.trim();
  const instance =
    mode === "getStorage" ? getStorage({ namespace: ns || undefined }) : createStorage({ namespace: ns || undefined });
  return instance[kind];
};

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="wrap">
    <header>
      <h1>web-universal-storage playground</h1>
      <p>Smoke-test all storages + defaults in a real browser.</p>
    </header>

    <section class="card">
      <h2>Defaults</h2>
      <div class="grid">
        <label>Cookie sameSite
          <select id="sameSite">
            <option value="">(unset)</option>
            <option value="lax" selected>lax</option>
            <option value="strict">strict</option>
            <option value="none">none</option>
          </select>
        </label>
        <label>Cookie secure
          <select id="secure">
            <option value="">(unset)</option>
            <option value="true" selected>true</option>
            <option value="false">false</option>
          </select>
        </label>
        <label>Cookie path
          <input id="path" value="/" />
        </label>
      </div>
      <div class="row">
        <button id="applyDefaults">Apply defaults (global)</button>
        <span class="hint">Affects default storage and any instance that doesn't override defaults.</span>
      </div>
    </section>

    <section class="card">
      <h2>Operations</h2>
      <div class="grid">
        <label>Instance
          <select id="instanceMode">
            <option value="default" selected>default import</option>
            <option value="getStorage">getStorage({ namespace })</option>
            <option value="createStorage">createStorage({ namespace })</option>
          </select>
        </label>
        <label>Namespace
          <input id="namespace" placeholder="app" />
        </label>
        <label>Storage
          <select id="kind">
            <option value="local" selected>local</option>
            <option value="session">session</option>
            <option value="cookie">cookie</option>
            <option value="db">db (IndexedDB)</option>
          </select>
        </label>
        <label>Key
          <input id="key" value="demo" />
        </label>
      </div>

      <label>Value (JSON or string)
        <textarea id="value" rows="6">{ "hello": "world" }</textarea>
      </label>

      <div class="row">
        <button id="btnSet">set</button>
        <button id="btnGet">get</button>
        <button id="btnRemove">remove</button>
        <button id="btnClear">clear</button>
      </div>

      <h3>Output</h3>
      <pre id="out"></pre>
    </section>
  </div>
`;

$("#applyDefaults").addEventListener("click", () => {
  const sameSite = ($("#sameSite") as HTMLSelectElement).value as "" | "lax" | "strict" | "none";
  const secureRaw = ($("#secure") as HTMLSelectElement).value as "" | "true" | "false";
  const path = ($("#path") as HTMLInputElement).value.trim();

  configureDefaults({
    cookieDefaults: {
      ...(sameSite ? { sameSite } : {}),
      ...(secureRaw ? { secure: secureRaw === "true" } : {}),
      ...(path ? { path } : {}),
    },
  });

  setOutput("Defaults applied.");
});

$("#btnSet").addEventListener("click", async () => {
  const kind = ($("#kind") as HTMLSelectElement).value as StorageKind;
  const mode = ($("#instanceMode") as HTMLSelectElement).value as "default" | "getStorage" | "createStorage";
  const key = ($("#key") as HTMLInputElement).value;
  const value = parseValue(($("#value") as HTMLTextAreaElement).value);

  const api = getSelectedStorage(kind, mode) as unknown as {
    set: (k: string, v: unknown) => unknown;
  };

  await api.set(key, value);
  setOutput(`set ok (${kind})`);
});

$("#btnGet").addEventListener("click", async () => {
  const kind = ($("#kind") as HTMLSelectElement).value as StorageKind;
  const mode = ($("#instanceMode") as HTMLSelectElement).value as "default" | "getStorage" | "createStorage";
  const key = ($("#key") as HTMLInputElement).value;

  const api = getSelectedStorage(kind, mode) as unknown as {
    get: (k: string) => unknown;
  };

  const v = await api.get(key);
  setOutput(stringify(v));
});

$("#btnRemove").addEventListener("click", async () => {
  const kind = ($("#kind") as HTMLSelectElement).value as StorageKind;
  const mode = ($("#instanceMode") as HTMLSelectElement).value as "default" | "getStorage" | "createStorage";
  const key = ($("#key") as HTMLInputElement).value;

  const api = getSelectedStorage(kind, mode) as unknown as {
    remove: (k: string) => unknown;
  };

  await api.remove(key);
  setOutput(`remove ok (${kind})`);
});

$("#btnClear").addEventListener("click", async () => {
  const kind = ($("#kind") as HTMLSelectElement).value as StorageKind;
  const mode = ($("#instanceMode") as HTMLSelectElement).value as "default" | "getStorage" | "createStorage";

  const api = getSelectedStorage(kind, mode) as unknown as {
    clear: () => unknown;
  };

  await api.clear();
  setOutput(`clear ok (${kind})`);
});
