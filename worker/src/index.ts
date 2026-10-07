// Cloudflare Worker for autoopulence.co.uk. Every request passes through here first:
//  1. www.autoopulence.co.uk and plain http are sent to https://autoopulence.co.uk with a 301,
//     so Google only ever sees one copy of each page.
//  2. /api/crm/booking forwards booking calls to the Race Car Graphics CRM (same system as racecargraphics.uk);
//     the other /api/* routes run the site's own route handlers from source/app.
//  3. Everything else is a static file from dist/ (pages, images, sitemap.xml, robots.txt).
import { setEnv, type Env } from "./env";
import * as enquiry from "../../source/app/api/enquiry/route";
import * as captcha from "../../source/app/api/enquiry/captcha/route";
import * as addressLookup from "../../source/app/api/address-lookup/route";

const CANONICAL_HOST = "autoopulence.co.uk";
type Handler = (request: Request) => Response | Promise<Response>;
type RouteModule = Partial<Record<"GET" | "POST", Handler>>;

const apiRoutes: [RegExp, RouteModule][] = [
  [/^\/api\/enquiry\/captcha\/?$/, captcha],
  [/^\/api\/enquiry\/?$/, enquiry],
  [/^\/api\/address-lookup\/?$/, addressLookup],
];

// The CRM booking function (Supabase). Called from this Worker rather than the browser, so the CRM doesn't need
// autoopulence.co.uk on its list of allowed browser origins. The publishable key is public (it's in RCG's pages too).
const CRM_BOOKING_URL = "https://dipjypzrfigkzuarlsov.supabase.co/functions/v1/booking-order-flow";
const CRM_PUBLISHABLE_KEY = "sb_publishable_KLK1Ucd9ilVSwzSGL1vkug_3SGGh4NF";

async function crmBooking(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "POST required" }, { status: 405, headers: { allow: "POST" } });
  const body = await request.text();
  if (body.length > 200_000) return Response.json({ error: "Request too large." }, { status: 413 });
  const headers: Record<string, string> = { "content-type": "application/json", apikey: String(env.CRM_PUBLISHABLE_KEY || CRM_PUBLISHABLE_KEY) };
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) headers.authorization = auth;
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) headers["x-forwarded-for"] = ip; // the CRM rate-limits sign-in codes per visitor
  const upstream = await fetch(String(env.CRM_BOOKING_URL || CRM_BOOKING_URL), { method: "POST", headers, body });
  return new Response(upstream.body, { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") || "application/json", "cache-control": "no-store, private" } });
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.hostname === `www.${CANONICAL_HOST}` || (url.hostname === CANONICAL_HOST && url.protocol === "http:")) {
    return Response.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
  }

  if (url.pathname === "/api/crm/booking") return crmBooking(request, env);

  if (url.pathname.startsWith("/api/")) {
    const match = apiRoutes.find(([pattern]) => pattern.test(url.pathname));
    const handler = match?.[1][request.method as "GET" | "POST"];
    if (!match) return Response.json({ error: "Not found." }, { status: 404 });
    if (!handler) return Response.json({ error: "Method not allowed." }, { status: 405, headers: { allow: Object.keys(match[1]).filter((k) => k === "GET" || k === "POST").join(", ") } });
    return handler(request);
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
    // Keep the workers.dev preview address out of Google; only the real domain should be indexed.
    if (new URL(request.url).hostname.endsWith(".workers.dev")) {
      response = new Response(response.body, response);
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  },
};
