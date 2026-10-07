// Auto Opulence vehicle-care catalogue from the Race Car Graphics CRM
// (tools/static-export/fetch-crm.mjs → crm/vehicle-care.json; the booking form also reloads it live) plus helpers shared by the booking form,
// the booking call-to-action and the payment-complete page.
import catalogueJson from "./crm/vehicle-care.json";
import { type BookingTypeId, type CustomerKind, type VehicleSize } from "./booking-services";

export type CareSizeOption = { addon_id: string; name: string; size: VehicleSize | null; price_adjustment: number; is_default: boolean; is_required: boolean };
export type CareExtra = { addon_id: string; name: string; description: string; group: string; price_adjustment: number; duration_minutes: number; is_default: boolean; is_required: boolean };
export type CarePackagePrice = { id: string; label: string; size: VehicleSize | null; amount: number; per_visit: number | null };
/** A prepaid package (e.g. 3 or 6 monthly visits) offered against a service. Visits are in consecutive months. */
export type CarePackage = { id: string; name: string; slug: string; description: string; total_visits: number; months: number; consecutive_months: boolean; prices: CarePackagePrice[] };
export type CareService = {
  id: string; category_id: string; name: string; slug: string; description: string; service_type: string;
  duration_minutes: number; base_price: number | null; uses_vehicle_size: boolean; deposit_required: boolean; deposit_amount: number;
  source_url: string; sort_order: number; bookable: boolean; sizes: CareSizeOption[]; extras: CareExtra[]; packages?: CarePackage[];
};
export type CareCategory = { id: string; name: string; slug: string; description: string; sort_order: number };
export type CareCatalogue = { business_unit_id: string; categories: CareCategory[]; services: CareService[] };
export type CareSlot = { start_at: string; end_at: string; provider_id: string };

export const careCatalogue = catalogueJson as unknown as CareCatalogue;
export const careBusinessUnitId = careCatalogue.business_unit_id || "8a8a2f45-ff2e-4d60-867c-329406513c95";

// Website booking types → CRM service categories (matched by name, then slug).
const categoryNames: Record<BookingTypeId, string> = { wash: "Vehicle Washing", valet: "Vehicle Valeting", polish: "Vehicle Polishing", bay: "Valet Bay Hire" };
const categorySlugs: Record<BookingTypeId, string> = { wash: "vehicle-washing", valet: "vehicle-valeting", polish: "vehicle-polishing", bay: "valet-bay-hire" };

export function careCategoryFor(typeId: BookingTypeId, catalogue: CareCatalogue = careCatalogue) {
  const name = categoryNames[typeId].toLowerCase();
  return catalogue.categories.find(c => c.name.trim().toLowerCase() === name) || catalogue.categories.find(c => c.slug === categorySlugs[typeId]);
}

/** Valet bay hire is split into trade and general-public services by name. */
export function careAudience(service: Pick<CareService, "name" | "slug">): CustomerKind {
  return /\btrade\b/i.test(`${service.name} ${service.slug}`) ? "trade" : "public";
}

export function careServicesFor(typeId: BookingTypeId, audience: CustomerKind, catalogue: CareCatalogue = careCatalogue) {
  const category = careCategoryFor(typeId, catalogue);
  if (!category) return [];
  return catalogue.services
    .filter(s => s.category_id === category.id && (typeId !== "bay" || careAudience(s) === audience))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

/** Finds a CRM service from a website link: a CRM id or slug (the site's service slugs are the CRM slugs). */
export function careServiceFor(value: string | null | undefined, catalogue: CareCatalogue = careCatalogue) {
  if (!value) return undefined;
  return catalogue.services.find(s => s.id === value || s.slug === value);
}

export function careTypeFor(service: CareService, catalogue: CareCatalogue = careCatalogue): BookingTypeId | undefined {
  return (Object.keys(categoryNames) as BookingTypeId[]).find(type => careCategoryFor(type, catalogue)?.id === service.category_id);
}

export const careSizeOption = (service: CareService | undefined, size: VehicleSize) => service?.sizes.find(option => option.size === size);

/** Booking price as the CRM charges it: base price + vehicle-size adjustment + selected extras. */
export function carePrice(service: CareService | undefined, size?: VehicleSize, extraIds: string[] = []) {
  if (!service || service.base_price === null || service.base_price === undefined) return undefined;
  const sizeAdjustment = service.sizes.length && size ? careSizeOption(service, size)?.price_adjustment : 0;
  if (sizeAdjustment === undefined) return undefined;
  const extras = service.extras.filter(extra => extraIds.includes(extra.addon_id)).reduce((sum, extra) => sum + extra.price_adjustment, 0);
  return Math.round((service.base_price + sizeAdjustment + extras) * 100) / 100;
}

/** Lowest available price, for "From £x" labels. */
export function careFromPrice(service: CareService | undefined) {
  if (!service || service.base_price === null) return undefined;
  if (!service.sizes.length) return service.base_price;
  return Math.min(...service.sizes.map(option => service.base_price! + option.price_adjustment));
}

export function bookingDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function bookingMoney(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

/** "09:30" in UK time for an ISO timestamp. */
export function ukTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(iso));
}

export function ukDate(iso: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "Europe/London" }).format(new Date(iso));
}

export const bookingPaymentCompletePath = "/booking/payment-complete";

export const PACKAGE_DISCLAIMER = "All package bookings have to be made in consecutive months.";
/** The package price for a vehicle size (or the only price when the service isn't sized). */
export function carePackagePrice(pkg: CarePackage | undefined, size: VehicleSize | undefined, sized: boolean) {
  if (!pkg) return undefined;
  return sized ? pkg.prices.find(p => p.size === size) : pkg.prices[0];
}
/** Month names for each visit of a package, starting with the month of the first visit. */
/** The first and last day (YYYY-MM-DD) of each month in a package, starting with the first visit's month. */
export function packageMonthRanges(firstVisitIso: string, count: number) {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).format(new Date(firstVisitIso)).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(Date.UTC(y, m - 1 + i, 1)), end = new Date(Date.UTC(y, m + i, 0));
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), days: end.getUTCDate(), label: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(start) };
  });
}
export function packageMonths(firstVisitIso: string, count: number) {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).format(new Date(firstVisitIso)).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1 + i, 15))));
}
