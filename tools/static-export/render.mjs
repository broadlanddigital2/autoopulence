// Step 2 of the static export: renders every route to dist/<route>.html with the same <head> tags Next.js
// would produce from each page's metadata (title, description, canonical, robots, Open Graph, Twitter, icons),
// plus dist/sitemap.xml, dist/robots.txt and dist/404.html.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || path.resolve(HERE, "../../dist");
const S = await import(path.join(HERE, "gen/server.mjs"));
const root = S.layout.metadata;
const base = new URL(String(root.metadataBase || "https://autoopulence.co.uk"));

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const abs = (u) => (u == null ? u : new URL(String(u), base).href);
const meta = (attr, key, content) => (content == null || content === "" ? "" : `<meta ${attr}="${key}" content="${esc(content)}">`);
const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function robotsContent(r) {
  if (!r) return "";
  if (typeof r === "string") return r;
  const parts = [];
  if (r.index !== undefined) parts.push(r.index ? "index" : "noindex");
  if (r.follow !== undefined) parts.push(r.follow ? "follow" : "nofollow");
  for (const k of ["noarchive", "nosnippet", "noimageindex", "nocache"]) if (r[k]) parts.push(k);
  for (const k of ["max-image-preview", "max-snippet", "max-video-preview"]) if (r[k] !== undefined) parts.push(`${k}:${r[k]}`);
  return parts.join(", ");
}

// Next.js merges metadata shallowly: a page's key replaces the layout's key of the same name.
function headTags(page) {
  const m = { ...root, ...page };
  const title = typeof m.title === "string" ? m.title : m.title?.absolute || m.title?.default;
  const t = [`<title>${esc(title)}</title>`, meta("name", "description", m.description)];
  t.push(meta("name", "application-name", m.applicationName));
  for (const a of list(m.authors)) { if (a.url) t.push(`<link rel="author" href="${esc(abs(a.url))}">`); t.push(meta("name", "author", a.name)); }
  t.push(meta("name", "creator", m.creator), meta("name", "publisher", m.publisher), meta("name", "category", m.category));
  if (m.keywords) t.push(meta("name", "keywords", list(m.keywords).join(",")));
  t.push(meta("name", "robots", robotsContent(m.robots)));
  if (m.robots?.googleBot) t.push(meta("name", "googlebot", robotsContent(m.robots.googleBot)));
  if (m.alternates?.canonical) t.push(`<link rel="canonical" href="${esc(abs(m.alternates.canonical))}">`);
  const og = m.openGraph;
  if (og) {
    t.push(meta("property", "og:title", og.title ?? title), meta("property", "og:description", og.description ?? m.description));
    t.push(meta("property", "og:url", og.url && abs(og.url)), meta("property", "og:site_name", og.siteName), meta("property", "og:locale", og.locale));
    for (const img of list(og.images)) {
      const i = typeof img === "string" ? { url: img } : img;
      t.push(meta("property", "og:image", abs(i.url)), meta("property", "og:image:width", i.width), meta("property", "og:image:height", i.height), meta("property", "og:image:alt", i.alt));
    }
    t.push(meta("property", "og:type", og.type || "website"));
  }
  const tw = m.twitter;
  if (tw) {
    t.push(meta("name", "twitter:card", tw.card), meta("name", "twitter:title", tw.title ?? title), meta("name", "twitter:description", tw.description ?? m.description));
    for (const img of list(tw.images)) t.push(meta("name", "twitter:image", abs(typeof img === "string" ? img : img.url)));
  }
  const icons = m.icons || {};
  for (const i of list(icons.icon)) { const x = typeof i === "string" ? { url: i } : i; t.push(`<link rel="icon" href="${esc(x.url)}"${x.type ? ` type="${esc(x.type)}"` : ""}${x.sizes ? ` sizes="${esc(x.sizes)}"` : ""}>`); }
  for (const i of list(icons.shortcut)) t.push(`<link rel="shortcut icon" href="${esc(typeof i === "string" ? i : i.url)}">`);
  for (const i of list(icons.apple)) t.push(`<link rel="apple-touch-icon" href="${esc(typeof i === "string" ? i : i.url)}">`);
  return t.filter(Boolean).join("\n");
}

