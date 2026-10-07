import type { MetadataRoute } from "next";
import { locations, sectors } from "@/lib/content";
import { guides } from "@/lib/guides";
import { categories } from "@/lib/services";
import { caseStudies } from "@/lib/case-studies";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/services`, changeFrequency: "monthly", priority: 0.95 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${siteUrl}/gallery`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/case-studies`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/locations`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/business-sectors`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/guides`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/cookies`, changeFrequency: "yearly", priority: 0.3 },
    ...categories.map((category) => ({ url: `${siteUrl}/category/${category.slug}`, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...categories.flatMap((category) => category.services.map((service) => ({ url: `${siteUrl}/service/${service.slug}`, changeFrequency: "monthly" as const, priority: 0.85 }))),
    ...locations.map((location) => ({ url: `${siteUrl}/locations/${location.slug}`, changeFrequency: "monthly" as const, priority: 0.75 })),
    ...sectors.map((sector) => ({ url: `${siteUrl}/business-sectors/${sector.slug}`, changeFrequency: "monthly" as const, priority: 0.75 })),
    ...guides.map((guide) => ({ url: `${siteUrl}/guides/${guide.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...caseStudies.map((study) => ({ url: `${siteUrl}/case-studies/${study.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
