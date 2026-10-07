export type VehiclePrices = {
  small: { amount: string; display: string };
  medium: { amount: string; display: string };
  large: { amount: string; display: string };
  extraLarge: { amount: string; display: string };
};
export type Service = { slug: string; title: string; short: string; description: string; includes: string[]; prices?: VehiclePrices; priceNote?: string; isAddOn?: boolean };
export type Category = { slug: string; title: string; eyebrow: string; intro: string; image: string; accent: string; services: Service[] };

function price(amount?: number) {
  return amount === undefined ? { amount: "0.00", display: "POA" } : { amount: amount.toFixed(2), display: `£${amount}` };
}

function vehiclePrices(small?: number, medium?: number, large?: number, extraLarge?: number): VehiclePrices {
  return { small: price(small), medium: price(medium), large: price(large), extraLarge: price(extraLarge) };
}

export const categories: Category[] = [
  {
    slug: "vehicle-valeting", title: "Vehicle Valeting", eyebrow: "Refresh every surface", image: "/images/categories/vehicle-valeting.webp", accent: "#1fb6ed",
    intro: "Structured interior and exterior valeting in Norwich, using safe-contact techniques, specialist tools and professional products to restore cleanliness, comfort and presentation.",
    services: [
      { slug: "premium-exterior-car-valet", title: "Premium Exterior Car Valet", short: "A methodical exterior clean and finish for a sharper, glossier vehicle.", description: "A carefully structured exterior valet that loosens road film before a safe hand wash, wheel clean, detailed drying and protective finish. It is ideal for restoring a well-kept vehicle without moving into paint correction.", includes: ["Pre-wash and safe contact wash", "Wheels, tyres, trims and glass", "Careful microfibre drying", "Protective finishing treatment"], prices: vehiclePrices(40, 45, 50, 60) },
      { slug: "premium-interior-car-valet", title: "Premium Interior Car Valet", short: "Deep cabin cleaning for a fresher and more comfortable drive.", description: "A thorough interior service for seats, carpets, mats, plastics, glass and detailed cabin areas. Professional tools lift embedded debris and everyday grime while appropriate products care for each surface.", includes: ["Full vacuum including crevices", "Dashboard, vents and controls", "Interior glass and trims", "Upholstery and carpet treatment"], prices: vehiclePrices(40, 45, 50, 60) },
      { slug: "premium-exterior-interior-valet", title: "Premium Exterior & Interior Valet", short: "Complete care inside and out in one coordinated service.", description: "A complete valet combining the exterior and interior processes for customers who want the whole vehicle reset in one appointment. Every stage is tailored to the vehicle’s present condition.", includes: ["Safe exterior wash and dry", "Wheel and glass detailing", "Complete interior vacuum", "Surfaces, carpets and upholstery"], prices: vehiclePrices(70, 80, 90, 110) },
      { slug: "deep-interior-clean-neglected", title: "Deep Interior Clean", short: "Focused cleaning for heavily used, marked or neglected interiors.", description: "An intensive interior clean designed for vehicles with heavy daily use, embedded dirt, spills, pet hair or stale odours. The extra working time allows more detailed attention to fabrics and difficult areas.", includes: ["Detailed pre-inspection", "Deep vacuum and extraction", "Fabric and carpet treatment", "Hard-surface clean and finish"], prices: vehiclePrices(70, 75, 80, 90) },
      { slug: "factory-restored-interior-valet", title: "Factory Restored Valet", short: "Deep interior restoration with multi-stage exterior paint correction.", description: "Our most comprehensive restoration valet combines an intensive deep interior clean with multi-stage exterior paint correction. The cabin, trim and fabrics receive detailed treatment while the paint is corrected and refined to restore clarity, gloss and overall presentation.", includes: ["Deep interior clean and extraction", "Detailed cabin, trim and fabric treatment", "Exterior wash and decontamination", "Multi-stage paint correction and final inspection"], prices: vehiclePrices(395, 330, 465, 525) },
      { slug: "soft-top-deep-clean-and-exterior-valet", title: "Soft Top Deep Clean & Valet", short: "Specialist convertible roof cleaning with exterior care.", description: "A specialist clean for fabric convertible roofs paired with an exterior valet. The process removes built-up contamination while treating delicate roof material with appropriate methods.", includes: ["Soft-top inspection", "Deep roof clean", "Exterior wash and dry", "Glass, wheels and exterior finish"], prices: vehiclePrices(150, 155, 160) },
      { slug: "exterior-trim-rejuvenation", title: "Exterior Trim Rejuvenation", short: "Restore faded exterior plastics and tired trim.", description: "A focused enhancement for exterior plastics, rubber and trim that have faded through age and exposure. Surfaces are prepared, treated and finished for a deeper, more consistent appearance.", includes: ["Trim condition check", "Surface cleaning and preparation", "Rejuvenating treatment", "Even finish and final check"], prices: vehiclePrices(20, 25, 30, 40), priceNote: "Additional charge on top of a minimum Premium Exterior Car Valet.", isAddOn: true },
      { slug: "engine-bay-detailing", title: "Engine Bay Detailing", short: "Careful cleaning and presentation of accessible engine-bay surfaces.", description: "A focused engine-bay service that carefully cleans accessible covers, painted areas, plastics and surrounding surfaces before applying an appropriate finishing treatment. Sensitive components are assessed before work begins.", includes: ["Pre-service engine-bay assessment", "Controlled cleaning of accessible areas", "Plastic and painted-surface treatment", "Careful drying and final inspection"], prices: vehiclePrices(50, 50, 50, 50), priceNote: "Additional cost added to a suitable main vehicle valeting service.", isAddOn: true },
    ],
  },
  {
    slug: "vehicle-washing", title: "Vehicle Washing", eyebrow: "Clean without compromise", image: "/images/categories/vehicle-washing.webp", accent: "#67d3ff",
    intro: "Professional hand washing in Norwich for anything from a regular maintenance clean to full paint decontamination, completed with careful methods that protect the finish.",
    services: [
      { slug: "hand-car-wash-norwich", title: "Hand Car Wash", short: "A safe wash and dry for regular vehicle maintenance.", description: "A professional hand wash that removes loose dirt, traffic film and day-to-day contamination without relying on harsh automated brushes. Dedicated products are used for bodywork, wheels and glass.", includes: ["Pre-rinse and pre-wash", "Safe contact wash", "Wheel and tyre clean", "Careful hand drying"], prices: vehiclePrices(30, 35, 40, 50) },
      { slug: "hand-car-wash-and-vacuum-norwich", title: "Hand Wash & Vacuum", short: "Exterior maintenance plus a tidy, refreshed cabin.", description: "Combine a safe exterior hand wash with an interior vacuum for an efficient whole-vehicle refresh. It suits regularly maintained cars that need a clean presentation inside and out.", includes: ["Exterior hand wash", "Wheels and exterior glass", "Cabin, mats and boot vacuum", "Interior glass check"], prices: vehiclePrices(49, 59, 69, 89) },
      { slug: "exterior-full-decontamination-wash", title: "Two-Step Decontamination Wash", short: "Remove bonded iron and tar before applying protection.", description: "A deeper exterior wash that targets contamination a standard wash cannot remove. Chemical iron and tar treatments leave paintwork cleaner, smoother and ready for protection or polishing.", includes: ["Safe multi-stage wash", "Iron fallout treatment", "Targeted tar removal", "Protective finish"], prices: vehiclePrices(80, 85, 90, 100) },
      { slug: "exterior-full-decontamination-wash-with-clay-bar", title: "Clay Bar Decontamination Wash", short: "A complete decontamination process for a noticeably smoother finish.", description: "Our most thorough wash preparation uses chemical decontamination followed by careful clay treatment to remove stubborn bonded deposits and refine the paint surface.", includes: ["Pre-wash and contact wash", "Iron and tar removal", "Clay bar treatment", "Final rinse, dry and protection"], prices: vehiclePrices(195, 220, 245, 295) },
    ],
  },
  {
    slug: "vehicle-polishing", title: "Vehicle Polishing", eyebrow: "Bring back the gloss", image: "/images/categories/vehicle-polishing.webp", accent: "#82b5e2",
    intro: "Paint enhancement and protection services in Norwich, from gloss-improving machine polishing to multi-stage correction and long-term ceramic coating packages.",
    services: [
      { slug: "stage-1-vehicle-machine-polish", title: "Stage 1 Machine Polish", short: "Enhance gloss and reduce light swirls in a single polishing stage.", description: "A one-stage machine polish that improves clarity and gloss while reducing light swirls, wash marring and minor imperfections. It is a strong enhancement option for daily drivers and well-kept vehicles.", includes: ["Paint inspection", "Full wash and decontamination", "Single-stage machine polish", "Protective finish"], prices: vehiclePrices(295, 320, 345, 395) },
      { slug: "multistage-vehicle-polish", title: "Multi-Stage Paint Correction", short: "Deeper correction for more visible swirls and paint defects.", description: "A multi-stage correction process for paintwork that needs more than a light enhancement. Different polishing stages progressively reduce defects before refining the finish to a high gloss.", includes: ["Detailed paint assessment", "Wash and decontamination", "Cutting and refining stages", "Final protection"], prices: vehiclePrices(345, 370, 395, 445) },
      { slug: "multi-stage-machine-polish-inc-7-year-ceramic-coating", title: "Paint Correction + 7-Year Ceramic", short: "Correct the finish, then lock in long-term ceramic protection.", description: "A complete enhancement and protection package combining multi-stage paint correction with a durable ceramic coating designed to improve gloss, water behaviour and ease of maintenance.", includes: ["Multi-stage paint correction", "Panel preparation", "7-year ceramic coating", "Curing and final inspection"], prices: vehiclePrices(595, 645, 695, 795) },
      { slug: "new-car-7-year-ceramic-coating", title: "7-Year Ceramic Coating", short: "Add durable ceramic protection after full paint decontamination.", description: "A long-term ceramic coating add-on applied after the paint has received at least a complete decontamination and clay-bar wash. Once the surface is clean and prepared, the coating improves gloss, water behaviour and ease of maintenance.", includes: ["Paint condition assessment", "Panel preparation after decontamination", "7-year ceramic coating", "Curing and final inspection"], prices: vehiclePrices(250, 275, 300, 350), priceNote: "Additional charge on top of a minimum Clay Bar Decontamination Wash.", isAddOn: true },
      { slug: "soft-top-deep-clean-plus-ceramic-coating", title: "Soft Top Clean + Ceramic", short: "Deep-clean and protect a fabric convertible roof.", description: "A convertible roof treatment that combines specialist cleaning with a hydrophobic ceramic coating to help repel water and future contamination.", includes: ["Fabric roof assessment", "Deep clean and rinse", "Controlled drying", "Roof ceramic protection"], prices: vehiclePrices(95, 95, 95, 95), priceNote: "Additional cost added to a suitable main vehicle valeting or polishing service.", isAddOn: true },
      { slug: "soft-top-deep-clean-ceramic-coating-re-dye-roof-only", title: "Soft Top Clean, Re-Dye + Ceramic", short: "Refresh colour and add durable weather protection.", description: "A full convertible roof restoration package for tired fabric, pairing deep cleaning with colour restoration and a protective ceramic finish.", includes: ["Deep roof clean", "Colour restoration treatment", "Ceramic protection", "Final even-finish check"], prices: vehiclePrices(195, 195, 195, 195), priceNote: "Additional cost added to a suitable main vehicle valeting or polishing service.", isAddOn: true },
      { slug: "alloy-wheel-ceramic-coating-face-only", title: "Alloy Wheel Coating — On Vehicle", short: "Help wheel faces resist brake dust and road contamination.", description: "A ceramic protection service for the visible faces of alloy wheels while they remain fitted to the vehicle. Thorough preparation helps the coating bond and makes regular wheel maintenance easier.", includes: ["Wheel-face deep clean", "Chemical decontamination", "Surface preparation", "Ceramic coating application"], prices: vehiclePrices(195, 195, 195, 195), priceNote: "Additional cost added to a suitable main vehicle valeting or polishing service.", isAddOn: true },
      { slug: "full-wheels-off-ceramic-coating", title: "Wheels-Off Ceramic Coating", short: "Complete ceramic protection across wheel faces and barrels.", description: "The wheels are removed so faces, barrels and harder-to-reach areas can be fully cleaned, prepared and coated for more complete protection.", includes: ["Safe wheel removal", "Faces and barrels cleaned", "Full surface preparation", "Ceramic coating and refit"], prices: vehiclePrices(280, 280, 280, 280), priceNote: "Additional cost added to a suitable main vehicle valeting or polishing service.", isAddOn: true },
    ],
  },
  {
    slug: "valet-bay-hire", title: "Valet Bay Hire", eyebrow: "Your space. Pro equipment.", image: "/images/categories/valet-bay-hire.webp", accent: "#cfe3ef",
    intro: "Hire a fully equipped indoor valeting and detailing bay in Norwich, with drainage, lighting, spotless water, pressure washing and specialist equipment available for trade and public use.",
    services: [
      { slug: "public-hire-2-hours", title: "Public Hire — 2 Hours", short: "A focused session for washing or light vehicle care.", description: "Two hours in a professional indoor valeting bay for customers who want the right space and equipment for a focused clean.", includes: ["Indoor wash bay and drainage", "Kranzle K7 pressure washer", "Inline spotless water", "Professional lighting"], prices: vehiclePrices(80, 80, 80, 80) },
      { slug: "public-hire-3-hours", title: "Public Hire — 3 Hours", short: "Extra time for a more thorough wash and detail.", description: "A three-hour session with room to work through a detailed exterior or interior process without rushing.", includes: ["Indoor climate-controlled bay", "Wash and drainage floor", "Wet vacuum and extraction equipment", "Polishing and detailing equipment"] },
      { slug: "public-hire-full-day", title: "Public Hire — Full Day", short: "A full day for in-depth vehicle care projects.", description: "A full-day bay booking for enthusiasts tackling deeper cleaning, polishing or detailing work in a purpose-built facility.", includes: ["Full-day bay access", "Spotless water and pressure washer", "Lighting tunnel", "Wet vacuum and detailing tools"], prices: vehiclePrices(200, 200, 200, 200) },
      { slug: "public-hire-weekend", title: "Public Hire — Weekend", short: "The time and space for a complete detailing project.", description: "A complete weekend booking for larger projects that need extended access to professional space, lighting and equipment.", includes: ["Weekend bay access", "Indoor secure working area", "Professional wash equipment", "Polishing and detailing facilities"], prices: vehiclePrices(350, 350, 350, 350) },
      { slug: "trade-hire-3-hours", title: "Trade Hire — 3 Hours", short: "Professional facilities for a compact trade booking.", description: "A flexible short trade session for mobile valeters, detailers or automotive professionals needing a well-equipped indoor space.", includes: ["Trade-ready indoor bay", "Floor drainage", "Kranzle K7 and spotless water", "Specialist equipment access"], prices: vehiclePrices(50, 50, 50, 50), priceNote: "£50 per three-hour trade session." },
      { slug: "trade-hire-full-day", title: "Trade Hire — Full Day", short: "Dedicated professional workspace for a complete working day.", description: "A full-day booking for trade users who need dependable indoor facilities and professional-grade valeting equipment.", includes: ["Full-day trade access", "Lighting tunnel", "Wet vacuum and extraction", "Wash, polish and detailing equipment"], prices: vehiclePrices(140, 140, 140, 140) },
      { slug: "trade-hire-overnight", title: "Trade Hire — Day + Overnight", short: "Extended access for jobs that need curing or extra time.", description: "Day and overnight hire gives trade users the flexibility to complete longer treatments or allow coatings and finishes the time they need.", includes: ["Day and overnight access", "Indoor work environment", "Full bay equipment", "Extended project flexibility"], prices: vehiclePrices(170, 170, 170, 170), priceNote: "Vehicle collection is required by 8:30am following the overnight hire." },
    ],
  },
];

