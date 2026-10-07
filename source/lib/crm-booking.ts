// Browser client for Auto Opulence bookings in the Race Car Graphics CRM (Supabase).
// Booking calls go through this website's own /api/crm/booking (worker/src/index.ts forwards them to the CRM).
// Catalogue and availability are public read-only calls; creating a booking needs a signed-in customer
// account (Supabase Auth). The session lives in sessionStorage so it survives the Stripe checkout redirect.
import type { CareCatalogue, CareSlot } from "./vehicle-care";

export const CRM_URL = "https://dipjypzrfigkzuarlsov.supabase.co";
export const CRM_PUBLISHABLE_KEY = "sb_publishable_KLK1Ucd9ilVSwzSGL1vkug_3SGGh4NF";
const BOOKING_FUNCTION = "/api/crm/booking";
const AUTO_OPULENCE_BUSINESS = "8a8a2f45-ff2e-4d60-867c-329406513c95"; // sign-in emails carry Auto Opulence branding
const CUSTOMER_PORTAL = "https://crm.racecargraphics.uk";
const sessionKey = "ao-care-session";

export class BookingError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export type CrmSession = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string; email_confirmed_at?: string | null } };
export type CrmCustomer = { first_name: string; last_name: string; email: string; mobile: string; address_line_1: string; address_line_2: string; city: string; county: string; postcode: string };
export type CrmServiceOrder = { order_id: string; order_number?: string; booking_id: string; invoice_id: string; total: number; payment_amount?: number; checkout?: { url?: string; session_id?: string; payment_id?: string } | null };
export type CrmBookingStatus = {
  paid: boolean; status: string; amount: number; currency: string; paid_at?: string | null;
  order: { order_number: string; order_type?: string; status: string; total: number; tax_total?: number; amount_paid: number; balance_due: number; currency: string; items?: { description: string; quantity: number; line_total: number; item_type: string }[] } | null;
  shipping?: { name: string; email: string; phone: string; address: string[] } | null;
  booking: { status: string; start_at: string; end_at: string; service_name: string } | null;
  contact: { name: string; email: string; phone: string; vehicle_registration: string; vehicle_size: string } | null;
  package?: { name: string; total_visits: number; valid_until: string | null; visits?: string[]; account_url?: string } | null;
};

let memorySession: CrmSession | null = null;

export function storedSession(): CrmSession | null {
  if (memorySession) return memorySession;
  try {
        const value = localStorage.getItem(sessionKey) || sessionStorage.getItem(sessionKey);
    memorySession = value ? JSON.parse(value) as CrmSession : null;
  } catch { memorySession = null; }
  return memorySession;
}

function storeSession(session: CrmSession | null) {
  memorySession = session;
  try {
    if (session) localStorage.setItem(sessionKey, JSON.stringify(session));
    else { localStorage.removeItem(sessionKey); sessionStorage.removeItem(sessionKey); }
  } catch { /* Storage is optional; the session stays in memory. */ }
}

async function readJson(response: Response) {
  try { return await response.json(); } catch { return {}; }
}

function authError(data: Record<string, unknown>, status: number) {
  const text = String(data.error_description || data.msg || data.message || data.error || "");
  if (/invalid login credentials/i.test(text)) return new BookingError("The email address or password is incorrect.", status);
  if (/email not confirmed/i.test(text)) return new BookingError("Please confirm your email address using the link we sent you, then sign in.", status);
  if (/already registered|already been registered/i.test(text)) return new BookingError("An account already exists for this email address. Please sign in instead.", status);
  return new BookingError(text || "We couldn't sign you in. Please try again.", status);
}

