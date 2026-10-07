import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { locations } from "@/lib/content";
import { categories } from "@/lib/services";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

const title = "Car Valeting Locations in Norfolk | Auto Opulence";
const description = "Explore areas served by Auto Opulence for vehicle valeting, hand washing, machine polishing, ceramic coatings and valet bay hire near Norwich.";
const socialImage = "/images/home-sections/indoor-detailing-facility.webp";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/locations" },
  openGraph: { title, description, url: "/locations", siteName: "Auto Opulence", locale: "en_GB", type: "website", images: [{ url: socialImage, width: 1200, height: 800, alt: "Auto Opulence indoor vehicle detailing facility in Norwich" }] },
  twitter: { card: "summary_large_image", title, description, images: [socialImage] },
};

export default function LocationsPage() {
  const pageUrl = `${siteUrl}/locations`;
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "CollectionPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: title, description, about: { "@id": `${siteUrl}/#business` }, mainEntity: { "@id": `${pageUrl}/#locations` }, inLanguage: "en-GB" }, { "@type": "ItemList", "@id": `${pageUrl}/#locations`, name: "Auto Opulence service areas", numberOfItems: locations.length, itemListElement: locations.map((location, index) => ({ "@type": "ListItem", position: index + 1, name: location.name, url: `${siteUrl}/locations/${location.slug}` })) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Locations", item: pageUrl }] }] };
  return <><JsonLd data={schema} /><Header /><main>
    <section className="content-hero"><div className="shell content-hero-grid"><div><p className="kicker">Norwich & Norfolk</p><h1>Vehicle care worth the journey.</h1><p>Auto Opulence is based in north Norwich and welcomes customers from across Norfolk for valeting, washing, polishing, ceramic coatings and equipped valet bay hire.</p></div><div className="content-hero-mark"><MapPin /><strong>{locations.length}</strong><span>local area guides</span></div></div></section>
    <section className="section shell"><div className="section-heading compact"><div><p className="kicker">Areas we serve</p><h2>Plan your visit.</h2></div><p>Choose your area for relevant journey information, common vehicle-care needs and direct links to the most useful services.</p></div><div className="content-card-grid">{locations.map((location) => <Link href={`/locations/${location.slug}`} className="content-card" key={location.slug}><MapPin /><span>Norfolk location</span><h2>{location.name}</h2><p>{location.intro}</p><strong>View local guide <ArrowRight size={17} /></strong></Link>)}</div></section>
    <section className="location-hub-feature shell">
      <figure><img src="/images/home-sections/indoor-detailing-facility.webp" alt="Purpose-equipped Auto Opulence indoor valeting and detailing facility in Norwich" /></figure>
      <div><p className="kicker">One genuine Norwich facility</p><h2>Know where the work happens.</h2><p>Every service-area page connects to Unit 7 Consensus House on St Faiths Road. The local guides help you compare relevant treatments and plan the journey without suggesting that Auto Opulence operates virtual branches around Norfolk.</p><address><strong>Auto Opulence</strong><br />Unit 7 Consensus House, St Faiths Road<br />Norwich, Norfolk, NR6 7BW</address><a href="https://www.google.com/maps/search/?api=1&query=Unit+7+Consensus+House+St+Faiths+Road+Norwich+NR6+7BW" target="_blank" rel="noreferrer" className="inline-link">Open the Norwich location <ArrowRight size={17} /></a></div>
    </section>
    <section className="section shell location-hub-process"><div className="section-heading compact"><div><p className="kicker">How local appointments work</p><h2>Choose, confirm, travel.</h2></div><p>Useful local information supports the booking; it does not replace a clear service recommendation or confirmed appointment.</p></div><div><article><ShieldCheck /><h3>Choose by condition</h3><p>Compare washing, valeting, polishing, protection and bay-hire services using real inclusions and current from-prices.</p></article><article><CalendarClock /><h3>Confirm the appointment</h3><p>We confirm the vehicle size, treatment, price and expected completion window before you travel.</p></article><article><Navigation /><h3>Plan the route</h3><p>Open directions from your town to the same purpose-equipped facility on St Faiths Road in north Norwich.</p></article></div></section>
    <section className="support-band"><div className="shell support-band-grid"><div><p className="kicker">All services, one facility</p><h2>Choose the work before you travel.</h2><p>Every local page connects to the same confirmed Auto Opulence address. We do not present virtual offices or duplicate local branches.</p></div><div className="support-links">{categories.map((category) => <Link href={`/category/${category.slug}`} key={category.slug}>{category.title}<ArrowRight size={16} /></Link>)}</div></div></section>
  </main><Footer /></>;
}
