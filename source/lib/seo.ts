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

export function serviceTitle(service: Service) {
  return `${service.title} Norwich | Auto Opulence`;
}

export function serviceDescription(service: Service) {
  return `${service.short} View inclusions and size-based prices from Auto Opulence in Norwich, then book online.`;
}
