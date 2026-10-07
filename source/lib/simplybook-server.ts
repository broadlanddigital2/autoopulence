import type { SimplyBookPackage, SimplyBookProduct, SimplyBookProvider, SimplyBookReceiptDetails, SimplyBookService } from "./simplybook";
import { isWeekdayDateKey } from "./booking-dates";
import { siteUrl } from "./seo";
import { createHash } from "node:crypto";

export type SimplyBookConfig = { company: string; restKey: string; rpcKey?: string; secretKey?: string; sessionSecret: string; sendBookingEmail?: (details: SimplyBookReceiptDetails & { bookingCode: string; packageName?: string }) => Promise<void> };
// Behind Traefik/nginx, TLS is terminated at the edge and the app only ever sees
// plain http internally, so request.url's origin cannot be trusted for this check.
const trustedOrigins = new Set([siteUrl, siteUrl.replace("https://", "https://www.")]);
const apiOrigin = "https://user-api-v2.simplybook.it";
const rpcOrigin = "https://user-api.simplybook.me";
const sessionCookie = "ao_simplybook_session";
const sessionCookiePath = "/";
const legacySessionCookiePath = "/api/simplybook";
const serviceIds = new Set([4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,25,26,27,28,29,41,42,43]);
const endpoints: Record<string, { method: string; params?: string[] }> = {
  services: { method: "GET" }, categories: { method: "GET" }, terms: { method: "GET" }, packages: { method: "GET" },
  providers: { method: "GET", params: ["serviceId"] }, products: { method: "GET", params: ["serviceId"] },
  availability: { method: "GET", params: ["serviceId", "providerId", "type", "date", "months"] },
  book: { method: "POST" }, "package/purchase": { method: "POST" }, "client/session": { method: "GET" }, "client/login": { method: "POST" },
  "client/register": { method: "POST" },
  "client/logout": { method: "POST" }, "client/remind-password": { method: "POST" },
  "client/dashboard": { method: "GET" }, "client/package-book": { method: "POST" },
  "payment/methods": { method: "GET" }, "payment/pay": { method: "POST" },
  "payment/invoice-status": { method: "GET", params: ["invoiceId"] },
  "payment/summary": { method: "GET", params: ["invoiceId"] },
  "payment/cancel": { method: "POST" },
};
type ClientIdentity = { id: number; hash: string };
type Session = { token: string; expires: number; invoiceId?: number; bookingCode?: string; bookingCodes?: string[]; bookingDates?: string[]; client?: boolean; clientIdentity?: ClientIdentity; receipt?: SimplyBookReceiptDetails; purchase?: { packageId: number; packageName: string; startDate: string; pendingAppointment?: { serviceId: number; providerId: number; date: string; time: string; productId?: number; vehicleRegistration: string }; firstAppointmentStatus?: "pending" | "booked" | "unavailable" | "failed"; firstAppointmentMessage?: string; firstAppointmentConfirmedAt?: number } };
type Token = { token: string };
type Invoice = { id: number; number: string; amount: number; rest_amount?: number; currency: string; status: string; payment_received?: boolean; token?: string; package_instances?: PackageInstance[] };
type BookingResult = { token?: string; require_confirm?: boolean | number | string; bookings: { id: number; code: string; hash?: string; booking_hash?: string; is_confirmed: boolean; start_datetime?: string }[] };
type ClientInfo = { id?: number | string; client_id?: number | string; clientId?: number | string; hash?: string; client_hash?: string; clientHash?: string; login_hash?: string; loginHash?: string; data?: unknown; client?: unknown; result?: unknown };
type Timeline = { date: string; slots: { time: string; available_count?: number | null }[] }[];
type TermsStatus = { enabled_simplybook_terms: boolean; enabled_user_terms: boolean; enabled_cancellation_terms: boolean; enabled_privacy_policy: boolean };
type Plugin = { key: string; is_active: string | number | boolean; is_turned_on: string | number | boolean };
type PaymentProcessor = { name: string; is_active: string | number | boolean };
const enabledTerms = (status: TermsStatus) => ({ simplybook_terms: !!status.enabled_simplybook_terms, user_terms: !!status.enabled_user_terms, cancellation_terms: !!status.enabled_cancellation_terms, privacy_policy: !!status.enabled_privacy_policy, promotion_letters: false });
const enabledPlugin = (plugins: Plugin[], key: string) => plugins.some(plugin => plugin.key === key && String(plugin.is_active) === "1" && String(plugin.is_turned_on) === "1");
class ApiError extends Error { constructor(message: string, public status = 400) { super(message); } }
// Cache resolved values only: Worker I/O promises belong to their own request.
const publicTokens = new Map<string, { token: string; expires: number }>();
const encoder = new TextEncoder();
type ListResponse<T> = T[] | {
  data?: T[] | { data?: T[]; bookings?: T[]; items?: T[]; results?: T[] };
  bookings?: T[];
  items?: T[];
  results?: T[];
};
const list = <T>(value: ListResponse<T>): T[] => {
  if (Array.isArray(value)) return value;
  for (const candidate of [value.data, value.bookings, value.items, value.results]) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      for (const nested of [candidate.data, candidate.bookings, candidate.items, candidate.results]) if (Array.isArray(nested)) return nested;
      const keyed = Object.entries(candidate).filter(([key]) => /^\d+$/.test(key));
      if (keyed.length) return keyed.map(([, item]) => item as T);
    }
  }
  const keyed = Object.entries(value).filter(([key]) => /^\d+$/.test(key));
  if (keyed.length) return keyed.map(([, item]) => item as T);
  return [];
};
const apiFlag = (value: unknown, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string") return !["0", "false", "no", "off"].includes(value.toLowerCase());
  return Boolean(value);
};
const clientIdentityFrom = (...values: unknown[]): ClientIdentity | undefined => {
  const visit = (value: unknown, depth = 0): ClientIdentity | undefined => {
    if (!value || typeof value !== "object" || depth > 3) return undefined;
    const item = value as ClientInfo;
    const id = Number(item.id || item.client_id || item.clientId);
    const hash = item.hash || item.client_hash || item.clientHash || item.login_hash || item.loginHash;
    if (Number.isSafeInteger(id) && id > 0 && typeof hash === "string" && hash) return { id, hash };
    return visit(item.data, depth + 1) || visit(item.client, depth + 1) || visit(item.result, depth + 1);
  };
  return values.map(value => visit(value)).find(Boolean);
};
const londonDateKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const packageCoversDate = (instance: PackageInstance, date: string) => (!instance.period_start || date >= instance.period_start) && (!instance.period_end || date <= instance.period_end);
const activePackage = (instance: PackageInstance) => ["paid", "active", "confirmed"].includes(String(instance.status || "").trim().toLowerCase());
const packageVisitSummary = (instance: PackageInstance) => {
  const remainingVisits = (instance.services || []).filter(service => Number(service.qty) > 0 && apiFlag(service.is_visible, true)).reduce((sum, service) => sum + Number(service.qty || 0), 0);
  const originalVisits = (instance.package?.services || []).reduce((sum, service) => sum + Number(service.qty || 0), 0);
  const definedVisits = Math.max(Number(instance.package?.package_limit || 0), originalVisits);
  const fallbackUsedVisits = Math.max(0, Number(instance.count_used_package_instance || 0) - 1);
  const totalVisits = definedVisits || remainingVisits + fallbackUsedVisits;
  return { remainingVisits, totalVisits, usedVisits: Math.max(0, totalVisits - remainingVisits) };
};
const positiveId = (value: unknown) => { const number = Number(value); if (!Number.isSafeInteger(number) || number <= 0) throw new ApiError("Invalid booking selection."); return number; };
const requireService = (value: unknown) => { const id = positiveId(value); if (!serviceIds.has(id)) throw new ApiError("This service is not available through this booking form."); return id; };
const stringValue = (value: unknown, max = 255) => { if (typeof value !== "string" || value.length > max) throw new ApiError("Please check your booking details."); return value.trim(); };
const canonicalTime = (value: string) => /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
const vehicleRegistration = (value: unknown) => {
  const registration = stringValue(value, 12).toUpperCase().replace(/\s+/g, " ");
  if (!/^[A-Z0-9 ]{2,12}$/.test(registration) || !/[A-Z]/.test(registration) || !/\d/.test(registration)) throw new ApiError("Enter a valid vehicle registration.");
  return registration;
};
const registrationNote = (registration: string) => `Vehicle registration: ${registration}`;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
const success = (data: unknown) => json({ success: true, data });
type PackageService = { id: number; service_id: number; qty: number; name?: string; is_visible?: boolean | number | string };
type PackageInstance = {
  id: number; package_id: number; created?: string; period_start: string; period_end: string; status: string;
  can_be_used: boolean | number | string; is_used: boolean | number | string; count_used_package_instance?: number;
  services?: PackageService[];
  package?: { id: number; name: string; package_limit?: number; services?: PackageService[] };
};
type BookingLabel = { id?: number | string; name?: string; title?: string; label?: string; display_name?: string };
type BookingInfo = {
  id?: number | string; booking_id?: number | string; code?: string; booking_code?: string;
  is_confirmed?: boolean | number | string; is_approved?: boolean | number | string; is_cancelled?: boolean | number | string;
  status?: string | BookingLabel; approve_status?: string; approval_status?: string; booking_status?: string; type?: string;
  payment_status?: string | BookingLabel; payment_state?: string; invoice_status?: string;
  invoice_payment_received?: boolean | number | string;
  invoice_id?: number | string;
  start_datetime?: string; start_date_time?: string; date_start?: string; start?: string; date?: string; time?: string;
  end_datetime?: string; end_date_time?: string; date_end?: string; end?: string;
  service_id?: number | string; event_id?: number | string; provider_id?: number | string; unit_id?: number | string;
  service?: BookingLabel | string | number; event?: BookingLabel | string | number;
  provider?: BookingLabel | string | number; unit?: BookingLabel | string | number;
  service_details?: BookingLabel; event_details?: BookingLabel; provider_details?: BookingLabel; unit_details?: BookingLabel;
  service_name?: string; event_name?: string; service_title?: string; event_title?: string;
  provider_name?: string; unit_name?: string; provider_title?: string; unit_title?: string;
  comment?: unknown; comments?: unknown; note?: unknown; notes?: unknown; description?: unknown; additional_info?: unknown; additional_fields?: unknown;
};
const bookingLabel = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim() && !/^\d+$/.test(value.trim())) return value.trim();
    if (value && typeof value === "object") {
      const item = value as BookingLabel;
      for (const label of [item.name, item.title, item.label, item.display_name]) if (typeof label === "string" && label.trim()) return label.trim();
    }
  }
  return "";
};
const bookingStatuses = (booking: BookingInfo) => [booking.approve_status, booking.approval_status, booking.booking_status, booking.status, booking.type].map(value => bookingLabel(value).toLowerCase()).filter(Boolean);
const bookingStatus = (booking: BookingInfo) => bookingStatuses(booking).join(" ");
const bookingPaymentConfirmed = (booking: BookingInfo) => apiFlag(booking.invoice_payment_received)
  || bookingLabel(booking.payment_status, booking.payment_state, booking.invoice_status).toLowerCase() === "paid";