// Third-party script from app/layout.tsx (EnquiryBot chat launcher).
const layoutScripts = `<script type="text/javascript" src="https://launcher.enquirybot.com/index.js" data-bot-id="99b5f5bc-3f84-4f5d-a655-ed9eacd4558c" defer></script>`;

function documentHtml({ head, body, route }) {
  return `<!DOCTYPE html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
<link rel="stylesheet" href="/_static/site.css">
<script type="module" src="/_static/app.js"></script>
</head><body class="antialiased"><div id="root"${route ? ` data-route="${esc(route)}"` : ""}>${body}</div>${layoutScripts}</body></html>
`;
}

const routes = await S.allRoutes();
for (const route of routes) {
  globalThis.__AO_ROUTE = route;
  const head = headTags(await S.pageMetadata(route));
  const body = S.renderToString(await S.pageElement(route));
  const file = path.join(OUT, route === "/" ? "index.html" : route.slice(1) + ".html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, documentHtml({ head, body, route }));
}

// 404 page (served by Cloudflare for unknown URLs). Rendered without hydration.
{
  const h = S.createElement;
  globalThis.__AO_ROUTE = "/404";
  const body = S.renderToString(h(S.Shell, null, h(S.Header), h("main", { className: "booking-payment-page" },
    h("section", { className: "booking-receipt shell", "aria-labelledby": "not-found-title" }, h("div", { className: "booking-receipt__intro" },
      h("span", { className: "section-kicker" }, "404 · Page not found"),
      h("h1", { id: "not-found-title" }, "We couldn't find that page."),
      h("p", null, "It may have moved. Browse our services, or call us on 0330 053 6925."),
      h("p", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 } }, h("a", { className: "button", href: "/services" }, "Browse services"), h("a", { className: "button button--ghost", href: "/" }, "Back to the home page"))))), h(S.Footer)));
  const head = headTags({ title: "Page not found | Auto Opulence", robots: { index: false, follow: true }, alternates: {}, openGraph: undefined, twitter: undefined });
  fs.writeFileSync(path.join(OUT, "404.html"), documentHtml({ head, body: body, route: null }).replace('<script type="module" src="/_static/app.js"></script>\n', ""));
}

// sitemap.xml and robots.txt from source/app/sitemap.ts and robots.ts
const urls = S.sitemap();
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `<url>\n<loc>${esc(u.url)}</loc>\n${u.lastModified ? `<lastmod>${new Date(u.lastModified).toISOString()}</lastmod>\n` : ""}${u.changeFrequency ? `<changefreq>${u.changeFrequency}</changefreq>\n` : ""}${u.priority != null ? `<priority>${u.priority}</priority>\n` : ""}</url>`).join("\n") + "\n</urlset>\n";
fs.writeFileSync(path.join(OUT, "sitemap.xml"), xml);
const r = S.robots();
const lines = [];
for (const rule of list(r.rules)) {
  for (const ua of list(rule.userAgent)) lines.push(`User-Agent: ${ua}`);
  for (const a of list(rule.allow)) lines.push(`Allow: ${a}`);
  for (const d of list(rule.disallow)) lines.push(`Disallow: ${d}`);
  lines.push("");
}
if (r.host) lines.push(`Host: ${r.host}`);
for (const s of list(r.sitemap)) lines.push(`Sitemap: ${s}`);
fs.writeFileSync(path.join(OUT, "robots.txt"), lines.join("\n") + "\n");
console.log("rendered", routes.length, "pages, 404, sitemap with", urls.length, "URLs, robots.txt");
