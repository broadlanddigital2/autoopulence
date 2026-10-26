import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Footer, Header } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { categories, getServiceFromPrice } from "@/lib/services";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

const title = "Car Valeting & Detailing Services Norwich | Auto Opulence";
const description = "Explore professional vehicle valeting, hand washing, machine polishing, ceramic coating and valet bay hire services in Norwich.";

const faqs = [
  { question: "Which service should I book for a car that just needs a clean?", answer: "A hand wash suits regular maintenance. If the interior needs attention too, choose an exterior and interior valet. Both are short visits and are priced by vehicle size." },
  { question: "What is the difference between a valet and machine polishing?", answer: "A valet cleans the paint, glass, wheels and interior. Machine polishing goes further and removes swirl marks, light scratches and dullness from the paint itself, so the gloss comes back. It needs a longer booking." },
  { question: "Do I need paint correction before a ceramic coating?", answer: "Usually, yes. A coating locks in the finish underneath it, so we polish the paint first. New cars often only need a light enhancement, older paint may need more correction." },
  { question: "Can I hire the bay and do the work myself?", answer: "Yes. Valet bay hire gives you an indoor bay with professional lighting, a pressure washer, spotless water and equipment, for public users and trade customers." },
  { question: "How are prices worked out?", answer: "Each service is priced by vehicle size, from small hatchbacks to large SUVs and vans. Open a category to see the price for your vehicle before you book." },
];

export const metadata: Metadata = { title, description, alternates: { canonical: "/services" } };

export default function ServicesPage() {
  const pageUrl = `${siteUrl}/services`;
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "CollectionPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: title, description, about: { "@id": `${siteUrl}/#business` }, mainEntity: { "@id": `${pageUrl}/#services` }, inLanguage: "en-GB" }, { "@type": "ItemList", "@id": `${pageUrl}/#services`, name: "Auto Opulence services", numberOfItems: categories.length, itemListElement: categories.map((category, index) => ({ "@type": "ListItem", position: index + 1, name: category.title, url: `${siteUrl}/category/${category.slug}` })) }, { "@type": "FAQPage", "@id": `${pageUrl}/#faq`, mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }] };
  return <><JsonLd data={schema} /><Header /><main>
    <section className="content-hero"><div className="shell content-hero-grid"><div><p className="kicker">Services &amp; prices</p><h1>Choose the right care for your vehicle.</h1><p>Compare professional valeting, hand washing, paint correction, ceramic protection and equipped valet bay hire at our Norwich facility.</p></div><div className="content-hero-mark"><Sparkles /><strong>{categories.length}</strong><span>service categories</span></div></div></section>
    <section className="section shell home-services"><div className="section-heading"><div><p className="kicker">Explore your options</p><h2>Four ways to care for your vehicle.</h2></div><p>Open a category to compare treatments, inclusions, vehicle-size pricing and available booking options.</p></div><div className="category-grid">{categories.map((category, index) => { const mainServices = category.services.filter((service) => !service.isAddOn); const startingService = mainServices[0] ?? category.services[0]; return <Link href={`/category/${category.slug}`} className="category-card" key={category.slug} style={{"--card-accent": category.accent} as React.CSSProperties}><div className="category-image"><img src={category.image} alt={`${category.title} services in Norwich`} width="1200" height="800" loading={index === 0 ? "eager" : "lazy"} decoding="async" /><span>0{index + 1}</span></div><div className="category-content"><p>{category.eyebrow}</p><h2>{category.title}</h2><strong>From {getServiceFromPrice(startingService)}</strong><span>Explore services <ArrowRight size={18} /></span></div></Link>; })}</div></section>
    <section className="section shell"><div className="section-heading"><div><p className="kicker">How to choose</p><h2>Car valeting and detailing in Norwich, explained.</h2></div><p>Every service runs from our indoor studio at Unit 7 Consensus House, St Faiths Road, Norwich, NR6 7BW, and every booking is confirmed in advance.</p></div>
      <p><strong>Vehicle washing</strong> covers routine maintenance: a safe hand wash, with options for a vacuum or a decontamination wash that removes bonded fallout and tar before polishing. <strong>Vehicle valeting</strong> adds the interior, from a maintenance valet to a deep clean of seats, carpets and trim for cars being sold, returned at the end of a lease or brought back from neglect.</p>
      <p><strong>Vehicle polishing</strong> is for paintwork that looks dull or shows swirls and light scratches. A stage 1 machine polish brings back the gloss, and multi-stage correction removes heavier defects. Finish with a <Link href="/ceramic-coating">ceramic coating</Link> for years of protection that makes washing easier. <strong>Valet bay hire</strong> lets enthusiasts and trade users do the work themselves with professional lighting and equipment.</p>
      <p>Not sure which suits your car? Send us a photo and we will recommend the right level of work, so you never pay for more than the vehicle needs. Prices are set by vehicle size and shown on each category page.</p>
    </section>
    <section className="section shell faq-section" id="faqs"><div><p className="kicker">Service FAQs</p><h2>Your questions answered.</h2></div>
      <div className="faq-list">{faqs.map((faq, i) => <details key={faq.question} open={i === 0}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
    </section>
  </main><Footer /></>;
}
