import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowRight, Check, Phone } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";
import { BookingWidget } from "@/components/booking-widget";
import { JsonLd } from "@/components/json-ld";
import { getService, getServicePrices, getServiceFromPrice, sizeOptions, type Service } from "@/lib/services";
import { getServiceCardImage, getServiceImageAlt } from "@/lib/category-presentation";
import { guides } from "@/lib/guides";
import { caseStudies } from "@/lib/case-studies";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

// Ceramic Coating Norwich — the hub for every ceramic coating service (the services themselves live in the
// Vehicle Polishing category). It's the landing page for "ceramic coating" and "ceramic coating cost" searches,
// in Google Ads and organic search. Prices come from lib/services.ts, so they always match the service pages.

const PATH = "/ceramic-coating";
const MAIN = [
  { slug: "3-plus-1-year-ceramic-coating", years: "4 years", label: "Best value", suits: "Daily drivers and family cars in good condition that need dependable, long-lasting protection." },
  { slug: "7-year-ceramic-coating-with-clay-bar-decontamination-wash", years: "7 years", label: "Longest protection", suits: "New cars and well-kept paint, where you want the longest-lasting protection in one booking." },
  { slug: "multi-stage-machine-polish-inc-7-year-ceramic-coating", years: "7 years", label: "Correct + protect", suits: "Paint with swirls, haze or light scratches: we correct the finish first, then lock it in." },
];
const EXTRAS = ["new-car-7-year-ceramic-coating", "alloy-wheel-ceramic-coating-face-only", "full-wheels-off-ceramic-coating", "soft-top-deep-clean-plus-ceramic-coating", "soft-top-deep-clean-ceramic-coating-re-dye-roof-only"];

const svc = (slug: string) => getService(slug)!.service;
const fromNumber = (s: Service) => Number(getServiceFromPrice(s).replace(/[^0-9.]/g, "")) || 0;
const mainServices = MAIN.map((m) => ({ ...m, service: svc(m.slug) }));
const extraServices = EXTRAS.map(svc);
const lowest = Math.min(...mainServices.map((m) => fromNumber(m.service)));
const seven = fromNumber(svc("7-year-ceramic-coating-with-clay-bar-decontamination-wash"));
const highest = Math.max(...mainServices.map((m) => Number(getServicePrices(m.service).extraLarge.amount)));

const TITLE = `Ceramic Coating Norwich | Prices & Cost from £${lowest} | Auto Opulence`;
const DESCRIPTION = `Professional Gyeon ceramic coating in Norwich. 4-year and 7-year packages from £${lowest}, clear prices for every vehicle size, plus wheel and soft-top coatings.`;
const HERO = getServiceCardImage("7-year-ceramic-coating-with-clay-bar-decontamination-wash", "/images/categories/vehicle-polishing.webp");
const HERO_ALT = getServiceImageAlt("7-year-ceramic-coating-with-clay-bar-decontamination-wash", "Ceramic coated car at Auto Opulence in Norwich");

export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION, alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, siteName: "Auto Opulence", locale: "en_GB", type: "website", images: [{ url: `${siteUrl}${HERO}`, width: 1200, height: 800, alt: HERO_ALT }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [HERO] },
};

