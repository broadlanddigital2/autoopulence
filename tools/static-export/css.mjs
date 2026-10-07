// Step 4: compiles source/app/globals.css with Tailwind 4 into dist/_static/site.css, then stamps the
// two unhashed entry files (app.js, site.css) in every page with a content hash so browsers pick up new builds.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
import { compile } from "tailwindcss";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(HERE, "../../source");
const OUT = process.env.OUT || path.resolve(HERE, "../../dist");
const TW = path.join(process.env.NODE_PATHS || path.join(HERE, "node_modules"), "tailwindcss");
// tw-animate-css only adds animation utilities; it isn't installed here, so that import is dropped.
const css = fs.readFileSync(path.join(SOURCE, "app/globals.css"), "utf8").replace(/@import\s+["']tw-animate-css["'];?/, "");
const compiler = await compile(css, {
  base: path.join(SOURCE, "app"),
  async loadStylesheet(id, base) {
    const file = id === "tailwindcss" ? path.join(TW, "index.css") : id.startsWith("tailwindcss/") ? path.join(TW, id.slice(12).replace(/(\.css)?$/, ".css")) : path.resolve(base, id);
    return { path: file, base: path.dirname(file), content: fs.readFileSync(file, "utf8") };
  },
  async loadModule(id) { throw new Error("module not available: " + id); },
});
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const cand = new Set();
for (const f of [...["app", "components", "lib"].flatMap((d) => walk(path.join(SOURCE, d))), ...walk(path.join(HERE, "shims"))].filter((f) => /\.(tsx?)$/.test(f)))
  for (const t of fs.readFileSync(f, "utf8").split(/[\s"'`{}();,<>]+/)) if (t && t.length < 120) cand.add(t);
const extra = fs.readFileSync(path.join(HERE, "extra.css"), "utf8");
fs.mkdirSync(path.join(OUT, "_static"), { recursive: true });
fs.writeFileSync(path.join(OUT, "_static/site.css"), compiler.build([...cand]) + "\n" + extra);

const stamp = crypto.createHash("sha256").update(fs.readFileSync(path.join(OUT, "_static/app.js"))).update(fs.readFileSync(path.join(OUT, "_static/site.css"))).digest("hex").slice(0, 10);
let pages = 0;
for (const f of walk(OUT).filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(f, "utf8");
  const next = html.replace(/\/_static\/(app\.js|site\.css)(\?v=[0-9a-f]+)?"/g, `/_static/$1?v=${stamp}"`);
  if (next !== html) { fs.writeFileSync(f, next); pages++; }
}
console.log("css written; asset version", stamp, "stamped in", pages, "pages");
