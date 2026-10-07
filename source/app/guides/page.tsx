import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { guideCategories, guides } from "@/lib/guides";
import { categories, getServiceFromPrice } from "@/lib/services";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

const title = "Vehicle Valeting & Detailing Guides | Auto Opulence";
const description = "Practical Norwich car-care guides covering valeting, hand washing, decontamination, machine polishing, ceramic coatings, lease returns and valet bay hire.";
const heroImage = "/images/home-sections/indoor-detailing-facility.webp";

export const metadata: Metadata = {
  title, description, alternates: { canonical: "/guides" },
  openGraph: { title, description, url: "/guides", siteName: "Auto Opulence", locale: "en_GB", type: "website", images: [{ url: heroImage, width: 1200, height: 800, alt: "Auto Opulence indoor vehicle-care studio in Norwich" }] },
  twitter: { card: "summary_large_image", title, description, images: [heroImage] },
};

export default function GuidesPage() {
  const pageUrl = `${siteUrl}/guides`;
  const featured = guides[0];
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "CollectionPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: title, description, primaryImageOfPage: { "@id": `${pageUrl}/#primaryimage` }, mainEntity: { "@id": `${pageUrl}/#guides` }, inLanguage: "en-GB" }, { "@type": "ImageObject", "@id": `${pageUrl}/#primaryimage`, contentUrl: `${siteUrl}${heroImage}`, caption: "Auto Opulence indoor vehicle-care studio in Norwich" }, { "@type": "ItemList", "@id": `${pageUrl}/#guides`, numberOfItems: guides.length, itemListElement: guides.map((guide, index) => ({ "@type": "ListItem", position: index + 1, name: guide.name, url: `${siteUrl}/guides/${guide.slug}` })) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Guides", item: pageUrl }] }] };
  return <><JsonLd data={schema} /><Header /><main>
    <section className="guide-hub-hero"><img src={heroImage} alt="Professional indoor valeting and detailing facility at Auto Opulence Norwich" /><div className="service-hero-shade" /><div className="shell"><p className="kicker">Vehicle-care advice</p><h1>Make a better-informed choice.</h1><p>Plain-English answers to common questions about cleaning, correction, protection and using our Norwich valet bay.</p><a className="button" href="#browse-guides">Browse {guides.length} guides <ArrowRight size={18} /></a></div></section>
    <section className="section shell guide-feature"><figure><img src={featured.heroImage} alt={featured.heroAlt} /></figure><div><p className="kicker">Featured guide · {featured.readTime}</p><h2>{featured.name}</h2><p>{featured.quickAnswer}</p><Link href={`/guides/${featured.slug}`} className="button">Read the guide <ArrowRight size={17} /></Link></div></section>
    <section className="section guide-library" id="browse-guides"><div className="shell"><div className="section-heading compact"><div><p className="kicker">Help & advice</p><h2>Browse by topic.</h2></div><p>Each guide includes a quick answer, detailed explanation, useful comparisons, FAQs and direct links to relevant services.</p></div>{guideCategories.map((category) => <section className="guide-category" key={category}><div className="guide-category-heading"><BookOpen /><h3>{category}</h3><span>{guides.filter((guide) => guide.category === category).length} guides</span></div><div className="guide-card-grid">{guides.filter((guide) => guide.category === category).map((guide) => <Link href={`/guides/${guide.slug}`} className="guide-image-card" key={guide.slug}><figure><img src={guide.heroImage} alt={guide.heroAlt} /></figure><div><span>{guide.readTime}</span><h3>{guide.name}</h3><p>{guide.intro}</p><strong>Read guide <ArrowRight size={16} /></strong></div></Link>)}</div></section>)}</div></section>
    <section className="section shell guide-service-links"><div className="section-heading compact"><div><p className="kicker">Ready to choose?</p><h2>Explore services and prices.</h2></div><p>Compare what is included, see the relevant starting price and select your vehicle size on the service page.</p></div><div>{categories.map((category) => { const mainService = category.services.find((service) => !service.isAddOn) ?? category.services[0]; return <Link href={`/category/${category.slug}`} key={category.slug}><img src={category.image} alt={`${category.title} services at Auto Opulence Norwich`} /><span>{category.eyebrow}</span><h3>{category.title}</h3><p>{category.intro}</p><strong>From {getServiceFromPrice(mainService)}</strong><small>View services <ArrowRight size={15} /></small></Link>; })}</div></section>
    <section className="guide-hub-cta"><div className="shell"><div><p className="kicker">Still unsure?</p><h2>Describe the vehicle and the result you want.</h2><p>We will help you separate routine maintenance from deeper valeting, paint correction or protection.</p></div><Link href="/contact" className="button">Ask Auto Opulence <ArrowRight size={18} /></Link></div></section>
  </main><Footer /></>;
}