const faqs = [
  { question: "How much does ceramic coating cost in Norwich?", answer: `Our ceramic coating packages start from £${lowest} for the 3 + 1 Year Ceramic Coating (4 years of protection) and £${seven} for the 7-Year Ceramic Coating with a Clay Bar Decontamination Wash. Prices depend on vehicle size, from small city cars to large SUVs, 4x4s and vans, up to £${highest} for paint correction plus a 7-year coating on an extra-large vehicle. Every package price includes the preparation the coating needs.` },
  { question: "How long does ceramic coating last?", answer: "Choose 4 years (the 3 + 1 Year package: a 3-year coating plus a second coat the next day for an extra year) or 7 years (our 7-year packages). How long it lasts in practice depends on safe washing and aftercare; we give you aftercare advice at handover." },
  { question: "How long will you need my car?", answer: "The 7-Year Ceramic Coating with Clay Bar Decontamination Wash is about 10 working hours, so we keep the vehicle until the next working day. The 3 + 1 Year package needs a full working day plus about 2 hours the following day for the second coat. A loan car or van can be requested when you book." },
  { question: "Does my car need paint correction before a ceramic coating?", answer: "Not always. New cars and well-kept paint only need our full decontamination and preparation, which every package includes. If the paint has swirls, haze or light scratches, choose Paint Correction + 7-Year Ceramic so the finish is corrected before it is protected. We inspect the paint before starting and talk you through it." },
  { question: "Can you ceramic coat alloy wheels and convertible roofs?", answer: `Yes. Wheel faces can be coated on the car (from ${getServiceFromPrice(svc("alloy-wheel-ceramic-coating-face-only"))}) or with the wheels off so the barrels are protected too (from ${getServiceFromPrice(svc("full-wheels-off-ceramic-coating"))}). Fabric soft tops can be deep cleaned and coated (from ${getServiceFromPrice(svc("soft-top-deep-clean-plus-ceramic-coating"))}). These are added to a suitable main service.` },
  { question: "Is ceramic coating better than wax?", answer: "A ceramic coating bonds to the paint and lasts years, where wax lasts weeks to months. It keeps paint glossier, makes it repel water and dirt, and makes washing quicker. It isn't scratch-proof, and it still needs safe washing. Our ceramic coating vs car wax guide compares the two in detail." },
  { question: "Which ceramic coating do you use?", answer: "We use Gyeon ceramic coatings, applied by hand in our indoor, climate-controlled Norwich studio after a full decontamination wash and panel preparation." },
];

const steps = [
  { title: "Decontamination wash", text: "A safe pre-wash and contact wash with our Kranzle K7, then iron fallout and tar removal and a clay bar treatment to take off bonded contamination." },
  { title: "Spotless-water rinse", text: "Rinsing with our inline spotless-water system reduces the minerals that leave water marks, so the paint is genuinely clean before it is inspected." },
  { title: "Inspection and panel preparation", text: "The paint is checked under our studio lighting, then every panel is prepared so the coating bonds properly. Paint correction is carried out first where it's booked." },
  { title: "Gyeon ceramic coating", text: "The coating is applied panel by panel indoors, out of the wind, rain and dust, and levelled for an even, glossy finish." },
  { title: "Curing and final check", text: "The coating is left to cure in the studio, then we carry out a final inspection and talk you through aftercare at handover." },
];

