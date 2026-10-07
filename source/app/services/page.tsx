import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Footer, Header } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { categories, getServiceFromPrice } from "@/lib/services";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

const title = "Car Valeting & Detailing Services Norwich | Auto Opulence";
const description = "Explore professional vehicle valeting, hand washing, machine polishing, ceramic coating and valet bay hire services in Norwich.";

export const metadata: Metadata = { title, description, alternates: { canonical: "/services" } };

export default function ServicesPage() {
  const pageUrl = `${siteUrl}/services`;
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "CollectionPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: title, description, about: { "@id": `${siteUrl}/#business` }, mainEntity: { "@id": `${pageUrl}/#services` }, inLanguage: "en-GB" }, { "@type": "ItemList", "@id": `${pageUrl}/#services`, name: "Auto Opulence services", numberOfItems: categories.length, itemListElement: categories.map((category, index) => ({ "@type": "ListItem", position: index + 1, name: category.title, url: `${siteUrl}/category/${category.slug}` })) }] };
  return <><JsonLd data={schema} /><Header /><main>
    <section className="content-hero"><div className="shell content-hero-grid"><div><p className="kicker">Services &amp; prices</p><h1>Choose the right care for your vehicle.</h1><p>Compare professional valeting, hand washing, paint correction, ceramic protection and equipped valet bay hire at our Norwich facility.</p></div><div className="content-hero-mark"><Sparkles /><strong>{categories.length}</strong><span>service categories</span></div></div></section>
    <section className="section shell home-services"><div className="section-heading"><div><p className="kicker">Explore your options</p><h2>Four ways to care for your vehicle.</h2></div><p>Open a category to compare treatments, inclusions, vehicle-size pricing and available booking options.</p></div><div className="category-grid">{categories.map((category, index) => { const mainServices = category.services.filter((service) => !service.isAddOn); const startingService = mainServices[0] ?? category.services[0]; return <Link href={`/category/${category.slug}`} className="category-card" key={category.slug} style={{"--card-accent": category.accent} as React.CSSProperties}><div className="category-image"><img src={category.image} alt={`${category.title} services in Norwich`} width="1200" height="800" loading={index === 0 ? "eager" : "lazy"} decoding="async" /><span>0{index + 1}</span></div><div className="category-content"><p>{category.eyebrow}</p><h2>{category.title}</h2><strong>From {getServiceFromPrice(startingService)}</strong><span>Explore services <ArrowRight size={18} /></span></div></Link>; })}</div></section>
  </main><Footer /></>;
}
