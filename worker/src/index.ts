// Cloudflare Worker for autoopulence.co.uk. Every request passes through here first:
//  1. www.autoopulence.co.uk and plain http are sent to https://autoopulence.co.uk with a 301,
//     so Google only ever sees one copy of each page.
//  2. /api/* and the SimplyBook payment-return address run the site's own route handlers from source/app.
//  3. Everything else is a static file from dist/ (pages, images, sitemap.xml, robots.txt).
import { setEnv, type Env } from "./env";
import * as enquiry from "../../source/app/api/enquiry/route";
import * as captcha from "../../source/app/api/enquiry/captcha/route";
import * as addressLookup from "../../source/app/api/address-lookup/route";
import * as simplybook from "../../source/app/api/simplybook/[...endpoint]/route";
import { handleSimplyBookPaymentReturn } from "../../source/lib/simplybook-payment-return";

const CANONICAL_HOST = "autoopulence.co.uk";
type Handler = (request: Request) => Response | Promise<Response>;
type RouteModule = Partial<Record<"GET" | "POST", Handler>>;

const apiRoutes: [RegExp, RouteModule][] = [
  [/^\/api\/enquiry\/captcha\/?$/, captcha],
  [/^\/api\/enquiry\/?$/, enquiry],
  [/^\/api\/address-lookup\/?$/, addressLookup],
  [/^\/api\/simplybook\/.+/, simplybook],
];

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.hostname === `www.${CANONICAL_HOST}` || (url.hostname === CANONICAL_HOST && url.protocol === "http:")) {
    return Response.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
  }

  if (/^\/booking\/payment-complete\/?ext\/invoice-payment\//.test(url.pathname)) return handleSimplyBookPaymentReturn(request);

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
