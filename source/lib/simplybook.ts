import type { BookingTypeId, VehicleSize } from "./booking-services";

// IDs verified against the racecargraphics SimplyBook public API catalogue.
export const simplyBookCategoryIds: Record<BookingTypeId, number[]> = { wash: [3], valet: [1, 9, 10], polish: [4], bay: [2] };
export const simplyBookServiceIds: Record<string, number> = {
  "decontamination-wash": 11, "decontamination-clay": 12, "hand-wash": 14, "hand-wash-vacuum": 15,
  "exterior-valet-package-three-month": 41, "exterior-valet-package-six-month": 42,
  "exterior-valet": 4, "interior-valet": 5, "complete-valet": 6, "deep-interior": 7,
  "factory-restored": 8, "soft-top-exterior": 9, "trim-rejuvenation": 10,
  "stage-one": 16, multistage: 17, "multistage-ceramic": 18, "new-car-ceramic": 19,
  "soft-top-ceramic": 20, "soft-top-redye": 21, "wheel-face": 22, "wheels-off": 23,
  "trade-three-hours": 13, "trade-full-day": 25, "trade-overnight": 26,
  "public-two-hours": 29, "public-full-day": 27, "public-weekend": 28,
};

export type SimplyBookRecurringSettings = {
  days: number;
  repeat_count: number;
  type: "fixed" | "weekly";
  mode: "skip" | "book_available" | "book_and_move";
  price_per_session: boolean;
};
export type SimplyBookService = { id: number; name: string; price: number; currency: string; duration: number; is_active: boolean; is_visible: boolean; recurring_settings?: SimplyBookRecurringSettings | null };
export type SimplyBookCategory = { id: number; services: number[]; is_visible: boolean };
export type SimplyBookProvider = { id: number; name: string };
export type SimplyBookProduct = { qty: number; product: { id: number; name: string; price: number; currency: string; duration: number } };
export type SimplyBookClient = { name: string; email: string; phone?: string; address1?: string; address2?: string; city?: string; zip?: string };
export type SimplyBookBooking = { bookingCode?: string; bookingCodes?: string[]; bookingDates?: string[]; appointmentCount?: number; vehicleRegistration?: string; invoiceNumber?: string; paymentRequired: boolean; invoiceId?: number; invoiceAmount?: number; currency?: string; resumed?: boolean; orderType?: "booking" | "package"; packageName?: string; firstAppointmentStatus?: "pending" | "booked" | "unavailable" | "failed"; firstAppointmentMessage?: string };
export type SimplyBookInvoice = { paid: boolean; number?: string; amount?: number; currency?: string };
export type SimplyBookReceiptDetails = { serviceName: string; date: string; time: string; appointmentCount?: number; vehicleRegistration: string; customerName: string; customerEmail: string; customerPhone: string };
export type SimplyBookPaymentSummary = { paid: boolean; status: string; booking: SimplyBookBooking; details?: SimplyBookReceiptDetails };
export type SimplyBookPackageCredit = { serviceId: number; name: string; remaining: number };
export type SimplyBookPackage = {
  id: number; name: string; description?: string; price: number; currency: string; duration: number; duration_type: string;
  package_limit: number | string; can_be_purchased: boolean; is_active: boolean; is_visible: boolean;
  services: { id: number; service_id: number; qty: number; name: string; is_visible: boolean }[];
  paid_attributes: { id: number; product_id: number; qty: number; name: string; is_visible: boolean }[];
};
export type SimplyBookPackageInstance = {
  instanceId: number; packageId: number; name: string; periodStart: string; periodEnd: string; status: string;
  canBeUsed: boolean; remainingVisits: number; usedVisits: number; totalVisits: number; vehicleRegistration?: string; services: SimplyBookPackageCredit[];
};
export type SimplyBookUpcomingBooking = {
  id: number; code: string; confirmed: boolean; start: string; end: string; serviceId: number; providerId: number; serviceName: string; providerName: string; vehicleRegistration?: string;
};
export type SimplyBookCustomerDashboard = { packages: SimplyBookPackageInstance[]; bookings: SimplyBookUpcomingBooking[] };
export const bookingPaymentCompletePath = "/booking-complete";
export const pendingBookingKey = "ao-simplybook-pending";

export class SimplyBookError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function simplyBookRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/simplybook/${endpoint}`, { ...options, credentials: "same-origin", cache: "no-store", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new SimplyBookError("The booking service did not respond. Please try again shortly.", 0);
  }
  let result: { success?: boolean; data?: T; error?: string };
  try { result = await response.json(); } catch { throw new SimplyBookError("The booking service is temporarily unavailable. Please try again.", 502); }
  if (!response.ok || !result.success) throw new SimplyBookError(result.error || "The booking service could not complete this request. Please try again.", response.status);
  return result.data as T;
}

export function productVehicleSize(name: string): VehicleSize | undefined {
  const value = name.toLowerCase().replace(/[-–—]/g, " ");
  if (/extra\s*large|\bxl\b/.test(value)) return "extraLarge";
  if (/\bsmall\b/.test(value)) return "small";
  if (/\bmedium\b/.test(value)) return "medium";
  if (/\blarge\b/.test(value)) return "large";
}

export function bookingDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function bookingMoney(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}
