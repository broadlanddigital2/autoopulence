export type BookingTypeId = "wash" | "valet" | "polish" | "bay";
export type VehicleSize = "small" | "medium" | "large" | "extraLarge";
export type CustomerKind = "public" | "trade";

export type BookingService = {
  id: string;
  name: string;
  prices?: Partial<Record<VehicleSize, number>>;
  fixedPrice?: number;
  audience?: CustomerKind;
  note?: string;
};

export type BookingPackage = {
  id: string;
  /** Slug of the matching package in the CRM (used in "book this package" links). */
  crmSlug: string;
  totals?: Partial<Record<VehicleSize, number>>;
  serviceId: string;
  baseServiceId: string;
  siteServiceSlugs: string[];
  name: string;
  term: string;
  appointmentCount: number;
  appointmentIntervalDays: number;
  description: string;
  includes: string[];
  prices: Partial<Record<VehicleSize, number>>;
  note?: string;
};

export type BookingType = { id: BookingTypeId; label: string; services: BookingService[] };

export const bookingPackages: BookingPackage[] = [
  {
    id: "exterior-valet-three-month",
    crmSlug: "exterior-valet-3-month-package",
    totals: { small: 114, medium: 129, large: 144, extraLarge: 174 },
    serviceId: "exterior-valet-package-three-month",
    baseServiceId: "exterior-valet",
    siteServiceSlugs: ["premium-exterior-car-valet"],
    name: "Exterior Valet — 3 Month Package",
    term: "Three-month package",
    appointmentCount: 3,
    appointmentIntervalDays: 30,
    description: "A reduced package rate for customers maintaining the exterior of their vehicle over three months.",
    includes: [],
    prices: { small: 38, medium: 43, large: 48, extraLarge: 58 },
  },
  {
    id: "exterior-valet-six-month",
    crmSlug: "exterior-valet-6-month-package",
    totals: { small: 216, medium: 246, large: 276, extraLarge: 336 },
    serviceId: "exterior-valet-package-six-month",
    baseServiceId: "exterior-valet",
    siteServiceSlugs: ["premium-exterior-car-valet"],
    name: "Exterior Valet — 6 Month Package",
    term: "Six-month package",
    appointmentCount: 6,
    appointmentIntervalDays: 30,
    description: "A lower package rate for customers maintaining the exterior of their vehicle over six months.",
    includes: [],
    prices: { small: 36, medium: 41, large: 46, extraLarge: 56 },
  },
];

export function getServicePackages(serviceSlug: string) {
  return bookingPackages.filter((item) => item.siteServiceSlugs.includes(serviceSlug));
}

export function getLowestPackagePrice(serviceSlug: string, size?: VehicleSize) {
  const prices = getServicePackages(serviceSlug).flatMap((item) => size
    ? item.prices[size] === undefined ? [] : [item.prices[size] as number]
    : Object.values(item.prices).filter((value): value is number => typeof value === "number"));
  return prices.length ? Math.min(...prices) : undefined;
}


