import { createStorage } from "../src/index";

type User = { id: string; name: string };

const storage = createStorage({ namespace: "demo" });

storage.local.set<User>("user", { id: "1", name: "Ada" });
const user = storage.local.get<User>("user");
console.log(user);

storage.cookie.set("token", "abc", { expires: 7, sameSite: "lax" });
console.log(storage.cookie.get<string>("token"));

await storage.db.set("large_data", { ok: true });
console.log(await storage.db.get("large_data"));

