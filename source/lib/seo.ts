import type { Category, Service } from "@/lib/services";

export const siteUrl = "https://autoopulence.co.uk";
export const defaultSocialImage = "/images/about/about-auto-opulence-norwich-hero.webp";

export const localBusinessSchema = {
  "@type": ["AutoWash", "LocalBusiness"],
  "@id": `${siteUrl}/#business`,
  name: "Auto Opulence",
  description: "Professional vehicle valeting, hand car washing, machine polishing, ceramic coatings and equipped valet bay hire in Norwich, Norfolk.",
  url: siteUrl,
  telephone: "+443300536925",
  email: "valeting@autoopulence.co.uk",
  priceRange: "££",
  image: `${siteUrl}/images/case-studies/merl-grey-range-rover-sport/range-rover-auto-opulence-ceramic-coating.webp`,
  logo: `${siteUrl}/auto-opulence-logo-black.svg`,
  sameAs: [
    "https://www.instagram.com/autoopulencedetailing",
    "https://www.facebook.com/autoopulence",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+443300536925",
    email: "valeting@autoopulence.co.uk",
    contactType: "customer service",
    areaServed: "GB",
    availableLanguage: "English",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "Unit 7 Consensus House, St Faiths Road",
    addressLocality: "Norwich",
    addressRegion: "Norfolk",
    postalCode: "NR6 7BW",
    addressCountry: "GB",
  },
  areaServed: [
    { "@type": "City", name: "Norwich" },
    { "@type": "AdministrativeArea", name: "Norfolk" },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Auto Opulence vehicle-care services",
    itemListElement: [
      { "@type": "OfferCatalog", name: "Vehicle Valeting", url: `${siteUrl}/category/vehicle-valeting` },
      { "@type": "OfferCatalog", name: "Vehicle Washing", url: `${siteUrl}/category/vehicle-washing` },
      { "@type": "OfferCatalog", name: "Vehicle Polishing and Ceramic Coatings", url: `${siteUrl}/category/vehicle-polishing` },
      { "@type": "OfferCatalog", name: "Valet Bay Hire", url: `${siteUrl}/category/valet-bay-hire` },
    ],
  },
};

export function categoryTitle(category: Category) {
  if (category.slug === "valet-bay-hire") return "Valet Bay Hire Norwich | Auto Opulence";
  return `${category.title} Norwich | Auto Opulence`;
}

export function categoryDescription(category: Category) {
  const descriptions: Record<string, string> = {
    "vehicle-valeting": "Compare professional vehicle valeting in Norwich, including interior, exterior, deep-clean and restoration options with clear size-based prices.",
    "vehicle-washing": "Compare professional hand washing and paint decontamination services in Norwich, with clear inclusions and prices for every vehicle size.",
    "vehicle-polishing": "Compare machine polishing, paint correction and ceramic coating services in Norwich, with clear inclusions and vehicle-size prices.",
    "valet-bay-hire": "Hire a professional indoor valeting and detailing bay in Norwich, with spotless water, lighting, drainage and equipment for public or trade use.",
  };
  return descriptions[category.slug] ?? category.intro;
}

// Search titles stay within ~60 characters (Google cuts the rest off); long service names use a shorter form.
const shortServiceNames: Record<string, string> = {
  "7-year-ceramic-coating-with-clay-bar-decontamination-wash": "7-Year Ceramic Coating & Clay Bar Wash",
};
export function serviceTitle(service: Service) {
  const name = shortServiceNames[service.slug] ?? service.title;
  return [`${name} Norwich | Auto Opulence`, `${name} | Auto Opulence`, `${name} Norwich`].find((t) => t.length <= 60) ?? name;
}

// Descriptions stay within 160 characters.
const shortServiceDescriptions: Record<string, string> = {
  "3-plus-1-year-ceramic-coating": "Clay bar wash, a 3-year ceramic coating and a second coat the next day for 4 years of protection. Size-based prices from Auto Opulence, Norwich.",
};
export function serviceDescription(service: Service) {
  if (shortServiceDescriptions[service.slug]) return shortServiceDescriptions[service.slug];
  return [
    `${service.short} View inclusions and size-based prices from Auto Opulence in Norwich, then book online.`,
    `${service.short} Size-based prices from Auto Opulence in Norwich; book online.`,
    `${service.short} Book online with Auto Opulence, Norwich.`,
  ].find((d) => d.length <= 160) ?? service.short.slice(0, 157).replace(/\s+\S*$/, "") + "…";
}