export const bookingTypes: BookingType[] = [
  { id: "wash", label: "Vehicle Washing", services: [
    { id: "decontamination-wash", name: "Exterior Full Decontamination Wash", prices: { small: 80, medium: 85, large: 90, extraLarge: 100 } },
    { id: "decontamination-clay", name: "Exterior Full Decontamination Wash with Clay Bar", prices: { small: 195, medium: 220, large: 245, extraLarge: 295 } },
    { id: "hand-wash", name: "Hand Car Wash", prices: { small: 30, medium: 35, large: 40, extraLarge: 50 } },
    { id: "hand-wash-vacuum", name: "Hand Car Wash & Interior Vacuum", prices: { small: 49, medium: 59, large: 69, extraLarge: 89 } },
  ]},
  { id: "valet", label: "Vehicle Valeting", services: [
    { id: "exterior-valet", name: "Premium Exterior Car Valet", prices: { small: 40, medium: 45, large: 50, extraLarge: 60 } },
    { id: "interior-valet", name: "Premium Interior Car Valet", prices: { small: 40, medium: 45, large: 50, extraLarge: 60 } },
    { id: "complete-valet", name: "Premium Exterior & Interior Vehicle Valet", prices: { small: 70, medium: 80, large: 90, extraLarge: 110 } },
    { id: "deep-interior", name: "Deep Interior Clean for Neglected Vehicles", prices: { small: 70, medium: 75, large: 80, extraLarge: 90 } },
    { id: "factory-restored", name: "Factory Restored Interior Car Valet", prices: { small: 330, medium: 395, large: 465, extraLarge: 525 } },
    { id: "soft-top-exterior", name: "Soft Top Deep Clean & Exterior Car Valet", prices: { small: 150, medium: 155, large: 160 }, note: "Extra-large vehicles require confirmation." },
    { id: "trim-rejuvenation", name: "Exterior Car Trim Rejuvenation", prices: { small: 20, medium: 25, large: 30, extraLarge: 40 }, note: "Additional service; requires at least an exterior valet." },
  ]},
  { id: "polish", label: "Vehicle Polishing", services: [
    { id: "stage-one", name: "Stage 1 Vehicle Machine Polish", prices: { small: 295, medium: 320, large: 345, extraLarge: 395 } },
    { id: "multistage", name: "Multistage Vehicle Polish", prices: { small: 345, medium: 370, large: 395, extraLarge: 445 } },
    { id: "multistage-ceramic", name: "Multistage Polish with 7-Year Ceramic Coating", prices: { small: 595, medium: 645, large: 695, extraLarge: 795 } },
    { id: "new-car-ceramic", name: "New Car 7-Year Ceramic Coating", prices: { small: 250, medium: 275, large: 300, extraLarge: 350 } },
    { id: "soft-top-ceramic", name: "Soft Top Deep Clean plus Ceramic Coating", fixedPrice: 95 },
    { id: "soft-top-redye", name: "Soft Top Clean, Ceramic Coating & Re-Dye", fixedPrice: 195 },
    { id: "wheel-face", name: "Alloy Wheel Ceramic Coating — Face Only", fixedPrice: 195 },
    { id: "wheels-off", name: "Full Wheels-Off Ceramic Coating", fixedPrice: 280 },
  ]},
  { id: "bay", label: "Valet Bay Hire", services: [
    { id: "trade-three-hours", name: "Trade Valet Bay Hire — 3 Hours", fixedPrice: 50, audience: "trade" },
    { id: "trade-full-day", name: "Trade Valet Bay Hire — Full Day", fixedPrice: 140, audience: "trade" },
    { id: "trade-overnight", name: "Trade Full Day plus Overnight", fixedPrice: 170, audience: "trade", note: "Vehicle collection is required by 08:30 the following morning." },
    { id: "public-two-hours", name: "Public Valet Bay Hire — 2 Hours", fixedPrice: 80, audience: "public" },
    { id: "public-three-hours", name: "Public Valet Bay Hire — 3 Hours", audience: "public", note: "Price confirmed before booking." },
    { id: "public-full-day", name: "Public Valet Bay Hire — Full Day", fixedPrice: 200, audience: "public" },
    { id: "public-weekend", name: "Public Valet Bay Hire — Complete Weekend", fixedPrice: 350, audience: "public" },
  ]},
];

export const sizeLabels: Record<VehicleSize, string> = { small: "Small car", medium: "Medium car", large: "Large car", extraLarge: "Extra-large car" };

export function bookingTypeForPath(path: string): BookingTypeId {
  if (path === "/vehicle-washing") return "wash";
  if (path === "/vehicle-polishing") return "polish";
  if (path === "/valeting-bay-hire") return "bay";
  return "valet";
}

export function bookingTypeForCategorySlug(slug: string): BookingTypeId {
  if (slug === "vehicle-washing") return "wash";
  if (slug === "vehicle-polishing") return "polish";
  if (slug === "valet-bay-hire") return "bay";
  return "valet";
}

export const bookingServiceIdForSiteSlug: Record<string, string> = {
  "exterior-full-decontamination-wash": "decontamination-wash",
  "exterior-full-decontamination-wash-with-clay-bar": "decontamination-clay",
  "hand-car-wash-norwich": "hand-wash",
  "hand-car-wash-and-vacuum-norwich": "hand-wash-vacuum",
  "premium-exterior-car-valet": "exterior-valet",
  "premium-interior-car-valet": "interior-valet",
  "premium-exterior-interior-valet": "complete-valet",
  "deep-interior-clean-neglected": "deep-interior",
  "factory-restored-interior-valet": "factory-restored",
  "soft-top-deep-clean-and-exterior-valet": "soft-top-exterior",
  "exterior-trim-rejuvenation": "trim-rejuvenation",
  "stage-1-vehicle-machine-polish": "stage-one",
  "multistage-vehicle-polish": "multistage",
  "multi-stage-machine-polish-inc-7-year-ceramic-coating": "multistage-ceramic",
  "new-car-7-year-ceramic-coating": "new-car-ceramic",
  "soft-top-deep-clean-plus-ceramic-coating": "soft-top-ceramic",
  "soft-top-deep-clean-ceramic-coating-re-dye-roof-only": "soft-top-redye",
  "alloy-wheel-ceramic-coating-face-only": "wheel-face",
  "full-wheels-off-ceramic-coating": "wheels-off",
  "trade-hire-3-hours": "trade-three-hours",
  "trade-hire-full-day": "trade-full-day",
  "trade-hire-overnight": "trade-overnight",
  "public-hire-2-hours": "public-two-hours",
  "public-hire-3-hours": "public-three-hours",
  "public-hire-full-day": "public-full-day",
  "public-hire-weekend": "public-weekend",
};
