import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { caseStudies } from "@/lib/case-studies";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

const title = "Vehicle Valeting & Detailing Case Studies | Norwich";
const description = "Explore Auto Opulence vehicle valeting, washing, polishing and ceramic coating case studies, including galleries, services used and customer reviews.";
const socialImage = "/images/case-studies/merl-grey-range-rover-sport/range-rover-auto-opulence-ceramic-coating.webp";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/case-studies" },
  openGraph: { title, description, url: "/case-studies", siteName: "Auto Opulence", locale: "en_GB", type: "website", images: [{ url: socialImage, width: 1200, height: 800, alt: "Completed Auto Opulence vehicle care case studies" }] },
  twitter: { card: "summary_large_image", title, description, images: [socialImage] },
};

export default function CaseStudiesPage() {
  const pageUrl = `${siteUrl}/case-studies`;
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "CollectionPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: title, description, about: { "@id": `${siteUrl}/#business` }, mainEntity: { "@id": `${pageUrl}/#case-studies` }, inLanguage: "en-GB" }, { "@type": "ItemList", "@id": `${pageUrl}/#case-studies`, numberOfItems: caseStudies.length, itemListElement: caseStudies.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.title, url: `${siteUrl}/case-studies/${item.slug}` })) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Case Studies", item: pageUrl }] }] };
  return <><JsonLd data={schema} /><Header /><main>
    <section className="case-hero"><div className="shell"><p className="kicker">Auto Opulence case studies</p><h1>Every vehicle tells a different story.</h1><p>See the starting requirement, selected services, working process, image gallery and customer feedback together in one project record.</p></div></section>
    <section className="section shell"><div className="section-heading compact"><div><p className="kicker">Project library</p><h2>Vehicle care in context.</h2></div><p>Explore completed Auto Opulence projects with the services used, working process, detailed image galleries and available customer feedback.</p></div><div className="case-grid">{caseStudies.map((study) => <Link href={`/case-studies/${study.slug}`} key={study.slug} className="case-card"><div className="case-image"><img src={study.images[0].src} alt={study.images[0].alt} width="1200" height="800" loading="lazy" decoding="async" /><span>{study.status === "draft" ? "Draft case study" : "Case study"}</span></div><div><h2>{study.title}</h2><p>{study.summary}</p><strong>View project <ArrowRight size={17} /></strong></div></Link>)}</div></section>
    <section className="support-band"><div className="shell support-band-grid"><div><p className="kicker">Have a similar vehicle?</p><h2>Start with the result you want.</h2><p>Tell us what needs attention and we will recommend the most suitable service and vehicle-size option.</p></div><Link href="/contact" className="button">Discuss your vehicle <ArrowRight size={17} /></Link></div></section>
  </main><Footer /></>;
}
