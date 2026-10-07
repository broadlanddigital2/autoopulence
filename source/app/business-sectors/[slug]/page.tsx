import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, Clock3, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";
import { EnquiryForm } from "@/components/enquiry-form";
import { JsonLd } from "@/components/json-ld";
import { getCaseStudy } from "@/lib/case-studies";
import { getSector, sectors } from "@/lib/content";
import { getServiceCardImage, getServiceImageAlt } from "@/lib/category-presentation";
import { getService, getServiceFromPrice, getServicePrices, type Service } from "@/lib/services";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

const localAreas = [
  { name: "Norwich", slug: "norwich" },
  { name: "Wymondham", slug: "wymondham" },
  { name: "Dereham", slug: "dereham" },
  { name: "Great Yarmouth", slug: "great-yarmouth" },
];

function lowestNumericPrice(service: Service) {
  const confirmed = Object.values(getServicePrices(service)).map((item) => Number(item.amount)).filter((amount) => amount > 0);
  return confirmed.length ? Math.min(...confirmed).toFixed(2) : undefined;
}

export function generateStaticParams() { return sectors.map((sector) => ({ slug: sector.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) return {};
  const url = `/business-sectors/${sector.slug}`;
  return {
    title: sector.title,
    description: sector.description,
    alternates: { canonical: url },
    openGraph: { title: sector.title, description: sector.description, url, siteName: "Auto Opulence", locale: "en_GB", type: "website", images: [{ url: sector.heroImage, width: 1200, height: 800, alt: sector.heroAlt }] },
    twitter: { card: "summary_large_image", title: sector.title, description: sector.description, images: [sector.heroImage] },
  };
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) notFound();

  const pageUrl = `${siteUrl}/business-sectors/${sector.slug}`;
  const recommendations = sector.recommendedServices.flatMap((recommendation) => {
    const match = getService(recommendation.slug);
    return match ? [{ ...recommendation, ...match }] : [];
  });
  const project = getCaseStudy(sector.caseStudySlug);
  const initialService = recommendations[0]?.category.slug || sector.categorySlugs[0] || "vehicle-valeting";
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      localBusinessSchema,
      { "@type": "WebPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: sector.title, description: sector.description, about: { "@id": `${pageUrl}/#business-service` }, primaryImageOfPage: { "@id": `${pageUrl}/#primaryimage` }, audience: { "@type": "BusinessAudience", audienceType: sector.name }, inLanguage: "en-GB" },
      { "@type": "ImageObject", "@id": `${pageUrl}/#primaryimage`, contentUrl: `${siteUrl}${sector.heroImage}`, caption: sector.heroAlt },
      { "@type": "Service", "@id": `${pageUrl}/#business-service`, name: sector.h1.replace(/\.$/, ""), serviceType: recommendations.map(({ service }) => service.title), description: sector.intro, provider: { "@id": `${siteUrl}/#business` }, areaServed: [{ "@type": "City", name: "Norwich" }, { "@type": "AdministrativeArea", name: "Norfolk" }], audience: { "@type": "BusinessAudience", audienceType: sector.name }, image: `${siteUrl}${sector.heroImage}`, url: pageUrl, offers: recommendations.flatMap(({ service }) => { const price = lowestNumericPrice(service); return price ? [{ "@type": "Offer", name: `${service.title} from price`, price, priceCurrency: "GBP", availability: "https://schema.org/InStock", url: `${siteUrl}/service/${service.slug}`, description: service.priceNote || service.short }] : []; }) },
      { "@type": "FAQPage", "@id": `${pageUrl}/#faq`, mainEntity: sector.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Business Sectors", item: `${siteUrl}/business-sectors` }, { "@type": "ListItem", position: 3, name: sector.name, item: pageUrl }] },
    ],
  };

  return <><JsonLd data={schema} /><Header /><main>
    <section className="service-hero business-sector-hero"><img className="service-hero-image" src={sector.heroImage} alt={sector.heroAlt} /><div className="service-hero-shade" /><div className="shell service-hero-content"><Link href="/business-sectors" className="back-link"><ArrowLeft size={17} /> For business</Link><div className="service-hero-copy"><p className="kicker">Commercial vehicle care · Norwich</p><h1>{sector.h1}</h1><p>{sector.intro}</p><div className="business-hero-actions"><a href="#business-enquiry" className="button">Request a business quote <ArrowRight size={18} /></a><a href="tel:03300536925" className="business-hero-link"><Phone size={17} /> 0330 053 6925</a></div></div><div className="service-hero-proof business-hero-proof"><Building2 /><strong>Purpose-equipped Norwich facility</strong><span>Clear services · Confirmed appointments</span></div></div></section>

    <section className="section shell business-overview"><div className="business-overview-copy"><p className="kicker">The commercial requirement</p><h2>Vehicle care built around the work.</h2>{sector.overview.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<ul className="check-list">{sector.solutions.map((solution) => <li key={solution}><Check size={18} />{solution}</li>)}</ul></div><div className="business-needs-grid">{sector.needs.map((need, index) => <article key={need.title}><span>0{index + 1}</span><h3>{need.title}</h3><p>{need.body}</p></article>)}</div></section>

    <section className="business-services-section"><div className="section shell"><div className="section-heading compact"><div><p className="kicker">Recommended services</p><h2>Choose from the vehicle’s condition.</h2></div><p>These services are practical starting points for {sector.name.toLowerCase()}. Published prices remain linked to the individual vehicle size and service requirements.</p></div><div className="business-service-grid">{recommendations.map(({ service, category, reason, frequency }) => { const image = getServiceCardImage(service.slug, category.image); const imageAlt = getServiceImageAlt(service.slug, `${service.title} for ${sector.name.toLowerCase()} in Norwich`); return <article key={service.slug} className="business-service-card"><Link href={`/service/${service.slug}`} className="business-service-image"><img src={image} alt={imageAlt} /><span>{category.title}</span></Link><div><small>{frequency}</small><h3><Link href={`/service/${service.slug}`}>{service.title}</Link></h3><p>{reason}</p>{service.priceNote && <em>{service.priceNote}</em>}<footer><span>{service.isAddOn ? "Additional cost from" : "From"}<strong>{getServiceFromPrice(service)}</strong></span><Link href={`/service/${service.slug}`}>View service <ArrowRight size={16} /></Link></footer></div></article>; })}</div></div></section>

    <section className="section shell business-comparison" id="compare-business-services"><div className="section-heading compact"><div><p className="kicker">Compare the routes</p><h2>Services for this sector.</h2></div><p>Compare the purpose, typical scope, suggested frequency and starting price before opening the full service details.</p></div><div className="business-comparison-table"><table><thead><tr><th>Service</th><th>Best for</th><th>Key inclusions</th><th>Suggested use</th><th>From</th></tr></thead><tbody>{recommendations.map(({ service, reason, frequency }) => <tr key={service.slug}><th scope="row"><Link href={`/service/${service.slug}`}>{service.title}</Link></th><td>{reason}</td><td><ul>{service.includes.slice(0, 3).map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul></td><td>{frequency}</td><td><strong>{getServiceFromPrice(service)}</strong><Link href={`/service/${service.slug}`} aria-label={`View ${service.title}`}><ArrowRight size={15} /></Link></td></tr>)}</tbody></table></div><p className="service-comparison-note">Final service selection is confirmed from vehicle size and condition. Any additional-cost treatment is identified separately from the required main service.</p></section>

    <section className="business-process-section"><div className="section shell"><div className="section-heading compact"><div><p className="kicker">A clear working process</p><h2>From requirement to handover.</h2></div><p>Every enquiry starts with the vehicles, the operating requirement and the result your business needs.</p></div><ol className="business-process-grid">{sector.process.map((step, index) => <li key={step.title}><span>0{index + 1}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol></div></section>

    <section className="section shell business-facility"><figure><img src="/images/home-sections/indoor-detailing-facility.webp" alt="Auto Opulence indoor vehicle valeting and detailing facility in Norwich" /></figure><div><p className="kicker">Equipment and facilities</p><h2>Professional care under one roof.</h2><p>The Norwich facility supports washing, interior care, paint inspection, polishing and trade bay hire without relying on an unsuitable outdoor working area.</p><ul>{sector.facilityPoints.map((point) => <li key={point}><ShieldCheck size={18} />{point}</li>)}</ul><Link href="/about#equipment" className="inline-link">Explore the equipment <ArrowRight size={17} /></Link></div></section>

    {project && <section className="business-project-section"><div className="shell business-project-grid"><figure><img src={project.images[0].src} alt={project.images[0].alt} /></figure><div><p className="kicker">Relevant completed project</p><h2>{project.title}</h2><p>{project.summary}</p><p className="business-project-note">This genuine Auto Opulence project demonstrates vehicle-care processes that can also be relevant when planning work for {sector.name.toLowerCase()}. It is not presented as a claim that the customer belonged to this business sector.</p><Link href={`/case-studies/${project.slug}`} className="button">Read the case study <ArrowRight size={18} /></Link></div></div></section>}

    <section className="section shell business-local"><div><p className="kicker">Serving Norwich and Norfolk</p><h2>One genuine Norwich facility.</h2><p>Commercial enquiries from Norwich and surrounding Norfolk towns are completed through our confirmed address at Unit 7 Consensus House, St Faiths Road, Norwich, NR6 7BW. Use the location guides for journey and appointment information.</p></div><nav aria-label="Local business vehicle-care areas">{localAreas.map((area) => <Link href={`/locations/${area.slug}`} key={area.slug}><MapPin size={17} /><span><strong>{area.name}</strong>View service-area guide</span><ArrowRight size={16} /></Link>)}</nav></section>

    <section className="section shell faq-section"><div><p className="kicker">{sector.name} FAQs</p><h2>Planning the work.</h2></div><div className="faq-list">{sector.faqs.map((faq, index) => <details key={faq.question} open={index === 0}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>

    <section className="business-enquiry-section" id="business-enquiry"><div className="shell business-enquiry-grid"><div><p className="kicker">Business vehicle enquiry</p><h2>Discuss vehicles, timing and presentation.</h2><p>Include the number and type of vehicles, current condition, preferred date and whether the requirement is one-off or recurring. We will recommend the most appropriate published service or provide a tailored response where the work needs individual planning.</p><div className="business-enquiry-points"><span><Clock3 /> Response target within 24 hours</span><span><Sparkles /> Service matched to vehicle condition</span></div></div><EnquiryForm initialService={initialService} businessSector={sector.name} title={`Enquire about ${sector.name.toLowerCase()}`} intro="Tell us about the vehicles, required standard, preferred date and whether this is a one-off or repeat requirement." /></div></section>

    <section className="contact-strip"><div className="shell"><div><p className="kicker">Prefer to talk?</p><h2>Build a suitable plan.</h2></div><div><a href="tel:03300536925" className="button"><Phone size={17} /> 0330 053 6925</a><Link href="/contact" className="inline-link">Contact details <ArrowRight size={17} /></Link></div></div></section>
  </main><Footer /></>;
}