const bookingIsConfirmed = (booking: BookingInfo) => {
  return apiFlag(booking.is_confirmed)
    || apiFlag(booking.is_approved)
    || bookingStatuses(booking).some(status => status === "confirmed" || status === "approved")
    || bookingPaymentConfirmed(booking);
};
const bookingWasCancelled = (booking: BookingInfo, status: string) => {
  const bookingStates = [status, booking.booking_status, booking.status, booking.type].map(value => bookingLabel(value).toLowerCase()).join(" ");
  const paymentStatus = bookingLabel(booking.payment_status, booking.payment_state, booking.invoice_status).toLowerCase();
  return apiFlag(booking.is_cancelled)
    || bookingStates.includes("cancel")
    || ["declined", "failed", "failure", "void", "expired"].some(value => bookingStates.includes(value))
    || paymentStatus.includes("cancel")
    || ["declined", "failed", "failure", "error", "void", "expired"].some(value => paymentStatus.includes(value));
};
const bookingVehicleRegistration = (booking: BookingInfo) => {
  const values = [booking.comment, booking.comments, booking.note, booking.notes, booking.description, booking.additional_info, booking.additional_fields];
  const visit = (value: unknown, depth = 0): string | undefined => {
    if (depth > 4 || value === null || value === undefined) return undefined;
    if (typeof value === "string") {
      const match = value.match(/vehicle\s+registration\s*[:#-]?\s*([A-Z0-9 ]{2,12})(?:\r?\n|$)/i);
      return match?.[1]?.trim().toUpperCase();
    }
    if (Array.isArray(value)) return value.map(item => visit(item, depth + 1)).find(Boolean);
    if (typeof value === "object") {
      const item = value as Record<string, unknown>;
      const label = String(item.label || item.name || item.title || item.key || "");
      if (/vehicle\s+registration/i.test(label)) {
        const candidate = item.value ?? item.answer ?? item.text;
        if (typeof candidate === "string" && /^[A-Z0-9 ]{2,12}$/i.test(candidate.trim())) return candidate.trim().toUpperCase();
      }
      return Object.values(item).map(child => visit(child, depth + 1)).find(Boolean);
    }
  };
  return values.map(value => visit(value)).find(Boolean);
};
const paid = (invoice: Invoice) => String(invoice.status || "").toLowerCase() === "paid" || invoice.payment_received === true;
const packageCovered = (invoice: Invoice) => paid(invoice) || (invoice.rest_amount !== undefined && Number(invoice.rest_amount) === 0);
const bookingStart = (booking: BookingInfo) => booking.start_datetime || booking.start_date_time || booking.date_start || booking.start || (booking.date ? `${booking.date} ${booking.time || "00:00:00"}` : "");
const bookingServiceId = (booking: BookingInfo) => Number(booking.service_id || booking.event_id || (typeof booking.service === "object" ? booking.service?.id : undefined) || (typeof booking.event === "object" ? booking.event?.id : undefined)) || 0;
const bookingProviderId = (booking: BookingInfo) => Number(booking.provider_id || booking.unit_id || (typeof booking.provider === "object" ? booking.provider?.id : undefined) || (typeof booking.unit === "object" ? booking.unit?.id : undefined)) || 0;
const bookingIdentity = (booking: BookingInfo) => String(
  booking.code || booking.booking_code || booking.id || booking.booking_id
  || `${bookingStart(booking)}|${bookingServiceId(booking)}|${bookingProviderId(booking)}`,
);
const registrationForPackage = (instance: PackageInstance, bookings: BookingInfo[], current?: Session) => {
  const serviceIds = new Set([...(instance.services || []), ...(instance.package?.services || [])].map(service => Number(service.service_id)));
  const matched = bookings.find(booking => {
    const start = bookingStart(booking).slice(0, 10);
    const serviceId = bookingServiceId(booking);
    return !bookingWasCancelled(booking, bookingStatus(booking)) && bookingVehicleRegistration(booking) && serviceIds.has(serviceId) && (!instance.period_start || start >= instance.period_start) && (!instance.period_end || start <= instance.period_end);
  });
  return (matched && bookingVehicleRegistration(matched)) || (current?.purchase?.packageId === Number(instance.package_id) ? current.purchase.pendingAppointment?.vehicleRegistration : undefined);
};
const isStripeProcessor = (name: string) => name.toLowerCase().includes("stripe");
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const bytes = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0));

