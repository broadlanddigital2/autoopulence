// Cloudflare Worker for autoopulence.co.uk. Every request passes through here first:
//  1. www.autoopulence.co.uk and plain http are sent to https://autoopulence.co.uk with a 301,
//     so Google only ever sees one copy of each page.
//  2. /api/* runs the site's own route handlers from source/app (enquiry form, security question, postcode lookup).
//     Bookings are handled by the CRM booking widget, which talks to the CRM directly.
//  3. Everything else is a static file from dist/ (pages, images, sitemap.xml, robots.txt).
import { setEnv, type Env } from "./env";
import * as enquiry from "../../source/app/api/enquiry/route";
import * as captcha from "../../source/app/api/enquiry/captcha/route";
import * as addressLookup from "../../source/app/api/address-lookup/route";
import { runUptimePinger } from "./uptime-pinger";
// @ts-ignore plain JS module shared with the LeMan Cave and Race Car Graphics workers
import { blogResponse, addPostsToSitemap } from "./crm-blog.js";

// Blog: posts written and approved in the CRM (Marketing → Blog posts), rendered on request into the /blog shell page.
const BLOG = {
  feedUrl: "https://dipjypzrfigkzuarlsov.supabase.co/functions/v1/seo-blog",
  feedKey: "8c92192d-7364-4da2-9dab-0872a457aa84", // seo_sites.feed_key for Auto Opulence
  origin: "https://autoopulence.co.uk",
  basePath: "/blog",
  shellPath: "/blog",
  siteName: "Auto Opulence",
  blogName: "Blog",
  blogTitle: "Vehicle care blog",
  kicker: "Auto Opulence blog · Norwich",
  intro: "Car-care advice, seasonal tips and news from our indoor valeting and detailing studio in Norwich.",
  guidesPath: "/guides",
  ctaHtml: '<p><strong>Want it done properly?</strong> Choose a service and book online, or ask us about your vehicle.</p><p><a class="crmblog-btn" href="/services">View services</a> <a class="crmblog-btn2" href="/contact">Ask Auto Opulence</a></p>',
  css: `.crmblog{max-width:860px;margin:0 auto;color:#101519}
.crmblog-list{max-width:1180px}
.crmblog-crumbs{font-size:.8rem;color:#5e6970;margin:0 0 18px}.crmblog-crumbs a{color:#5e6970}.crmblog-crumbs span:last-child{color:#089fd8}
.crmblog-kicker,.crmblog-meta{margin:0 0 12px;color:#089fd8;font-size:.78rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
.crmblog h1{margin:0 0 18px;font-size:clamp(2.6rem,5vw,4.6rem);line-height:.98;letter-spacing:-.055em}
.crmblog-post h1{font-size:clamp(2.2rem,4vw,3.6rem)}
.crmblog-intro,.crmblog-lead{font-size:1.15rem;color:#536168;max-width:720px;margin:0 0 34px}
.crmblog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.crmblog-card{display:flex;flex-direction:column;background:#fff;border:1px solid #e3eaed;transition:.22s ease}
.crmblog-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(28,52,63,.12)}
.crmblog-card img,.crmblog-noimg{width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;display:block;background:#dde5e8}
.crmblog-cardbody{display:flex;flex-direction:column;gap:8px;padding:22px 22px 24px;border-top:4px solid #089fd8}
.crmblog-card .crmblog-meta{margin:0;font-size:.7rem}
.crmblog-card h2{margin:0;font-size:1.35rem;line-height:1.15}
.crmblog-excerpt{color:#5e6970;font-size:.95rem}
.crmblog-more{color:#089fd8;font-weight:800;font-size:.88rem}
.crmblog-empty{color:#5e6970}.crmblog-empty a{color:#087eaa;font-weight:800}
.crmblog-hero{width:100%;height:auto;margin:0 0 30px}
.crmblog-body{font-size:1.08rem;line-height:1.75;color:#2c383e}
.crmblog-body h2{margin:44px 0 14px;font-size:2rem;line-height:1.1;letter-spacing:-.035em;color:#101519}
.crmblog-body h3{margin:28px 0 10px;font-size:1.3rem;color:#101519}
.crmblog-body p{margin:0 0 18px}.crmblog-body ul,.crmblog-body ol{margin:0 0 18px;padding-left:24px}.crmblog-body li{margin:0 0 8px}
.crmblog-body a{color:#087eaa;font-weight:800;text-decoration:underline;text-decoration-color:#9eddf4;text-underline-offset:3px}
.crmblog-body blockquote{margin:0 0 18px;padding:14px 20px;border-left:4px solid #089fd8;background:#e8f2f6}
.crmblog-cta{margin:44px 0 0;padding:30px;background:#e8f2f6}
.crmblog-cta p{margin:0 0 14px}.crmblog-cta p:last-child{margin:0}
.crmblog-btn,.crmblog-btn2{display:inline-flex;align-items:center;min-height:48px;margin:4px 10px 0 0;padding:0 22px;border-radius:4px;font-weight:800}
.crmblog-btn{background:#089fd8;color:#fff}.crmblog-btn2{border:1px solid #87cbe3;color:#087eaa}
.crmblog-back{margin:30px 0 0}.crmblog-back a{color:#087eaa;font-weight:800}`,
};

