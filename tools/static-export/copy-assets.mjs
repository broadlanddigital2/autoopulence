// Step 3: copies source/public (images, logos, llms.txt), the browser bundle and site-extras (_headers) into dist/.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || path.resolve(HERE, "../../dist");
fs.cpSync(path.resolve(HERE, "../../source/public"), OUT, { recursive: true });
for (const f of ["file.svg", "globe.svg", "window.svg"]) fs.rmSync(path.join(OUT, f), { force: true }); // Next.js starter leftovers
fs.rmSync(path.join(OUT, "_static"), { recursive: true, force: true });
fs.cpSync(path.join(HERE, "gen/client"), path.join(OUT, "_static"), { recursive: true });
fs.cpSync(path.join(HERE, "site-extras"), OUT, { recursive: true });
console.log("assets copied");
