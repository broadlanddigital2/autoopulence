import { siteUrl } from "./seo";

// Accept the provider's appended path and previously issued URLs missing the
// separator before "ext". Never use a return token as proof of payment.
export function handleSimplyBookPaymentReturn(request: Request): Response {
  const url = new URL(request.url);
  const match = /^\/booking\/payment-complete\/?ext\/invoice-payment\/(return|cancel)\/system\/[a-zA-Z0-9_-]+\/invoice_id\/([1-9]\d*)\/?$/.exec(url.pathname);
  const headers = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
  if (!match || !Number.isSafeInteger(Number(match[2]))) return new Response("Invalid payment return address.", { status: 400, headers });
  const destination = new URL("/booking/payment-complete", siteUrl);
  destination.searchParams.set("invoiceId", match[2]);
  // Drop all provider query parameters, especially _at, before rendering HTML
  // or loading assets. The receipt uses the existing encrypted booking cookie.
  return new Response(null, { status: 303, headers: { ...headers, Location: destination.href } });
}