const CANONICAL_HOST = "autoopulence.co.uk";
// The CRM enquiry bot (chat assistant). Its answers, pages and leads are managed in the CRM.
// CRM site search & AI assistant (CRM → Marketing → Site search & AI). Always added; switched on/off in the CRM.
const SITE_SEARCH_SCRIPT = '<script src="https://crm.racecargraphics.uk/embed/site-search.js" data-key="cf3dec2d53f08dd72a8af483" defer></script>';
// The search icon in the header is part of the site (source/components/site-chrome.tsx, data-site-search, hidden
// until the site search script switches it on). Adding it from here broke React hydration and blanked the booking form.
const ENQUIRY_BOT_SCRIPT = '<script src="https://crm.racecargraphics.uk/rcg-enquiry-bot.js" data-bot-key="a13cbd35-f793-4389-b26e-8064e45ac31d" defer></script>';
// Customer pages rendered by the CRM app (loan vehicle form) are served under autoopulence.co.uk, so customers stay
// on this site. Their scripts/images (/_next/..., logos) come from the CRM when the site itself doesn't have them.
const CRM_ORIGIN = "https://crm.racecargraphics.uk";
const CRM_PAGES = /^\/loan\/[^/]+\/?$/;
const CRM_PAGE_REFERERS = /^\/loan(\/|$)/;
async function fromCrm(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, CRM_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete("host"); headers.delete("cookie");
  headers.set("x-forwarded-host", url.host);
  const upstream = await fetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body, redirect: "manual" });
  const response = new Response(upstream.body, upstream);
  const location = response.headers.get("location");
  if (location) { try { const l = new URL(location, target); if (l.host === target.host) response.headers.set("location", l.pathname + l.search + l.hash); } catch { /* leave as is */ } }
  response.headers.delete("set-cookie");
  if (CRM_PAGES.test(url.pathname)) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

type Handler = (request: Request) => Response | Promise<Response>;
type RouteModule = Partial<Record<"GET" | "POST", Handler>>;

const apiRoutes: [RegExp, RouteModule][] = [
  [/^\/api\/enquiry\/captcha\/?$/, captcha],
  [/^\/api\/enquiry\/?$/, enquiry],
  [/^\/api\/address-lookup\/?$/, addressLookup],
];

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.hostname === `www.${CANONICAL_HOST}` || (url.hostname === CANONICAL_HOST && url.protocol === "http:")) {
    return Response.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
  }

  if (url.pathname.startsWith("/api/")) {
    const match = apiRoutes.find(([pattern]) => pattern.test(url.pathname));
    const handler = match?.[1][request.method as "GET" | "POST"];
    if (!match) return Response.json({ error: "Not found." }, { status: 404 });
    if (!handler) return Response.json({ error: "Method not allowed." }, { status: 405, headers: { allow: Object.keys(match[1]).filter((k) => k === "GET" || k === "POST").join(", ") } });
    // On the workers.dev preview only: add the logged reason to error replies, to make setup problems visible.
    if (!url.hostname.endsWith(".workers.dev")) return handler(request);
    const logged: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => { logged.push(args.map((a) => typeof a === "string" ? a : a instanceof Error ? a.message : JSON.stringify(a)).join(" ")); original(...args); };
    try {
      const response = await handler(request);
      if (response.status < 500 || !logged.length) return response;
      const data = await response.clone().json().catch(() => null) as { error?: string } | null;
      if (!data) return response;
      return Response.json({ ...data, error: `${data.error || "Error"} [preview detail: ${logged.join(" | ").slice(0, 500)}]` }, { status: response.status });
    } finally { console.error = original; }
  }

  if (CRM_PAGES.test(url.pathname)) return fromCrm(request);
  const blog = await blogResponse(request, env, BLOG);
  if (blog) return blog;
  if (url.pathname === "/sitemap.xml") {
    const res = await env.ASSETS.fetch(request);
    if (!res.ok) return res;
    return new Response(await addPostsToSitemap(await res.text(), BLOG), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
  }
  const response = await env.ASSETS.fetch(request);
  if (response.status === 404) {
    if (url.pathname.startsWith("/_next/")) return fromCrm(request);
    try { const ref = new URL(request.headers.get("referer") || ""); if (ref.host === url.host && CRM_PAGE_REFERERS.test(ref.pathname)) return fromCrm(request); } catch { /* no referer */ }
  }
  return response;
}

export default {
  // External uptime pinger for the CRM (every 5 minutes, wrangler.jsonc "triggers"). See uptime-pinger.ts.
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(runUptimePinger(env as never).catch((error) => console.error("Uptime pinger failed", error)));
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    setEnv(env);
    // Run the uptime pinger by hand on the workers.dev preview address only (no emails unless something is down).
    if (new URL(request.url).pathname === "/__uptime-pinger" && new URL(request.url).hostname.endsWith(".workers.dev")) return Response.json(await runUptimePinger(env as never));
    let response: Response;
    try {
      response = await handle(request, env);
    } catch (error) {
      console.error("Unhandled error", error instanceof Error ? error.stack || error.message : error);
      response = Response.json({ error: "Something went wrong. Please call 0330 053 6925." }, { status: 500 });
    }
    const preview = new URL(request.url).hostname.endsWith(".workers.dev");
    // CRM pages (loan form) are left untouched: extra scripts would break their React page.
    if (CRM_PAGES.test(new URL(request.url).pathname)) return response;
    const bot = String(env.ENQUIRY_BOT || "preview");
    if ((bot === "live" || (bot === "preview" && preview)) && (response.headers.get("content-type") || "").includes("text/html")) {
      response = new HTMLRewriter().on("body", { element(body) { body.append(ENQUIRY_BOT_SCRIPT, { html: true }); } }).transform(response);
    }
    if ((response.headers.get("content-type") || "").includes("text/html")) {
      response = new HTMLRewriter().on("body", { element(body) { body.append(SITE_SEARCH_SCRIPT, { html: true }); } }).transform(response);
    }
    // Keep the workers.dev preview address out of Google; only the real domain should be indexed.
    if (preview) {
      response = new Response(response.body, response);
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  },
};