async function authRequest(path: string, body: unknown, token?: string) {
  let response: Response;
  try {
    response = await fetch(`${CRM_URL}/auth/v1/${path}`, {
      method: "POST",
      headers: { apikey: CRM_PUBLISHABLE_KEY, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new BookingError("The account service did not respond. Please try again shortly.", 0);
  }
  const data = await readJson(response);
  if (!response.ok) throw authError(data, response.status);
  return data;
}

function toSession(data: Record<string, any>): CrmSession {
  return {
    access_token: data.access_token, refresh_token: data.refresh_token,
    expires_at: Number(data.expires_at) || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
    user: { id: data.user?.id, email: data.user?.email, email_confirmed_at: data.user?.email_confirmed_at ?? null },
  };
}

/** Emails a 6-digit sign-in code (works for new and existing customers). */
export async function requestEmailCode(email: string) {
  await bookingRequest<{ ok: true }>("public_request_login_code", { email, business_unit_id: AUTO_OPULENCE_BUSINESS }, { signedIn: false });
}
/** Signs in with the emailed code; creates the customer account on first use. */
export async function signInWithEmailCode(email: string, code: string, details: { firstName?: string; lastName?: string; mobile?: string } = {}) {
  const result = await bookingRequest<{ session: CrmSession }>("public_verify_login_code", { email, code, business_unit_id: AUTO_OPULENCE_BUSINESS, first_name: details.firstName, last_name: details.lastName, mobile: details.mobile }, { signedIn: false });
  storeSession(result.session);
  return result.session;
}

export async function signInWithPassword(email: string, password: string) {
  const session = toSession(await authRequest("token?grant_type=password", { email, password }));
  storeSession(session);
  return session;
}

/** Creates a customer account. Returns the session, or null when the email address must be confirmed first. */
export async function signUp(details: { email: string; password: string; firstName: string; lastName: string; phone: string }) {
  const data = await authRequest(`signup?redirect_to=${encodeURIComponent(`${CUSTOMER_PORTAL}/auth/confirm`)}`, {
    email: details.email, password: details.password,
    data: { first_name: details.firstName, last_name: details.lastName, phone: details.phone },
  });
  if (!data.access_token) return null;
  const session = toSession(data);
  storeSession(session);
  return session;
}

export async function requestPasswordReset(email: string) {
  await authRequest(`recover?redirect_to=${encodeURIComponent(`${CUSTOMER_PORTAL}/auth/reset`)}`, { email });
}

/** The stored session, refreshed when it is about to expire; null when signed out. */
export async function currentSession(): Promise<CrmSession | null> {
  const session = storedSession();
  if (!session) return null;
  if (session.expires_at - 60 > Date.now() / 1000) return session;
  try {
    const refreshed = toSession(await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token }));
    storeSession(refreshed);
    return refreshed;
  } catch {
    storeSession(null);
    return null;
  }
}

export async function signOut() {
  const session = storedSession();
  storeSession(null);
  if (session) await authRequest("logout", {}, session.access_token).catch(() => undefined);
}

/** Calls the CRM booking function. Signed-in requests carry the customer's access token. */
export async function bookingRequest<T>(action: string, body: Record<string, unknown> = {}, options: { signal?: AbortSignal; signedIn?: boolean } = {}): Promise<T> {
  const session = options.signedIn === false ? null : await currentSession();
  let response: Response;
  try {
    response = await fetch(BOOKING_FUNCTION, {
      method: "POST", signal: options.signal, cache: "no-store",
      headers: { apikey: CRM_PUBLISHABLE_KEY, "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ action, ...body }),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new BookingError("The booking service did not respond. Please try again shortly.", 0);
  }
  const data = await readJson(response);
  if (!response.ok || data.error) throw new BookingError(String(data.error || "The booking service could not complete this request. Please try again."), response.status);
  return data as T;
}

export const loadCatalogue = (signal?: AbortSignal) => bookingRequest<CareCatalogue & { ok: true }>("public_catalogue", {}, { signal, signedIn: false });
export const loadAvailableDates = (serviceId: string, signal?: AbortSignal, range: { from?: string; days?: number } = {}) => bookingRequest<{ dates: string[] }>("public_available_dates", { service_id: serviceId, days: range.days || 92, ...(range.from ? { from: range.from } : {}) }, { signal, signedIn: false }).then(result => result.dates);
export const loadAvailableSlots = (serviceId: string, date: string, signal?: AbortSignal) => bookingRequest<{ slots: CareSlot[] }>("public_available_slots", { service_id: serviceId, date }, { signal, signedIn: false }).then(result => result.slots);
export const loadCustomerProfile = (signal?: AbortSignal) => bookingRequest<{ customer: CrmCustomer }>("customer_profile", {}, { signal }).then(result => result.customer);
export const loadBookingStatus = (sessionId: string, signal?: AbortSignal) => bookingRequest<CrmBookingStatus>("public_booking_status", { session_id: sessionId }, { signal });
