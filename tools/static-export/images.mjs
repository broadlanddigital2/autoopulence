// Image pass over the built pages (runs after copy-assets), so every page benefits without touching each component:
//  • a PNG/JPEG that has a WebP version next to it (public/…/name.webp) is served as the WebP (smaller, faster);
//  • images on this site without width/height get them from the file itself (stops the page jumping as it loads);
//  • alt text that is just the file name gets the page's heading added, so it describes the picture in context.
// The SEO optimiser (CRM) flags these; this keeps them fixed for new pages too.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || path.resolve(HERE, "../../dist");
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const OWN = /^https?:\/\/(www\.)?autoopulence\.co\.uk(?=\/)/i;

function size(file) {
  let b; try { b = fs.readFileSync(file); } catch { return null; }
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)]; // PNG
  if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const k = b.toString("ascii", 12, 16);
    if (k === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (k === "VP8L") { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1]; }
    if (k === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  }
  if (b[0] === 0xff && b[1] === 0xd8) { // JPEG: find a SOF marker
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  }
  if (b.toString("ascii", 0, 3) === "GIF") return [b.readUInt16LE(6), b.readUInt16LE(8)];
  return null;
}
const local = (src) => {
  const s = decode(src).replace(OWN, "");
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  try { return decodeURIComponent(s.split(/[?#]/)[0]); } catch { return s.split(/[?#]/)[0]; }
};
const webpFor = (src) => {
  const p = local(src); if (!p || !/\.(png|jpe?g)$/i.test(p)) return null;
  const w = p.replace(/\.(png|jpe?g)$/i, ".webp");
  return fs.existsSync(path.join(OUT, w)) ? encodeURI(w).replace(/&/g, "&amp;") : null;
};
const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag); return m ? m[1] : null; };
const enc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []);
const dims = new Map();
let pages = 0, swapped = 0, sized = 0, alts = 0;
for (const file of walk(OUT)) {
  const html = fs.readFileSync(file, "utf8");
  const h1 = decode((/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  let changed = false;
  const out = html.replace(/<img\b[^>]*>/gi, (tag) => {
    let t = tag;
    const src = attr(t, "src"); if (!src || src.startsWith("data:")) return tag;
    const webp = webpFor(src);
    if (webp) { t = t.replace(/\ssrc="[^"]*"/i, ` src="${webp}"`); swapped++; }
    const set = attr(t, "srcSet") ?? attr(t, "srcset");
    if (set) { const next = set.split(",").map((part) => { const [u, ...rest] = part.trim().split(/\s+/); const w = webpFor(u); return [w || u, ...rest].join(" "); }).join(", "); if (next !== set) t = t.replace(/\ssrc[sS]et="[^"]*"/, (m) => m.replace(set, next)); }
    if (!attr(t, "width") || !attr(t, "height")) {
      const p = local(attr(t, "src") || "");
      if (p && !/\.svg$/i.test(p)) {
        if (!dims.has(p)) dims.set(p, size(path.join(OUT, p)));
        const d = dims.get(p);
        if (d && d[0] && d[1]) { t = t.replace(/\s(width|height)="[^"]*"/gi, "").replace(/^<img/i, `<img width="${d[0]}" height="${d[1]}"`); sized++; }
      }
    }
    const alt = attr(t, "alt");
    if (alt && h1) {
      const file = decodeURIComponent((local(src) || src).split("/").pop() || "").replace(/\.\w+$/, "").replace(/[-_]+/g, " ").trim().toLowerCase();
      const a = decode(alt).trim();
      if (file && a.toLowerCase() === file && !a.toLowerCase().includes(h1.toLowerCase())) { t = t.replace(/\salt="[^"]*"/i, ` alt="${enc(`${a} – ${h1}`)}"`); alts++; }
    }
    if (t !== tag) changed = true;
    return t;
  });
  if (changed) { fs.writeFileSync(file, out); pages++; }
}
console.log(`images: ${pages} pages updated · ${swapped} WebP swaps · ${sized} sizes added · ${alts} alt texts`);
