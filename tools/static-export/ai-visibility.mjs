// AI assistant visibility at build time (shared by the Auto Opulence and LeMan Cave builds; settings in
// ai-visibility.json next to this file). Race Car Graphics has its own versions (llms.mjs, indexnow.mjs).
//
//   node ai-visibility.mjs llms      write <out>/llms.txt: the intro (business facts, guidance) followed by every page in
//                                    the sitemap, grouped, with its heading, description and lowest price (from its
//                                    structured data), so ChatGPT, Claude, Perplexity… get an up-to-date map of the site
//   node ai-visibility.mjs prepare   IndexNow: list the sitemap pages whose words changed since the last submission
//                                    (indexnow-state.json, committed) in gen-indexnow.json
//   node ai-visibility.mjs submit    send that list to api.indexnow.org (Bing, which ChatGPT search and Copilot use, plus
//                                    Yandex, Seznam, Naver). Exits 1 if refused, so the workflow keeps the old state.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const C = JSON.parse(fs.readFileSync(path.join(HERE, "ai-visibility.json"), "utf8"));
const OUT = process.env.OUT || path.resolve(HERE, C.out);
const STATE = path.join(HERE, "indexnow-state.json"), PENDING = path.join(HERE, "gen-indexnow.json");

const decode = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
function sitemapUrls() {
  const xml = fs.readFileSync(path.join(OUT, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
}
function htmlFor(url) {
  const p = new URL(url).pathname.replace(/\/+$/, "");
  for (const f of p ? [`${p}.html`, `${p}/index.html`] : ["/index.html"]) {
    const file = path.join(OUT, f);
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  }
  return null;
}
function lowestPrice(html) {
  const prices = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const walk = (o) => {
      if (!o || typeof o !== "object") return;
      if (Array.isArray(o)) return o.forEach(walk);
      for (const k of ["price", "lowPrice", "minPrice"]) if (o[k] != null && !Number.isNaN(Number(o[k])) && Number(o[k]) > 0) prices.push(Number(o[k]));
      for (const v of Object.values(o)) if (v && typeof v === "object") walk(v);
    };
    try { walk(JSON.parse(m[1])); } catch { /* not JSON */ }
  }
  return prices.length ? Math.min(...prices) : null;
}

function llms() {
  const intro = fs.readFileSync(path.join(HERE, C.intro), "utf8").trim();
  const groups = C.groups.map(([title, re]) => ({ title, re: new RegExp(re), items: [] }));
  const other = { title: C.otherTitle || "Other pages", items: [] };
  const skip = C.exclude ? new RegExp(C.exclude) : null;
  for (const url of sitemapUrls()) {
    const p = new URL(url).pathname.replace(/\/+$/, "") || "/";
    if (skip && skip.test(p)) continue;
    const html = htmlFor(url); if (!html) continue;
    const h1 = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]);
    const title = (h1 || decode((html.match(/<title>([^<]*)/i) || [])[1]).replace(/\s*[|–-]\s*[^|–-]*$/, "")).replace(/\.$/, "");
    let desc = decode((html.match(/<meta name="description" content="([^"]*)"/i) || [])[1]);
    if (C.stripFromDescriptions) desc = desc.replace(new RegExp(C.stripFromDescriptions, "i"), "").trim();
    if (desc && !/[.!?]$/.test(desc)) desc += ".";
    const price = lowestPrice(html);
    const line = `- [${title || p}](${url})${desc || price ? ": " : ""}${desc}${price ? ` ${C.pricePrefix || "From"} £${Number.isInteger(price) ? price : price.toFixed(2)}.` : ""}`;
    (groups.find((g) => g.re.test(p)) || other).items.push(line);
  }
  const body = [...groups, other].filter((g) => g.items.length).map((g) => `## ${g.title}\n\n${g.items.join("\n")}`).join("\n\n");
  const text = `${intro}\n\n${body}\n`;
  fs.writeFileSync(path.join(OUT, "llms.txt"), text);
  console.log(`llms.txt: ${[...groups, other].reduce((n, g) => n + g.items.length, 0)} pages (${Math.round(text.length / 1024)} KB)`);
}

function fingerprint(html) {
  const pick = (re) => (html.match(re) || [])[1] || "";
  const main = (html.match(/<main\b[\s\S]*<\/main>/i) || [html.replace(/<head>[\s\S]*?<\/head>/gi, "")])[0];
  const words = main.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return crypto.createHash("sha1").update([pick(/<title>([^<]*)/), pick(/<meta name="description" content="([^"]*)"/), pick(/<link rel="canonical" href="([^"]*)"/), words].join("\n")).digest("hex").slice(0, 16);
}
function prepare() {
  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE, "utf8")).pages || {}; } catch { /* first run: every page is new */ }
  const next = {}, changed = [];
  for (const url of sitemapUrls()) {
    const html = htmlFor(url); if (!html) continue;
    next[url] = fingerprint(html);
    if (state[url] !== next[url]) changed.push(url);
  }
  if (!changed.length && Object.keys(next).length === Object.keys(state).length) { console.log("IndexNow: no content changes"); fs.rmSync(PENDING, { force: true }); return; }
  fs.writeFileSync(STATE, JSON.stringify({ _readme: "Content fingerprints of the pages last sent to IndexNow (ai-visibility.mjs). Delete a line to resend that page.", pages: Object.fromEntries(Object.keys(next).sort().map((u) => [u, next[u]])) }, null, 1) + "\n");
  fs.writeFileSync(PENDING, JSON.stringify(changed));
  console.log(`IndexNow: ${changed.length} new or changed page(s) to submit`);
}
async function submit() {
  let urls = [];
  try { urls = JSON.parse(fs.readFileSync(PENDING, "utf8")); } catch { /* nothing pending */ }
  if (!urls.length) { console.log("IndexNow: nothing to submit"); return; }
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: C.host, key: C.indexNowKey, keyLocation: `https://${C.host}/${C.indexNowKey}.txt`, urlList: urls.slice(0, 10000) }),
  });
  const msg = `IndexNow: submitted ${Math.min(urls.length, 10000)} URL(s): HTTP ${res.status} ${(await res.text()).slice(0, 200).replace(/\s+/g, " ")}`;
  console.log(process.env.GITHUB_ACTIONS ? `::${res.ok ? "notice" : "warning"}::${msg}` : msg);
  if (!res.ok) process.exitCode = 1;
}

const mode = process.argv[2];
if (mode === "llms") llms();
else if (mode === "prepare") prepare();
else if (mode === "submit") await submit();
else { console.error("usage: node ai-visibility.mjs llms|prepare|submit"); process.exit(2); }