export default function CeramicCoatingPage() {
  const pageUrl = `${siteUrl}${PATH}`;
  const study = caseStudies.find((s) => s.slug === "merl-grey-range-rover-sport-ceramic-coating");
  const helpful = guides.filter((g) => /ceramic/.test(g.slug)).slice(0, 3);
  const offers = [...mainServices.map((m) => m.service), ...extraServices].flatMap((service) => sizeOptions.flatMap((size) => {
    const p = getServicePrices(service)[size.key];
    return p.display === "POA" ? [] : [{ "@type": "Offer", name: `${service.title} — ${size.name} vehicle`, price: p.amount, priceCurrency: "GBP", availability: "https://schema.org/InStock", url: `${siteUrl}/service/${service.slug}`, description: `${size.example}.${service.isAddOn ? " Added to a suitable main service." : ""}` }];
  }));
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema,
    { "@type": "WebPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: TITLE, description: DESCRIPTION, about: { "@id": `${pageUrl}/#service` }, primaryImageOfPage: { "@id": `${pageUrl}/#primaryimage` }, inLanguage: "en-GB" },
    { "@type": "ImageObject", "@id": `${pageUrl}/#primaryimage`, contentUrl: `${siteUrl}${HERO}`, caption: HERO_ALT },
    { "@type": "Service", "@id": `${pageUrl}/#service`, name: "Ceramic Coating", serviceType: "Car ceramic coating", description: DESCRIPTION, url: pageUrl, image: { "@id": `${pageUrl}/#primaryimage` }, provider: { "@id": `${siteUrl}/#business` }, areaServed: [{ "@type": "City", name: "Norwich" }, { "@type": "AdministrativeArea", name: "Norfolk" }],
      hasOfferCatalog: { "@type": "OfferCatalog", name: "Ceramic coating prices", itemListElement: offers } },
    { "@type": "FAQPage", "@id": `${pageUrl}/#faq`, mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Vehicle Polishing", item: `${siteUrl}/category/vehicle-polishing` }, { "@type": "ListItem", position: 3, name: "Ceramic Coating", item: pageUrl }] }] };

  return <><JsonLd data={schema} /><Header /><main className="ceramic-page">
    <section className="service-hero category-service-hero" style={{ "--category-accent": "#82b5e2" } as React.CSSProperties}>
      <img className="service-hero-image" src={HERO} alt={HERO_ALT} width="1200" height="800" fetchPriority="high" decoding="async" />
      <div className="service-hero-shade" />
      <div className="shell service-hero-content"><div className="service-hero-copy">
        <p className="kicker">Gyeon ceramic coating · Norwich</p>
        <h1>Ceramic Coating in Norwich</h1>
        <p>Long-lasting ceramic coating for your car&apos;s paintwork, applied in our indoor Norwich studio after a full decontamination wash. Choose 4 or 7 years of protection, with clear ceramic coating prices for every vehicle size.</p>
        <div className="category-hero-actions"><a href="#prices" className="button">See prices <ArrowDown size={18} /></a><a href="#book" className="category-hero-text-link">Book a ceramic coating <ArrowDown size={17} /></a><a href="tel:03300536925" className="category-hero-text-link"><Phone size={16} /> 0330 053 6925</a></div>
      </div><div className="service-hero-proof category-hero-proof"><strong>From £{lowest}</strong><span>4-year and 7-year packages · prices by vehicle size</span></div></div>
    </section>

    <section className="section shell" id="prices">
      <div className="section-heading compact"><div><p className="kicker">Ceramic coating prices</p><h2>Ceramic coating cost by vehicle size.</h2></div><p>Every package includes the wash, decontamination and preparation the coating needs. Pick your vehicle size when you book; we confirm it before your appointment.</p></div>
      <div className="comparison-chart-wrap"><table className="comparison-chart ceramic-price-table"><caption className="sr-only">Ceramic coating package prices by vehicle size</caption>
        <thead><tr><th scope="col">Package</th><th scope="col"><span>Protection</span></th>{sizeOptions.map((s) => <th scope="col" key={s.key}><span title={s.example}>{s.name}</span></th>)}<th scope="col"><span className="sr-only">Book</span></th></tr></thead>
        <tbody>{mainServices.map(({ service, years, label }) => { const p = getServicePrices(service); return <tr key={service.slug}>
          <th scope="row"><Link href={`/service/${service.slug}`}><span>{service.title}</span><small>{label}</small></Link></th>
          <td data-label="Protection"><strong>{years}</strong></td>
          {sizeOptions.map((s) => <td key={s.key} data-label={s.name}>{p[s.key].display}</td>)}
          <td className="ceramic-book"><a href="#book" className="inline-link">Book <ArrowRight size={15} /></a></td></tr>; })}</tbody></table></div>
      <p className="service-comparison-note">Small: {sizeOptions[0].example.toLowerCase()} · Medium: {sizeOptions[1].example.toLowerCase()} · Large: {sizeOptions[2].example.toLowerCase()} · Extra Large: {sizeOptions[3].example.toLowerCase()}.</p>
      <header className="service-group-heading additional"><p className="kicker">Add to a package</p><h3>Wheels, soft tops and coating-only</h3><p>These are added to a suitable main service booking.</p></header>
      <div className="ceramic-extras">{extraServices.map((service) => <Link key={service.slug} href={`/service/${service.slug}`}><strong>{service.title}</strong><span>{service.short}</span><em>{new Set(Object.values(getServicePrices(service)).map((x) => x.display)).size === 1 ? getServiceFromPrice(service) : `From ${getServiceFromPrice(service)}`}</em></Link>)}</div>
    </section>

    <section className="about-service"><div className="shell"><div className="section-heading compact"><div><p className="kicker">Choose a package</p><h2>Which ceramic coating is right for your car?</h2></div><p>All three start with a full decontamination wash and finish with a final inspection and aftercare advice. The difference is how long the protection lasts and whether the paint is corrected first.</p></div>
      <div className="ceramic-choice">{mainServices.map(({ service, years, label, suits }) => <article key={service.slug} className="included-card">
        <p className="kicker">{label} · {years}</p><h3>{service.title}</h3><p>{suits}</p>
        <ul>{service.includes.map((item) => <li key={item}><Check size={18} />{item}</li>)}</ul>
        {service.priceNote && <p className="included-note">{service.priceNote}</p>}
        <p className="ceramic-choice-price">From {getServiceFromPrice(service)} <Link href={`/service/${service.slug}`} className="inline-link">Full details <ArrowRight size={15} /></Link></p>
      </article>)}</div></div></section>

    <section className="section shell"><div className="section-heading compact"><div><p className="kicker">Why ceramic coating</p><h2>Ceramic paint protection that lasts for years.</h2></div></div>
      <div className="ceramic-benefits">
        <div><h3>Deeper, longer-lasting gloss</h3><p>A ceramic coating bonds to the clear coat and keeps paintwork looking freshly detailed for years, not the weeks a wax lasts.</p></div>
        <div><h3>Water and dirt run off</h3><p>The hydrophobic surface makes rain bead and roll away, taking road dirt with it, so the car stays cleaner between washes.</p></div>
        <div><h3>Quicker, safer washing</h3><p>Traffic film, bird droppings and brake dust release more easily, so washing takes less effort and less rubbing.</p></div>
        <div><h3>Protection from the elements</h3><p>The coating helps shield paint from UV, road salt and contamination that dull the finish over time.</p></div>
      </div>
      <p className="ceramic-honest">A ceramic coating isn&apos;t scratch-proof and doesn&apos;t replace careful washing. Our <Link href="/guides/ceramic-coating-aftercare">ceramic coating aftercare guide</Link> explains how to keep it performing.</p>
    </section>

    <section className="section shell"><div className="section-heading compact"><div><p className="kicker">Our process</p><h2>How we apply your ceramic coating.</h2></div><p>Everything happens inside our climate-controlled detailing studio at Consensus House, Norwich, so the coating goes onto clean, dry, dust-free paint.</p></div>
      <ol className="ceramic-steps">{steps.map((s, i) => <li key={s.title}><span>{i + 1}</span><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
    </section>

    {study && <section className="section shell ceramic-study"><div className="section-heading compact"><div><p className="kicker">Case study</p><h2>Ceramic coating a Merl Grey Range Rover Sport.</h2></div><p>{study.summary}</p></div>
      <div className="gallery-grid">{study.images.slice(0, 3).map((img, i) => <div key={img.src} className={i === 0 ? "gallery-large" : "gallery-tile"}><img src={img.src} alt={img.alt} width="1200" height="800" loading="lazy" decoding="async" /></div>)}</div>
      <p><Link href={`/case-studies/${study.slug}`} className="inline-link">Read the Range Rover Sport ceramic coating case study <ArrowRight size={16} /></Link></p>
    </section>}

    <section className="section shell faq-section" id="faqs"><div><p className="kicker">Ceramic coating FAQs</p><h2>Your questions answered.</h2></div>
      <div className="faq-list">{faqs.map((faq, i) => <details key={faq.question} open={i === 0}><summary>{faq.question}</summary><p>{faq.answer}{faq.question.startsWith("Is ceramic coating better") && <> <Link href="/guides/ceramic-coating-vs-car-wax">Read the guide</Link>.</>}</p></details>)}</div>
    </section>

    <section className="booking-section shell"><BookingWidget initialCategory="vehicle-polishing" /></section>

    {helpful.length > 0 && <section className="section shell service-guide-links"><div className="section-heading compact"><div><p className="kicker">Helpful advice</p><h2>Ceramic coating guides.</h2></div><p>Independent advice to help you decide, and to look after the coating once it&apos;s on.</p></div>
      <div>{helpful.map((g) => <Link href={`/guides/${g.slug}`} key={g.slug}><img src={g.heroImage} alt={g.heroAlt} width="1200" height="800" loading="lazy" decoding="async" /><span>{g.category} · {g.readTime}</span><h3>{g.name}</h3><strong>Read guide <ArrowRight size={16} /></strong></Link>)}</div></section>}

    <section className="service-links shell"><h2>More ways to protect and refresh your car</h2><p>Pair a ceramic coating with <Link href="/category/vehicle-polishing">machine polishing and paint correction</Link>, keep it clean with a <Link href="/service/hand-car-wash-norwich">hand car wash</Link>, or see <Link href="/category/vehicle-valeting">vehicle valeting in Norwich</Link>. Not sure which package suits your paint? <Link href="/contact">Send us a photo and ask</Link>.</p></section>

    <section className="contact-strip"><div className="shell"><div><p className="kicker">Not sure which coating to choose?</p><h2>Talk it through with us.</h2></div><div><a href="tel:03300536925" className="button">Call 0330 053 6925</a><Link href="/contact" className="inline-link">Send an enquiry <ArrowRight size={17} /></Link></div></div></section>
  </main><Footer /></>;
}
