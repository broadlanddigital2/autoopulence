// Step 0: empties dist/ so pages removed from the source don't linger.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const OUT = process.env.OUT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dist");
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