async function encryptionKey(config: SimplyBookConfig) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`auto-opulence-simplybook-session-v1:${config.company}:${config.sessionSecret}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function sealSession(session: Session, config: SimplyBookConfig) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(config), encoder.encode(JSON.stringify(session)));
  return `${base64(iv)}.${base64(new Uint8Array(encrypted))}`;
}
export async function readSession(request: Request, config: SimplyBookConfig): Promise<Session | null> {
  const values = request.headers.get("Cookie")?.split(";").map(value => value.trim()).filter(value => value.startsWith(`${sessionCookie}=`)).map(value => value.slice(sessionCookie.length + 1)) || [];
  for (const raw of values) {
    if (!raw || raw.length > 4000) continue;
    try {
      const [iv, ciphertext] = raw.split(".");
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(iv) }, await encryptionKey(config), bytes(ciphertext));
      const session = JSON.parse(new TextDecoder().decode(plain)) as Session;
      if (session.expires > Date.now() && typeof session.token === "string") return session;
    } catch { /* Try another same-name cookie left by the legacy path. */ }
  }
  return null;
}
async function withSession(response: Response, session: Session, config: SimplyBookConfig) {
  const maxAge = Math.max(0, Math.floor((session.expires - Date.now()) / 1000));
  response.headers.append("Set-Cookie", `${sessionCookie}=; Path=${legacySessionCookiePath}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  response.headers.append("Set-Cookie", `${sessionCookie}=${await sealSession(session, config)}; Path=${sessionCookiePath}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
  return response;
}

export async function handleSimplyBook(request: Request, config: SimplyBookConfig, fetcher: typeof fetch = fetch): Promise<Response> {
  const incoming = new URL(request.url);
  const path = incoming.pathname.replace(/^\/api\/simplybook\//, "");
  const definition = endpoints[path];
  if (!definition) return json({ success: false, error: "Booking endpoint not found." }, 404);
  if (request.method !== definition.method) return json({ success: false, error: "Method not allowed." }, 405);
  let session: Session | null = null;
  let createdBooking = false;
  try {
    if (!config.company || !config.restKey || !config.sessionSecret) throw new ApiError("The booking connection is not configured. Please contact us.", 503);
    for (const [key, value] of incoming.searchParams) {
      if (!definition.params?.includes(key) || value.length > 100) throw new ApiError("Invalid booking parameters.");
    }
    let body: Record<string, unknown> = {};
    if (request.method === "POST") {
      const origin = request.headers.get("Origin") || "";
      const sameHost = (() => { try { return new URL(origin).host === incoming.host; } catch { return false; } })();
      if ((!trustedOrigins.has(origin) && !sameHost) || request.headers.get("Sec-Fetch-Site") === "cross-site") throw new ApiError("Please submit your booking from this website.", 403);
      if (!request.headers.get("Content-Type")?.startsWith("application/json")) throw new ApiError("JSON request required.", 415);
      if (Number(request.headers.get("Content-Length") || 0) > 32768) throw new ApiError("The booking request is too large.", 413);
      const raw = await request.text();
      if (encoder.encode(raw).length > 32768) throw new ApiError("The booking request is too large.", 413);
      try { body = JSON.parse(raw); } catch { throw new ApiError("Invalid booking request."); }
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError("Invalid booking request.");
    }
    session = await readSession(request, config);
    const call = async <T>(endpoint: string, token?: string, payload?: unknown, method?: "GET" | "POST" | "DELETE"): Promise<T> => {
      let response: Response;
      try {
        const requestMethod = method || (payload === undefined ? "GET" : "POST");
        response = await fetcher(new URL(endpoint, apiOrigin), {
          method: requestMethod, redirect: "manual", signal: AbortSignal.timeout(20000),
          headers: { Accept: "application/json", "Content-Type": "application/json", "Cache-Control": "no-store", ...(token ? { "X-Company-Login": config.company, "X-Token": token } : {}) },
          ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
        });
      } catch (error) {
        console.error("SimplyBook transport error", {
          endpoint: endpoint.split("?")[0],
          kind: error instanceof Error ? error.name : "UnknownError",
        });
        throw new ApiError("The booking system did not respond. Please try again shortly.", 502);
      }
      // Workers support manual redirects; never forward API credentials to a
      // redirect destination, even when it appears to be another SimplyBook URL.
      if (response.status >= 300 && response.status < 400) throw new ApiError("The booking system returned an unexpected redirect. Please try again shortly.", 502);
      if (response.status === 204) return true as T;
      let data: T & { message?: string; error?: string | { message?: string } };
      try { data = await response.json(); } catch { throw new ApiError("The booking system returned an unexpected response. Please try again shortly.", 502); }
      if (!response.ok) {
        console.error("SimplyBook API error", { endpoint: endpoint.split("?")[0], status: response.status });
        const error = typeof data.error === "string" ? data.error : data.error?.message;
        const detail = (error || data.message || "The booking system could not complete this request.").replace(/[a-f0-9]{40,}/gi, "[redacted]").slice(0, 400);
        throw new ApiError(response.status === 419 || response.status === 401 ? "Your booking session has expired. Please sign in again or reload the booking form." : detail, response.status === 419 ? 401 : response.status);
      }
      return data;
    };
    const rpcCall = async <T>(endpoint: string, rpcMethod: string, params: unknown[], token?: string): Promise<T> => {
      let response: Response;
      try {
        response = await fetcher(new URL(endpoint, rpcOrigin), {
          method: "POST", redirect: "manual", signal: AbortSignal.timeout(20000),
          headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { "X-Company-Login": config.company, "X-Token": token } : {}) },
          body: JSON.stringify({ jsonrpc: "2.0", method: rpcMethod, params, id: 1 }),
        });
      } catch (error) {
        console.error("SimplyBook confirmation transport error", { method: rpcMethod, kind: error instanceof Error ? error.name : "UnknownError" });
        throw new ApiError("The booking could not be confirmed. The selected slot has been released; please try again.", 502);
      }
      if (response.status >= 300 && response.status < 400) throw new ApiError("The booking could not be confirmed. The selected slot has been released; please try again.", 502);
      let data: { result?: T; error?: { message?: string } };
      try { data = await response.json(); } catch { throw new ApiError("The booking confirmation service returned an unexpected response.", 502); }
      if (!response.ok || data.error || data.result === undefined) {
        console.error("SimplyBook confirmation API error", { method: rpcMethod, status: response.status, hasRpcError: !!data.error });
        throw new ApiError("The booking could not be confirmed. The selected slot has been released; please try again.", 502);
      }
      return data.result;
    };
    let rpcToken: string | undefined;
    const confirmPackageBookings = async (bookings: BookingResult["bookings"] | undefined) => {
      if (!bookings?.length) throw new ApiError("The package booking confirmation was incomplete.", 502);
      if (!config.rpcKey || !config.secretKey) throw new ApiError("Package booking confirmation is not configured. The selected slot has been released.", 503);
      rpcToken ||= await rpcCall<string>("/login", "getToken", [config.company, config.rpcKey]);
      for (const booking of bookings) {
        const id = Number(booking.id);
        const hash = booking.hash || booking.booking_hash;
        if (!Number.isSafeInteger(id) || id <= 0 || !hash) throw new ApiError("The package booking confirmation was incomplete. The selected slot has been released.", 502);
        const sign = createHash("md5").update(`${id}${hash}${config.secretKey}`).digest("hex");
        const confirmed = await rpcCall<boolean>("/", "confirmBookingPayment", [id, "Package", sign], rpcToken);
        if (!confirmed) throw new ApiError("The package booking could not be confirmed. The selected slot has been released.", 502);
      }
    };
    const cancelBookings = async (bookings: BookingResult["bookings"] | undefined, token: string) => {
      let allCancelled = true;
      for (const booking of bookings || []) {
        const id = Number(booking.id);
        if (!Number.isSafeInteger(id) || id <= 0) continue;
        try {
          await call(`/public/booking/item/id/${id}`, token, undefined, "DELETE");
        } catch (error) {
          allCancelled = false;
          console.error("SimplyBook provisional booking cleanup failed", { bookingId: id, status: error instanceof ApiError ? error.status : 502 });
        }
      }
      return allCancelled;
    };
    const settledInvoice = async (id: number, token: string, settled: (invoice: Invoice) => boolean = paid) => {
      let invoice = await call<Invoice>(`/public/invoice/item/id/${id}`, token);
      for (let attempt = 0; attempt < 3 && !settled(invoice); attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
        invoice = await call<Invoice>(`/public/invoice/item/id/${id}`, token);
      }
      return invoice;
    };
    const authenticate = async () => {
      const result = await call<Token>("/public/auth/token", undefined, { company: config.company, key: config.restKey });
      if (!result.token) throw new ApiError("Booking-system authentication failed.", 502);
      return result.token;
    };
    let publicAuthentication: Promise<string> | undefined;
    const publicToken = async () => {
      const key = `${config.company}:${config.restKey}`;
      const cached = publicTokens.get(key);
      if (cached && cached.expires > Date.now()) return cached.token;
      // Deduplicate authentication only within this incoming request.
      publicAuthentication ||= authenticate();
      try {
        const token = await publicAuthentication;
        publicTokens.set(key, { token, expires: Date.now() + 45 * 60_000 });
        return token;
      } finally { publicAuthentication = undefined; }
    };
    const publicRead = async <T>(endpoint: string): Promise<T> => {
      try { return await call<T>(endpoint, await publicToken()); }
      catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        publicTokens.delete(`${config.company}:${config.restKey}`);
        return call<T>(endpoint, await publicToken());
      }
    };
    const startSession = async () => session || (session = { token: await authenticate(), expires: Date.now() + 50 * 60_000 });
    const requireSession = () => { if (!session) throw new ApiError("Your booking session has expired. Please sign in again or call us with your booking reference.", 401); return session; };
    const invoiceForSession = (id: unknown) => { const value = positiveId(id); const current = requireSession(); if (current.invoiceId !== value) throw new ApiError("This invoice does not belong to your booking session.", 403); return value; };
    const serviceId = () => requireService(incoming.searchParams.get("serviceId"));
    const timeline = async (id: number, provider: number, from: string, to: string) => publicRead<Timeline>(`/public/timeline/slots?${new URLSearchParams({ service_id: String(id), provider_id: String(provider), date_from: from, date_to: to, count: "1" })}`);

    if (path === "services") return success(list(await publicRead<SimplyBookService[] | { data: SimplyBookService[] }>("/public/services")).filter(service => serviceIds.has(Number(service.id))));
    if (path === "categories") return success(list(await publicRead<{ id: number }[] | { data: { id: number }[] }>("/public/categories")).filter(category => [1,2,3,4,9,10].includes(Number(category.id))));
    if (path === "packages") return success(list(await publicRead<SimplyBookPackage[] | { data: SimplyBookPackage[] }>("/public/packages")).filter(item => item.can_be_purchased && item.is_active && item.is_visible));
    if (path === "providers") return success(list(await publicRead<SimplyBookProvider[] | { data: SimplyBookProvider[] }>(`/public/providers?filter%5Bservice_id%5D=${serviceId()}`)));
    if (path === "products") return success(list(await publicRead<SimplyBookProduct[] | { data: SimplyBookProduct[] }>(`/public/products/service?filter%5Bservice_id%5D=${serviceId()}`)));
    if (path === "terms") {
      const [status, plugins] = await Promise.all([
        publicRead<TermsStatus>("/public/clients/terms"),
        publicRead<Plugin[] | { data: Plugin[] }>("/public/plugins").then(list),
      ]);
      const policies = await Promise.all(([
        ["Booking terms", "user-terms", status.enabled_user_terms],
        ["Cancellation terms", "cancellation-terms", status.enabled_cancellation_terms],
        ["Privacy policy", "privacy-policy", status.enabled_privacy_policy],
      ] as const).filter(([, , enabled]) => enabled).map(async ([title, endpoint]) => ({ title, content: await publicRead<string>(`/public/clients/${endpoint}`) })));
      return success({ policies, simplybook: status.enabled_simplybook_terms, accountRequired: enabledPlugin(plugins, "client_login") });
    }
    if (path === "availability") {
      const id = serviceId();
      const provider = positiveId(incoming.searchParams.get("providerId"));
      const type = incoming.searchParams.get("type");
      if (type === "slots") {
        const date = incoming.searchParams.get("date") || "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError("Please choose a valid appointment date.");
        if (!isWeekdayDateKey(date)) return success([]);
        const rows = await timeline(id, provider, date, date);
        return success(rows.find(row => row.date === date)?.slots.filter(slot => slot.available_count !== 0).map(slot => canonicalTime(slot.time)) || []);
      }
      if (type !== "dates") throw new ApiError("Invalid availability request.");
      const from = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const requestedMonths = Number(incoming.searchParams.get("months") || 3);
      const months = Number.isSafeInteger(requestedMonths) && requestedMonths >= 1 && requestedMonths <= 18 ? requestedMonths : 3;
      const end = new Date(`${from}T12:00:00Z`); end.setUTCMonth(end.getUTCMonth() + months);
      // SimplyBook limits the date span of an individual timeline request.
      const periods: [string, string][] = [];
      for (const cursor = new Date(`${from}T12:00:00Z`); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 14)) {
        const until = new Date(cursor); until.setUTCDate(until.getUTCDate() + 13);
        periods.push([cursor.toISOString().slice(0, 10), new Date(Math.min(until.getTime(), end.getTime())).toISOString().slice(0, 10)]);
      }
      const rows: Timeline = [];
      for (let index = 0; index < periods.length; index += 3) {
        rows.push(...(await Promise.all(periods.slice(index, index + 3).map(([from, to]) => timeline(id, provider, from, to)))).flat());
      }
      return success(rows.filter(row => isWeekdayDateKey(row.date) && row.slots.some(slot => slot.available_count !== 0)).map(row => row.date));
    }
    if (path === "client/session") {
      if (!session?.client) return success(null);
      try { return success(await call("/public/clients", session.token)); }
      catch (error) { if (error instanceof ApiError && error.status === 401) return success(null); throw error; }
    }
    if (path === "client/login" || path === "client/register") {
      // Credentials must always be checked with a fresh public token. Reusing a
      // client token from the cookie can leave login permanently stuck when
      // SimplyBook has expired that token but our signed cookie is still valid.
      const current: Session = { token: await authenticate(), expires: Date.now() + 50 * 60_000 };
      session = current;
      const email = stringValue(body.email);
      const password = typeof body.password === "string" && body.password.length <= 1024 ? body.password : "";
      if (!email || !password) throw new ApiError("Enter your email address and password.");
      let payload: Record<string, unknown> = { login: email, password, remember: false };
      if (path === "client/register") {
        if (body.acceptedTerms !== true) throw new ApiError("Please accept the account terms before continuing.");
        const name = stringValue(body.name); if (!name) throw new ApiError("Enter your full name.");
        payload = { email, password, name, phone: stringValue(body.phone || ""), terms: enabledTerms(await publicRead<TermsStatus>("/public/clients/terms")) };
      }
      const result = await call<Token & ClientInfo>(path === "client/register" ? "/public/clients/register" : "/public/clients/login", current.token, payload);
      if (!result.token) throw new ApiError("The booking system did not return a valid sign-in session.", 502);
      const profile = await call<ClientInfo>("/public/clients", result.token);
      let clientIdentity = clientIdentityFrom(result, profile);
      // The REST client session does not consistently expose the signing hash
      // needed by getClientBookings. Resolve it once while the password is in
      // memory, then retain only the id/hash in the encrypted HttpOnly cookie.
      if (!clientIdentity && path === "client/login" && config.rpcKey && config.secretKey) {
        try {
          rpcToken ||= await rpcCall<string>("/login", "getToken", [config.company, config.rpcKey]);
          const rpcClient = await rpcCall<ClientInfo>("/", "getClientInfoByLoginPassword", [email, password], rpcToken);
          clientIdentity = clientIdentityFrom(rpcClient);
        } catch (error) {
          console.warn("SimplyBook client booking identity unavailable", { status: error instanceof ApiError ? error.status : 502 });
        }
      }
      session = { token: result.token, expires: Date.now() + 50 * 60_000, client: true, ...(clientIdentity ? { clientIdentity } : {}) };
      return withSession(success(profile), session, config);
    }
    if (path === "client/logout") {
      if (session?.client) await call("/public/clients/logout", session.token, {});
      const response = success(true);
      response.headers.append("Set-Cookie", `${sessionCookie}=; Path=${legacySessionCookiePath}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
      response.headers.append("Set-Cookie", `${sessionCookie}=; Path=${sessionCookiePath}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
      return response;
    }
    if (path === "client/remind-password") { await call("/public/clients/remind-password", await publicToken(), { email: stringValue(body.email) }); return success(true); }
    if (path === "client/dashboard") {
      const current = requireSession();
      if (!current.client) throw new ApiError("Please sign in to view your packages and bookings.", 401);
      const [packageResponse, bookingResponse] = await Promise.all([
        call<ListResponse<PackageInstance>>("/public/packages/instances", current.token),
        // SimplyBook has returned both `data` and `bookings` envelopes across
        // API versions. Fetch the signed-in client's schedule and filter it
        // locally so an unsupported API filter cannot hide valid appointments.
        call<ListResponse<BookingInfo>>("/public/booking?order_field=date_start&order_direction=asc", current.token),
      ]);
      const today = londonDateKey();
      let rawBookings = list(bookingResponse);
      const sourceCounts = { rest: rawBookings.length, upcoming: 0, signed: 0 };
      // The client REST booking list can return an empty collection even when
      // the customer has upcoming appointments. Fall back to SimplyBook's
      // signed client-bookings method, which is the authoritative client
      // schedule and survives payment-session changes and cancelled checkouts.
      let hasDisplayableBooking = rawBookings.some(booking => {
        const start = bookingStart(booking);
        return !bookingWasCancelled(booking, bookingStatus(booking)) && (!start || start.slice(0, 10) >= today);
      });
      if (!hasDisplayableBooking) {
        try {
          const upcomingBookings = list(await call<ListResponse<BookingInfo>>("/public/booking?filter%5Bupcoming_only%5D=1&order_field=date_start&order_direction=asc", current.token));
          sourceCounts.upcoming = upcomingBookings.length;
          const upcomingKeys = new Set(upcomingBookings.map(booking => String(booking.id || booking.booking_id || booking.code || booking.booking_code || "")));
          rawBookings = [...upcomingBookings, ...rawBookings.filter(booking => !upcomingKeys.has(String(booking.id || booking.booking_id || booking.code || booking.booking_code || "")))];
          hasDisplayableBooking = upcomingBookings.some(booking => {
            const start = bookingStart(booking);
            return !bookingWasCancelled(booking, bookingStatus(booking)) && (!start || start.slice(0, 10) >= today);
          });
        } catch (error) {
          console.warn("SimplyBook upcoming booking filter unavailable", { status: error instanceof ApiError ? error.status : 502 });
        }
      }
      if (!hasDisplayableBooking && config.rpcKey && config.secretKey) {
        try {
          let clientIdentity = current.clientIdentity;
          if (!clientIdentity) clientIdentity = clientIdentityFrom(await call<ClientInfo>("/public/clients", current.token));
          if (clientIdentity) {
            current.clientIdentity = clientIdentity;
            rpcToken ||= await rpcCall<string>("/login", "getToken", [config.company, config.rpcKey]);
            const sign = createHash("md5").update(`${clientIdentity.id}${clientIdentity.hash}${config.secretKey}`).digest("hex");
            const signedBookings = list(await rpcCall<ListResponse<BookingInfo>>("/", "getClientBookings", [clientIdentity.id, sign, { upcoming_only: true, confirmed_only: false }], rpcToken));
            sourceCounts.signed = signedBookings.length;
            const signedKeys = new Set(signedBookings.map(booking => String(booking.id || booking.booking_id || booking.code || booking.booking_code || "")));
            rawBookings = [...signedBookings, ...rawBookings.filter(booking => !signedKeys.has(String(booking.id || booking.booking_id || booking.code || booking.booking_code || "")))];
          }
        } catch (error) {
          console.warn("SimplyBook client booking fallback unavailable", { status: error instanceof ApiError ? error.status : 502 });
        }
      }
      const activePackageInstances = list(packageResponse).filter(activePackage);
      const packageFundedBookingKeys = new Set<string>();
      for (const instance of activePackageInstances) {
        const remainingByService = new Map((instance.services || []).map(service => [Number(service.service_id), Number(service.qty || 0)]));
        const originalByService = new Map((instance.package?.services || []).map(service => [Number(service.service_id), Number(service.qty || 0)]));
        const serviceIdsForPackage = new Set([...remainingByService.keys(), ...originalByService.keys()].filter(id => id > 0));
        const candidatesByService = new Map<number, BookingInfo[]>();
        for (const booking of rawBookings) {
          const serviceId = bookingServiceId(booking);
          const start = bookingStart(booking).slice(0, 10);
          const matchesService = serviceIdsForPackage.has(serviceId) || (serviceId === 0 && serviceIdsForPackage.size === 1);
          if (!matchesService || !start || !packageCoversDate(instance, start) || bookingWasCancelled(booking, bookingStatus(booking))) continue;
          const matchedServiceId = serviceId || [...serviceIdsForPackage][0];
          const candidates = candidatesByService.get(matchedServiceId) || [];
          if (!candidates.some(candidate => bookingIdentity(candidate) === bookingIdentity(booking))) candidates.push(booking);
          candidatesByService.set(matchedServiceId, candidates);
        }
        const instanceFundedBookingKeys = new Set<string>();
        for (const serviceId of serviceIdsForPackage) {
          const usedForService = Math.max(0, Number(originalByService.get(serviceId) || 0) - Number(remainingByService.get(serviceId) || 0));
          const candidates = (candidatesByService.get(serviceId) || []).sort((left, right) => bookingStart(left).localeCompare(bookingStart(right)));
          for (const booking of candidates.slice(0, usedForService)) instanceFundedBookingKeys.add(bookingIdentity(booking));
        }
        // Some package responses expose only package_limit and the remaining
        // service quantities. Allocate any still-unassigned consumed visits to
        // the matching appointments so the confirmation state follows the same
        // totals shown in the package card.
        const unassignedUsedVisits = Math.max(0, packageVisitSummary(instance).usedVisits - instanceFundedBookingKeys.size);
        const unassignedCandidates = [...candidatesByService.values()].flat()
          .filter(booking => !instanceFundedBookingKeys.has(bookingIdentity(booking)))
          .sort((left, right) => bookingStart(left).localeCompare(bookingStart(right)));
        for (const booking of unassignedCandidates.slice(0, unassignedUsedVisits)) instanceFundedBookingKeys.add(bookingIdentity(booking));
        for (const key of instanceFundedBookingKeys) packageFundedBookingKeys.add(key);
      }
      const paidInvoiceIds = new Set(rawBookings.filter(bookingPaymentConfirmed).map(booking => Number(booking.invoice_id)).filter(id => Number.isSafeInteger(id) && id > 0));
      const paidSessionCodes = new Set<string>();
      if (current.invoiceId && (current.bookingCodes?.length || current.bookingCode)) {
        try {
          const sessionInvoice = await call<Invoice>(`/public/invoice/item/id/${current.invoiceId}`, current.token);
          if (paid(sessionInvoice)) for (const code of current.bookingCodes || [current.bookingCode || ""]) if (code) paidSessionCodes.add(code);
        } catch { /* Live booking data below remains authoritative when an old session invoice is unavailable. */ }
      }
      const packages = activePackageInstances.map(instance => {
        const remainingServices = (instance.services || []).filter(service => Number(service.qty) > 0 && apiFlag(service.is_visible, true));
        // `count_used_package_instance` includes provider bookkeeping and is
        // not the number of consumed appointment credits. Use one shared
        // summary for both the package card and appointment confirmation.
        const { remainingVisits, usedVisits, totalVisits } = packageVisitSummary(instance);
        return {
          instanceId: Number(instance.id), packageId: Number(instance.package_id), name: instance.package?.name || "Vehicle-care package",
          periodStart: instance.period_start, periodEnd: instance.period_end, status: instance.status,
          // A future-dated instance reports can_be_used=0 until its period
          // begins, but SimplyBook can still reserve a visit inside that period.
          canBeUsed: (apiFlag(instance.can_be_used, true) || instance.period_start > today) && !apiFlag(instance.is_used) && (!instance.period_end || instance.period_end >= today) && remainingVisits > 0,
          remainingVisits, usedVisits, totalVisits,
          vehicleRegistration: registrationForPackage(instance, rawBookings, current),
          services: remainingServices.map(service => ({ serviceId: Number(service.service_id), name: service.name || "Package service", remaining: Number(service.qty || 0) })),
        };
      });
      const normalizedBookings = rawBookings.map((booking, index) => {
        const start = bookingStart(booking);
        // The public booking endpoint has returned approval state under
        // `status`, `approve_status` and `approval_status` in different API
        // response variants. Service/provider labels can likewise be either
        // strings or nested objects. Normalise all supported shapes here so a
        // paid, approved appointment never appears as a generic pending item.
        const status = bookingStatus(booking);
        return {
          id: Number(booking.id || booking.booking_id) || -(index + 1), code: booking.code || booking.booking_code || "Pending reference",
          confirmed: bookingIsConfirmed(booking) || packageFundedBookingKeys.has(bookingIdentity(booking)) || paidInvoiceIds.has(Number(booking.invoice_id)) || paidSessionCodes.has(booking.code || booking.booking_code || ""), cancelled: bookingWasCancelled(booking, status),
          start, end: booking.end_datetime || booking.end_date_time || booking.date_end || booking.end || "",
          serviceId: bookingServiceId(booking), providerId: bookingProviderId(booking),
          serviceName: bookingLabel(booking.service, booking.event, booking.service_details, booking.event_details, booking.service_name, booking.event_name, booking.service_title, booking.event_title) || "Vehicle-care appointment",
          providerName: bookingLabel(booking.provider, booking.unit, booking.provider_details, booking.unit_details, booking.provider_name, booking.unit_name, booking.provider_title, booking.unit_title) || "Auto Opulence",
          vehicleRegistration: bookingVehicleRegistration(booking),
        };
      });
      // The account page is a confirmed-appointments view. A provider-side
      // provisional booking can outlive a removed or failed package briefly;
      // never expose that orphan as an upcoming customer appointment.
      const bookings = normalizedBookings.filter(booking => booking.confirmed && !booking.cancelled && (!booking.start || booking.start.slice(0, 10) >= today)).map(({ cancelled: _cancelled, ...booking }) => booking);
      if (!bookings.length) console.info("SimplyBook dashboard booking reconciliation", { ...sourceCounts, hasClientIdentity: !!current.clientIdentity, normalized: normalizedBookings.length, displayable: bookings.length });
      // A package-funded appointment can be confirmed before SimplyBook's
      // client booking list has caught up. Keep the paid confirmation visible
      // briefly from the signed session, but never revive a booking that the
      // live response already marks as cancelled.
      if (current.purchase?.firstAppointmentStatus === "booked" && current.bookingCode && current.receipt) {
        current.purchase.firstAppointmentConfirmedAt ||= Date.now();
        const knownBooking = normalizedBookings.some(booking => booking.code === current.bookingCode);
        if (!knownBooking && Date.now() - current.purchase.firstAppointmentConfirmedAt < 10 * 60_000) {
          bookings.push({
            id: -900000, code: current.bookingCode, confirmed: true,
            start: current.bookingDates?.[0] || `${current.receipt.date} ${current.receipt.time}`,
            end: "", serviceId: current.purchase.pendingAppointment?.serviceId || 0,
            providerId: current.purchase.pendingAppointment?.providerId || 0,
            serviceName: current.receipt.serviceName || "Vehicle-care appointment",
            providerName: "Auto Opulence", vehicleRegistration: current.receipt.vehicleRegistration,
          });
        }
      }
      return withSession(success({ packages, bookings }), current, config);
    }
    if (path === "client/package-book") {
      const current = requireSession();
      if (!current.client) throw new ApiError("Please sign in before booking a prepaid package visit.", 401);
      if (body.acceptedTerms !== true) throw new ApiError("Please accept the booking terms before continuing.");
      const packageInstanceId = positiveId(body.packageInstanceId);
      const id = requireService(body.serviceId);
      const provider = positiveId(body.providerId);
      const date = stringValue(body.date, 10);
      const rawTime = stringValue(body.time, 8);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(rawTime)) throw new ApiError("Please choose a valid appointment date and time.");
      if (!isWeekdayDateKey(date)) throw new ApiError("Bookings are available Monday to Friday. Please choose a weekday.");
      const time = canonicalTime(rawTime);
      const [packageResponse, bookingResponse, client, service, providers, termsStatus] = await Promise.all([
        call<PackageInstance[] | { data: PackageInstance[] }>("/public/packages/instances", current.token),
        call<ListResponse<BookingInfo>>("/public/booking?order_field=date_start&order_direction=asc", current.token),
        call<Record<string, unknown>>("/public/clients", current.token),
        publicRead<SimplyBookService>(`/public/services/item/id/${id}`),
        publicRead<SimplyBookProvider[] | { data: SimplyBookProvider[] }>(`/public/providers?filter%5Bservice_id%5D=${id}`).then(list),
        publicRead<TermsStatus>("/public/clients/terms"),
      ]);
      const packageInstance = list(packageResponse).find(instance => Number(instance.id) === packageInstanceId);
      if (!packageInstance) throw new ApiError("This package could not be found in your booking account.", 404);
      if (!activePackage(packageInstance)) throw new ApiError("This package is cancelled, failed or unpaid and can no longer be used.", 409);
      const storedRegistration = registrationForPackage(packageInstance, list(bookingResponse), current);
      if (!storedRegistration) throw new ApiError("The vehicle registration could not be verified for this package. Please call 0330 053 6925.", 409);
      const registration = vehicleRegistration(storedRegistration);
      const packageService = (packageInstance.services || []).find(item => Number(item.service_id) === id && Number(item.qty) > 0 && apiFlag(item.is_visible, true));
      if (apiFlag(packageInstance.is_used) || !packageService || !packageCoversDate(packageInstance, date)) throw new ApiError("This package has no prepaid visits remaining for the selected service and date.", 409);
      if (!apiFlag(service.is_active, true) || !apiFlag(service.is_visible, true)) throw new ApiError("This package service is not currently available online.");
      if (!providers.some(item => Number(item.id) === provider)) throw new ApiError("Please choose an available provider for this service.");
      const availability = await timeline(id, provider, date, date);
      if (!availability.find(row => row.date === date)?.slots.some(slot => canonicalTime(slot.time) === time && slot.available_count !== 0)) throw new ApiError("That appointment is no longer available. Please choose another time.", 409);
      const terms = enabledTerms(termsStatus);
      const invoice = await call<Invoice>("/public/invoice", current.token, { terms });
      if (invoice.token) current.token = invoice.token;
      current.invoiceId = positiveId(invoice.id);
      let result: BookingResult | undefined;
      try {
        result = await call<BookingResult>("/public/booking/item", current.token, {
          invoice_id: invoice.id, service_id: id, provider_id: provider,
          start_datetime: `${date} ${time}`, duration: service.duration, count: 1, products: [], terms, comment: registrationNote(registration),
        });
        createdBooking = true;
        await call<Invoice>(`/public/invoice/package/id/${invoice.id}`, current.token, { package_instance_id: packageInstanceId });
      } catch (error) {
        const released = await cancelBookings(result?.bookings, current.token);
        if (result?.bookings?.length && released) createdBooking = false;
        else if (error instanceof ApiError && error.status >= 500) createdBooking = true;
        throw error;
      }
      if (result.token) current.token = result.token;
      const bookingCode = result.bookings?.[0]?.code;
      if (!bookingCode) {
        if (await cancelBookings(result.bookings, current.token)) createdBooking = false;
        throw new ApiError("The package booking confirmation was incomplete. Please contact us before trying again.", 502);
      }
      const finalInvoice = await settledInvoice(invoice.id, current.token, packageCovered);
      if (!packageCovered(finalInvoice)) {
        if (await cancelBookings(result.bookings, current.token)) createdBooking = false;
        throw new ApiError("This visit was not fully covered by the selected package. The provisional slot has been released.", 409);
      }
      try {
        if (!paid(finalInvoice)) await confirmPackageBookings(result.bookings);
      } catch (error) {
        if (await cancelBookings(result.bookings, current.token)) createdBooking = false;
        throw error;
      }
      createdBooking = false;
      current.bookingCode = bookingCode; current.bookingCodes = [bookingCode];
      current.receipt = { serviceName: service.name.slice(0, 255), date, time, appointmentCount: 1, vehicleRegistration: registration, customerName: stringValue(client.name || ""), customerEmail: stringValue(client.email || ""), customerPhone: stringValue(client.phone || "") };
      if (config.sendBookingEmail) try { await config.sendBookingEmail({ ...current.receipt, bookingCode, packageName: packageInstance.package?.name }); } catch (error) { console.error("Package booking email failed", error instanceof Error ? error.message : "Unknown error"); }
      return withSession(success({ bookingCode, invoiceId: invoice.id, invoiceNumber: finalInvoice.number, appointmentCount: 1, vehicleRegistration: registration, remainingVisits: Math.max(0, Number(packageService.qty) - 1), paymentRequired: false }), current, config);
    }
    if (path === "package/purchase") {
      let current = requireSession();
      if (!current.client) throw new ApiError("Please sign in before purchasing a package.", 401);
      if (current.invoiceId) {
        const existing = await call<Invoice>(`/public/invoice/item/id/${current.invoiceId}`, current.token);
        if (!paid(existing)) {
          if (!current.purchase) throw new ApiError("Please finish or cancel your existing booking before purchasing a package.", 409);
          return success({ orderType: "package", packageName: current.purchase.packageName, invoiceId: current.invoiceId, invoiceNumber: existing.number, invoiceAmount: existing.amount, currency: existing.currency, paymentRequired: true, resumed: true });
        }
        current = session = { token: current.token, expires: current.expires, client: true, clientIdentity: current.clientIdentity };
      }
      const packageId = positiveId(body.packageId);
      const requestedStartDate = stringValue(body.startDate, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedStartDate) || Number.isNaN(new Date(`${requestedStartDate}T12:00:00Z`).getTime())) throw new ApiError("Choose a valid package start date.");
      const startDate = londonDateKey();
      if (requestedStartDate < startDate) throw new ApiError("The package start date cannot be in the past.");
      const [packages, termsStatus] = await Promise.all([
        publicRead<SimplyBookPackage[] | { data: SimplyBookPackage[] }>("/public/packages").then(list),
        publicRead<TermsStatus>("/public/clients/terms"),
      ]);
      const selected = packages.find(item => Number(item.id) === packageId && item.can_be_purchased && item.is_active && item.is_visible);
      if (!selected) throw new ApiError("This package is not available for online purchase.", 404);
      if (!Number.isFinite(Number(selected.price)) || Number(selected.price) <= 0) throw new ApiError("This package does not have a valid purchase price.");
      let pendingAppointment: { serviceId: number; providerId: number; date: string; time: string; productId?: number; vehicleRegistration: string } | undefined;
      if (body.appointment && typeof body.appointment === "object" && !Array.isArray(body.appointment)) {
        const appointment = body.appointment as Record<string, unknown>;
        const selectedServiceId = requireService(appointment.serviceId);
        const selectedProviderId = positiveId(appointment.providerId);
        const date = stringValue(appointment.date, 10);
        const rawTime = stringValue(appointment.time, 8);
        const registration = vehicleRegistration(appointment.vehicleRegistration);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(rawTime) || !isWeekdayDateKey(date)) throw new ApiError("Choose a valid weekday for the first package appointment.");
        if (!selected.services.some(service => Number(service.service_id) === selectedServiceId && Number(service.qty) > 0)) throw new ApiError("The selected service is not included in this package.");
        const productId = appointment.productId === undefined || appointment.productId === null ? undefined : positiveId(appointment.productId);
        if (productId && !selected.paid_attributes.some(item => Number(item.product_id) === productId && Number(item.qty) > 0)) throw new ApiError("The selected vehicle option is not included in this package.");
        const [providers, availability] = await Promise.all([
          publicRead<SimplyBookProvider[] | { data: SimplyBookProvider[] }>(`/public/providers?filter%5Bservice_id%5D=${selectedServiceId}`).then(list),
          timeline(selectedServiceId, selectedProviderId, date, date),
        ]);
        const time = canonicalTime(rawTime);
        if (!providers.some(provider => Number(provider.id) === selectedProviderId)) throw new ApiError("Choose an available provider for the package service.");
        if (!availability.find(row => row.date === date)?.slots.some(slot => canonicalTime(slot.time) === time && slot.available_count !== 0)) throw new ApiError("The first package appointment is no longer available. Please choose another time.", 409);
        pendingAppointment = { serviceId: selectedServiceId, providerId: selectedProviderId, date, time, productId, vehicleRegistration: registration };
      }
      let invoice = await call<Invoice>("/public/invoice", current.token, { terms: enabledTerms(termsStatus) });
      if (invoice.token) current.token = invoice.token;
      current.invoiceId = positiveId(invoice.id);
      try {
        invoice = await call<Invoice>(`/public/invoice/add-package/id/${invoice.id}`, current.token, { package_id: packageId, start_date: startDate });
      } catch (error) {
        if (error instanceof ApiError && error.status >= 500) createdBooking = true;
        throw error;
      }
      current.purchase = { packageId, packageName: selected.name.slice(0, 255), startDate, pendingAppointment, firstAppointmentStatus: pendingAppointment ? "pending" : undefined };
      current.bookingCode = undefined; current.bookingCodes = undefined; current.bookingDates = undefined; current.receipt = undefined;
      const finalInvoice = await call<Invoice>(`/public/invoice/item/id/${current.invoiceId}`, current.token);
      return withSession(success({ orderType: "package", packageName: selected.name, invoiceId: current.invoiceId, invoiceNumber: finalInvoice.number, invoiceAmount: finalInvoice.amount, currency: finalInvoice.currency, paymentRequired: !paid(finalInvoice) }), current, config);
    }
    if (path === "book") {
      if (session?.invoiceId) {
        // Reconcile the previous invoice before creating anything. A paid order
        // must not permanently lock this customer out of making another booking.
        const existing = await call<Invoice>(`/public/invoice/item/id/${session.invoiceId}`, session.token);
        if (!paid(existing)) {
          if (!session.bookingCode) throw new ApiError("We couldn’t confirm your previous booking. Please call 0330 053 6925 so we can check it before you try again.", 409);
          return success({ bookingCode: session.bookingCode, bookingCodes: session.bookingCodes, bookingDates: session.bookingDates, appointmentCount: session.receipt?.appointmentCount, invoiceId: session.invoiceId, invoiceNumber: existing.number, invoiceAmount: existing.amount, currency: existing.currency, paymentRequired: true, resumed: true });
        }
        // Keep the customer's authenticated session; replace the order only
        // when this explicit new-booking request passes the checks below.
        session = { token: session.token, expires: session.expires, client: session.client, clientIdentity: session.clientIdentity };
      }
      if (body.acceptedTerms !== true) throw new ApiError("Please accept the booking terms before continuing.");
      const id = requireService(body.serviceId); const provider = positiveId(body.providerId);
      const registration = vehicleRegistration(body.vehicleRegistration);
      if (!Array.isArray(body.appointments) || body.appointments.length !== 1) throw new ApiError("Please select the first appointment for this recurring service.");
      const appointments = (body.appointments as { date?: unknown; time?: unknown }[]).map(item => {
        const date = stringValue(item.date, 10); const time = stringValue(item.time, 8);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) throw new ApiError("Please select valid appointments.");
        return { date, time: canonicalTime(time) };
      });
      if (appointments.some(appointment => !isWeekdayDateKey(appointment.date))) throw new ApiError("Bookings are available Monday to Friday. Please choose a weekday.");
      const client = body.clientData as Record<string, unknown> | undefined;
      if (!client || !Array.isArray(body.products) || body.products.length > 20) throw new ApiError("Please check your booking details.");
      const clientData = Object.fromEntries(["name", "email", "phone", "address1", "address2", "city", "zip"].map(name => [name, stringValue(client[name] ?? "")]));
      if (!clientData.name || !clientData.email || !clientData.phone) throw new ApiError("Please provide your name, email and phone number.");
      const [service, availableProducts, providers, termsStatus, plugins] = await Promise.all([
        publicRead<SimplyBookService>(`/public/services/item/id/${id}`),
        publicRead<SimplyBookProduct[] | { data: SimplyBookProduct[] }>(`/public/products/service?filter%5Bservice_id%5D=${id}`).then(list),
        publicRead<SimplyBookProvider[] | { data: SimplyBookProvider[] }>(`/public/providers?filter%5Bservice_id%5D=${id}`).then(list),
        publicRead<TermsStatus>("/public/clients/terms"),
        publicRead<Plugin[] | { data: Plugin[] }>("/public/plugins").then(list),
      ]);
      if (!providers.some(item => item.id === provider)) throw new ApiError("Please choose an available provider for this service.");
      const products = (body.products as { productId: unknown; qty: unknown }[]).map(item => {
        const productId = positiveId(item.productId); const qty = positiveId(item.qty);
        if (!availableProducts.some(item => item.product.id === productId) || qty !== 1) throw new ApiError("Please select valid service options.");
        return { product_id: productId, qty };
      });
      if (new Set(products.map(item => item.product_id)).size !== products.length) throw new ApiError("Duplicate service options.");
      const deposits = availableProducts.filter(item => /deposit/i.test(item.product.name));
      if (deposits.some(item => !products.some(product => product.product_id === item.product.id))) throw new ApiError("The required damage deposit must be included.");
      const options = availableProducts.filter(item => !/deposit/i.test(item.product.name));
      if (options.length && products.filter(item => options.some(option => option.product.id === item.product_id)).length !== 1) throw new ApiError("Please select one vehicle size or service option.");
      const total = service.price + products.reduce((sum, product) => sum + (availableProducts.find(item => item.product.id === product.product_id)?.product.price || 0) * product.qty, 0);
      if (!service.is_active || !service.is_visible || total <= 0) throw new ApiError("Please call us to confirm the price and book this service.");
      const recurringSettings = service.recurring_settings;
      const appointmentCount = recurringSettings?.repeat_count && recurringSettings.repeat_count > 1 ? recurringSettings.repeat_count : 1;
      const availability = await timeline(id, provider, appointments[0].date, appointments[0].date);
      if (!availability.find(row => row.date === appointments[0].date)?.slots.some(slot => canonicalTime(slot.time) === appointments[0].time && slot.available_count !== 0)) throw new ApiError("The first appointment is no longer available. Please choose another time.", 409);
      let current = await startSession();
      if (enabledPlugin(plugins, "client_login") && !current.client) throw new ApiError("Please sign in or create a booking account before continuing.", 403);
      const terms = enabledTerms(termsStatus);
      let invoice: Invoice;
      try {
        invoice = await call<Invoice>("/public/invoice", current.token, current.client ? { terms } : { client: clientData, terms });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && current.client) throw new ApiError("Your booking session has expired. Please sign in again.", 401);
        throw error;
      }
      if (invoice.token) current.token = invoice.token;
      current.invoiceId = positiveId(invoice.id);
      let result: BookingResult;
      try {
        result = await call<BookingResult>("/public/booking/item", current.token, {
          invoice_id: invoice.id,
          service_id: id,
          provider_id: provider,
          start_datetime: `${appointments[0].date} ${appointments[0].time}`,
          duration: service.duration,
          ...(recurringSettings ? { recurring_settings: { ...recurringSettings, mode: "book_and_move" } } : { count: 1 }),
          ...(current.client ? {} : { client: clientData }),
          products,
          terms,
          comment: registrationNote(registration),
        });
        createdBooking = true;
      } catch (error) {
        if (error instanceof ApiError && error.status >= 500) createdBooking = true;
        if (recurringSettings && error instanceof ApiError && /appointments?.*(?:couldn.t|could not).*reserved/i.test(error.message)) {
          throw new ApiError("The booking system could not find a complete weekday schedule from that first appointment. Please choose another starting date or time.", 409);
        }
        throw error;
      }
      if (result.token) current.token = result.token;
      const bookingCodes = result.bookings?.map(booking => booking.code).filter(Boolean) || [];
      if (bookingCodes.length !== appointmentCount) throw new ApiError("The recurring booking confirmation was incomplete. Please contact us before trying again.", 502);
      const bookingDates = result.bookings.map(booking => booking.start_datetime || "").filter(Boolean);
      current.invoiceId = invoice.id; current.bookingCode = bookingCodes[0]; current.bookingCodes = bookingCodes; current.bookingDates = bookingDates;
      current.receipt = { serviceName: service.name.replace(/^Member\s+/i, "").replace(/\s+Package$/i, " Recurring Service").slice(0, 255), date: appointments[0].date, time: appointments[0].time, appointmentCount, vehicleRegistration: registration, customerName: clientData.name, customerEmail: clientData.email, customerPhone: clientData.phone };
      const finalInvoice = await call<Invoice>(`/public/invoice/item/id/${invoice.id}`, current.token);
      return withSession(success({ bookingCode: bookingCodes[0], bookingCodes, bookingDates, appointmentCount, vehicleRegistration: registration, invoiceId: invoice.id, invoiceNumber: finalInvoice.number, invoiceAmount: finalInvoice.amount, currency: finalInvoice.currency, paymentRequired: !paid(finalInvoice) }), current, config);
    }
    if (path === "payment/methods") {
      const current = requireSession();
      const methods = list(await call<PaymentProcessor[] | { data: PaymentProcessor[] }>("/public/payment-processor", current.token));
      return success({ availableMethods: methods.filter(item => apiFlag(item.is_active) && isStripeProcessor(item.name)).map(item => item.name) });
    }
    if (path === "payment/invoice-status") {
      const id = invoiceForSession(incoming.searchParams.get("invoiceId"));
      const invoice = await call<Invoice>(`/public/invoice/item/id/${id}`, requireSession().token);
      return success({ paid: paid(invoice), number: invoice.number, amount: invoice.amount, currency: invoice.currency });
    }
    if (path === "payment/cancel") {
      const id = invoiceForSession(body.invoiceId);
      const current = requireSession();
      if (!current.purchase) throw new ApiError("Only a pending package order can be cancelled here.", 409);
      // The invoice detail endpoint can return a provider-side 500 for a new
      // package order even though that same order can be cancelled normally.
      // The invoice id is already constrained to the signed session; let the
      // DELETE operation decide whether the pending order can be removed.
      let pendingProviderCleanup = false;
      try {
        await call(`/public/invoice/item/id/${id}`, current.token, undefined, "DELETE");
      } catch (error) {
        if (!(error instanceof ApiError) || (error.status !== 404 && error.status < 500)) throw error;
        pendingProviderCleanup = error.status >= 500;
        if (pendingProviderCleanup) console.warn("SimplyBook pending package invoice will expire automatically", { invoiceId: id, status: error.status });
      }
      const cleared: Session = { token: current.token, expires: current.expires, client: current.client, clientIdentity: current.clientIdentity };
      session = cleared;
      return withSession(success({ cancelled: true, pendingProviderCleanup }), cleared, config);
    }
    if (path === "payment/summary") {
      const current = requireSession();
      if (!current.invoiceId) throw new ApiError("No completed booking was found in this session. Please contact us if you have already paid.", 404);
      const returnedInvoice = incoming.searchParams.get("invoiceId");
      if (returnedInvoice !== null) invoiceForSession(returnedInvoice);
      if (!current.bookingCode && !current.purchase) throw new ApiError("We couldn’t confirm your previous order. Please call 0330 053 6925 so we can check it before you try again.", 409);
      const invoice = await call<Invoice>(`/public/invoice/item/id/${current.invoiceId}`, current.token);
      if (paid(invoice) && current.purchase?.pendingAppointment && current.purchase.firstAppointmentStatus === "pending" && !current.bookingCode) {
        const appointment = current.purchase.pendingAppointment;
        let provisionalBookings: BookingResult["bookings"] | undefined;
        try {
          const [instancesResponse, service, client, termsStatus] = await Promise.all([
            call<PackageInstance[] | { data: PackageInstance[] }>("/public/packages/instances", current.token),
            publicRead<SimplyBookService>(`/public/services/item/id/${appointment.serviceId}`),
            call<{ name?: string; email?: string; phone?: string }>("/public/clients", current.token),
            publicRead<TermsStatus>("/public/clients/terms"),
          ]);
          const packageInstances = [...(invoice.package_instances || []), ...list(instancesResponse)];
          const packageInstance = packageInstances.find(instance => Number(instance.package_id) === current.purchase?.packageId && !apiFlag(instance.is_used) && packageCoversDate(instance, appointment.date) && (instance.services || []).some(item => Number(item.service_id) === appointment.serviceId && Number(item.qty) > 0 && apiFlag(item.is_visible, true)));
          if (!packageInstance) throw new ApiError("Your package is paid, but its visit credits are not ready yet.", 409);
          const availability = await timeline(appointment.serviceId, appointment.providerId, appointment.date, appointment.date);
          if (!availability.find(row => row.date === appointment.date)?.slots.some(slot => canonicalTime(slot.time) === appointment.time && slot.available_count !== 0)) {
            current.purchase.firstAppointmentStatus = "unavailable";
            current.purchase.firstAppointmentMessage = "Your package is active, but the first appointment became unavailable during payment. Choose a replacement date from your customer account.";
          } else {
            const terms = enabledTerms(termsStatus);
            let bookingInvoice = await call<Invoice>("/public/invoice", current.token, { terms });
            if (bookingInvoice.token) current.token = bookingInvoice.token;
            // The paid package already contains the selected vehicle-size
            // attribute. Adding it again here creates an uncovered invoice line,
            // so SimplyBook later cancels the visit at the payment timeout.
            const result = await call<BookingResult>("/public/booking/item", current.token, { invoice_id: bookingInvoice.id, service_id: appointment.serviceId, provider_id: appointment.providerId, start_datetime: `${appointment.date} ${appointment.time}`, duration: service.duration, count: 1, products: [], terms, comment: registrationNote(appointment.vehicleRegistration) });
            if (result.token) current.token = result.token;
            provisionalBookings = result.bookings;
            const bookingCode = result.bookings?.[0]?.code;
            if (!bookingCode) throw new ApiError("The first package appointment could not be confirmed.", 502);
            await call<Invoice>(`/public/invoice/package/id/${bookingInvoice.id}`, current.token, { package_instance_id: packageInstance.id });
            bookingInvoice = await settledInvoice(bookingInvoice.id, current.token, packageCovered);
            if (!packageCovered(bookingInvoice)) throw new ApiError("The first appointment was not fully covered by the package.", 409);
            if (!paid(bookingInvoice)) await confirmPackageBookings(result.bookings);
            current.bookingCode = bookingCode; current.bookingCodes = [bookingCode]; current.bookingDates = [`${appointment.date} ${appointment.time}`];
            current.receipt = { serviceName: service.name.slice(0, 255), date: appointment.date, time: appointment.time, appointmentCount: 1, vehicleRegistration: appointment.vehicleRegistration, customerName: stringValue(client.name || ""), customerEmail: stringValue(client.email || ""), customerPhone: stringValue(client.phone || "") };
            if (config.sendBookingEmail) try { await config.sendBookingEmail({ ...current.receipt, bookingCode, packageName: current.purchase.packageName }); } catch (error) { console.error("Package booking email failed", error instanceof Error ? error.message : "Unknown error"); }
            current.purchase.firstAppointmentStatus = "booked";
            current.purchase.firstAppointmentConfirmedAt = Date.now();
            current.purchase.firstAppointmentMessage = "Your first package appointment is booked. The remaining prepaid visits are available in your customer account.";
          }
        } catch (error) {
          await cancelBookings(provisionalBookings, current.token);
          if (current.purchase.firstAppointmentStatus === "pending") {
            current.purchase.firstAppointmentStatus = error instanceof ApiError && error.status === 409 ? "unavailable" : "failed";
            current.purchase.firstAppointmentMessage = error instanceof ApiError ? error.message : "Your package is active, but the first appointment needs to be arranged from your customer account.";
          }
        }
      }
      return withSession(success({
        paid: paid(invoice), status: invoice.status,
        booking: { orderType: current.purchase ? "package" : "booking", packageName: current.purchase?.packageName, firstAppointmentStatus: current.purchase?.firstAppointmentStatus, firstAppointmentMessage: current.purchase?.firstAppointmentMessage, bookingCode: current.bookingCode, bookingCodes: current.bookingCodes, bookingDates: current.bookingDates, appointmentCount: current.receipt?.appointmentCount, vehicleRegistration: current.receipt?.vehicleRegistration || current.purchase?.pendingAppointment?.vehicleRegistration, invoiceId: current.invoiceId, invoiceNumber: invoice.number, invoiceAmount: invoice.amount, currency: invoice.currency, paymentRequired: !paid(invoice) },
        ...(current.receipt ? { details: current.receipt } : {}),
      }), current, config);
    }
    if (path === "payment/pay") {
      const id = invoiceForSession(body.invoiceId); const system = stringValue(body.system, 50); const current = requireSession();
      if (!isStripeProcessor(system)) throw new ApiError("Secure card payment through Stripe is required for online bookings.");
      const methods = list(await call<PaymentProcessor[] | { data: PaymentProcessor[] }>("/public/payment-processor", current.token));
      if (!methods.some(method => method.name === system && apiFlag(method.is_active) && isStripeProcessor(method.name))) throw new ApiError("Secure card payment is not currently available.");
      // SimplyBook appends ext/invoice-payment/return/... to this base URL.
      // The trailing slash is required; the return route then opens the receipt.
      const callback = new URL("/booking/payment-complete/", siteUrl);
      const result = await call<{ redirect_url?: string; inline_content?: string; template?: string }>(`/public/payment-processor/pay?${new URLSearchParams({ invoice_id: String(id), system, callback_url: callback.href })}`, current.token);
      if (result.redirect_url && new URL(result.redirect_url).protocol !== "https:") throw new ApiError("The payment link could not be verified.", 502);
      if (!result.redirect_url && (result.inline_content || result.template)) throw new ApiError("This payment option requires assistance. Please choose another option or contact us.", 400);
      return success({ redirect_url: result.redirect_url });
    }
    throw new ApiError("Booking endpoint not found.", 404);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502;
    console.error("SimplyBook booking route failed", { path, status, bookingMayExist: createdBooking });
    const response = json({ success: false, error: createdBooking ? "We could not verify the booking response. Please call 0330 053 6925 before trying again, so we can avoid a duplicate booking." : error instanceof ApiError ? error.message : "The booking connection encountered an error. Please try again shortly." }, createdBooking ? 502 : status);
    if (createdBooking && session?.invoiceId) return withSession(response, session, config);
    return response;
  }
}
