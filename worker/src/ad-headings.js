// Page headings per Google Ads ad group, set in the CRM (Marketing → Ads → campaign → Page headings).
//
// Every ad click arrives with ?ag=<ad group id> (the campaign's final URL suffix). When that ad group has a heading for
// this exact page, the page's main heading (its first H1) and, if one was set, the paragraph straight after it are
// swapped for that visitor. Everyone else, every other page and any unknown ag value get the page unchanged, and the
// page's canonical link stays the plain address, so Google's index never sees the swapped wording.
//
// The pages are React and re-render in the browser (hydration), which would put the old wording back. So the Worker
// also leaves window.__AO_AD_HEADING in the page ({ from, h1, fromSub, subheading }) and the browser bundle
// (tools/static-export/build.mjs → client-entry, adHeadingTree) makes the same swap before it hydrates.
//
// The headings come from the CRM's ad_landing_headings table; fetch-crm.mjs copies them into
// source/lib/crm/ad-headings.json on every publish (hourly): { "<ad group id>": { path, h1, subheading } }.

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// React leaves <!-- --> between neighbouring bits of text; those are not tags.
const noComments = (html) => String(html || "").replace(/<!--[\s\S]*?-->/g, "");
const text = (html) => noComments(html).replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, "\u00a0").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const plain = (html) => !/<[a-z/]/i.test(noComments(html)); // only text inside (no links, spans or line breaks)
const pathOf = (pathname) => pathname.replace(/\.html$/, "").replace(/\/+$/, "") || "/";

// The heading for this request, or null.
export function headingFor(url, headings) {
  const ag = (url.searchParams.get("ag") || "").replace(/\D/g, "");
  const h = ag && headings ? headings[ag] : null;
  if (!h || !h.h1 || pathOf(url.pathname) !== pathOf(h.path || "")) return null;
  return h;
}

// Swap the page's main heading (and the paragraph under it) in its HTML. Returns null when the page's heading isn't
// plain text, so it is left alone (the browser could not make the same swap and would put the old one back).
export function swapHeading(html, h) {
  const main = html.indexOf("<main");
  const re = /<h1\b([^>]*)>([\s\S]*?)<\/h1>/g;
  re.lastIndex = main >= 0 ? main : 0;
  const m = re.exec(html);
  if (!m || !plain(m[2]) || !text(m[2])) return null;
  const info = { from: text(m[2]), h1: h.h1 };
  let rest = html.slice(re.lastIndex);
  if (h.subheading) {
    const p = /^\s*<p\b([^>]*)>([\s\S]*?)<\/p>/.exec(rest);
    if (p && plain(p[2]) && text(p[2])) {
      info.fromSub = text(p[2]);
      info.subheading = h.subheading;
      rest = rest.slice(0, p.index) + `<p${p[1]}>${esc(h.subheading)}</p>` + rest.slice(p.index + p[0].length);
    }
  }
  let out = html.slice(0, m.index) + `<h1${m[1]}>${esc(h.h1)}</h1>` + rest;
  const script = `<script>window.__AO_AD_HEADING=${JSON.stringify(info).replace(/</g, "\\u003c")}</script>`;
  out = out.includes("</head>") ? out.replace("</head>", script + "</head>") : script + out;
  return out;
}

// Apply to a page response when the request is an ad click with a heading for this page.
export async function withAdHeading(request, response, headings) {
  if (request.method !== "GET" || response.status !== 200) return response;
  if (!(response.headers.get("content-type") || "").includes("text/html")) return response;
  const h = headingFor(new URL(request.url), headings);
  if (!h) return response;
  const original = await response.text();
  const html = swapHeading(original, h);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  if (html == null) return new Response(original, { status: response.status, statusText: response.statusText, headers });
  headers.set("x-ad-heading", "1");
  headers.set("cache-control", "private, no-store");
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