export const sizeOptions = [
  { key: "small", name: "Small", example: "City cars & compact hatchbacks" },
  { key: "medium", name: "Medium", example: "Saloons & family hatchbacks" },
  { key: "large", name: "Large", example: "Estates, crossovers & small vans" },
  { key: "extraLarge", name: "Extra Large", example: "Large SUVs, 4x4s & vans" },
] as const;

// Replace each amount with the confirmed numeric price before public launch.
// The display value remains POA until the matching amount is approved.
export const placeholderPrices: VehiclePrices = {
  small: { amount: "0.00", display: "POA" },
  medium: { amount: "0.00", display: "POA" },
  large: { amount: "0.00", display: "POA" },
  extraLarge: { amount: "0.00", display: "POA" },
};

export function getServicePrices(service: Service): VehiclePrices {
  return service.prices ?? placeholderPrices;
}

export function getServiceFromPrice(service: Service) {
  const confirmed = Object.values(getServicePrices(service))
    .map((item) => Number(item.amount))
    .filter((amount) => amount > 0);
  return confirmed.length ? `£${Math.min(...confirmed)}` : "POA";
}

export function getCategory(slug: string) { return categories.find((category) => category.slug === slug) }
export function getService(slug: string) {
  for (const category of categories) {
    const service = category.services.find((item) => item.slug === slug);
    if (service) return { category, service };
  }
}
