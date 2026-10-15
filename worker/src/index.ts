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

const CANONICAL_HOST = "autoopulence.co.uk";
// The CRM enquiry bot (chat assistant). Its answers, pages and leads are managed in the CRM.
// CRM site search & AI assistant (CRM → Marketing → Site search & AI). Always added; switched on/off in the CRM.
const SITE_SEARCH_SCRIPT = '<script src="https://crm.racecargraphics.uk/embed/site-search.js" data-key="cf3dec2d53f08dd72a8af483" defer></script>';
// Search icon in the header, beside Customer login. Hidden until the site search script switches it on.
const SITE_SEARCH_BUTTON = '<button type="button" class="customer-login-link" data-site-search hidden aria-label="Search the site" style="display:none;background:none;cursor:pointer;font:inherit"><svg stroke="currentColor" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" height="17" width="17"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg><span>Search</span></button>';
const ENQUIRY_BOT_SCRIPT = '<script src="https://crm.racecargraphics.uk/rcg-enquiry-bot.js" data-bot-key="a13cbd35-f793-4389-b26e-8064e45ac31d" defer></script>';
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

  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    setEnv(env);
    let response: Response;
    try {
      response = await handle(request, env);
    } catch (error) {
      console.error("Unhandled error", error instanceof Error ? error.stack || error.message : error);
      response = Response.json({ error: "Something went wrong. Please call 0330 053 6925." }, { status: 500 });
    }
    const preview = new URL(request.url).hostname.endsWith(".workers.dev");
    const bot = String(env.ENQUIRY_BOT || "preview");
    if ((bot === "live" || (bot === "preview" && preview)) && (response.headers.get("content-type") || "").includes("text/html")) {
      response = new HTMLRewriter().on("body", { element(body) { body.append(ENQUIRY_BOT_SCRIPT, { html: true }); } }).transform(response);
    }
    if ((response.headers.get("content-type") || "").includes("text/html")) {
      let searchButton = false;
      response = new HTMLRewriter()
        .on("header.site-header a.customer-login-link", { element(link) { if (!searchButton) { link.before(SITE_SEARCH_BUTTON, { html: true }); searchButton = true; } } })
        .on("body", { element(body) { body.append(SITE_SEARCH_SCRIPT, { html: true }); } })
        .transform(response);
    }
    // Keep the workers.dev preview address out of Google; only the real domain should be indexed.
    if (preview) {
      response = new Response(response.body, response);
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  },
};
