// CJS proxy so `require("universal-storage")` returns the default singleton (axios-like),
// while still exposing named exports as properties.
const mod = require("./dist/index.cjs");
const def = mod && mod.default ? mod.default : mod;
module.exports = def;
if (mod && typeof mod === "object") {
  Object.assign(module.exports, mod);
}

