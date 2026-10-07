import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { getGuide, guides } from "@/lib/guides";
import { getService, getServiceFromPrice } from "@/lib/services";
import { getServiceCardImage, getServiceImageAlt } from "@/lib/category-presentation";
import { getCaseStudy } from "@/lib/case-studies";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

export function generateStaticParams() { return guides.map((guide) => ({ slug: guide.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const guide = getGuide(slug); if (!guide) return {};
  const url = `/guides/${guide.slug}`;
  return { title: guide.title, description: guide.description, alternates: { canonical: url }, openGraph: { title: guide.title, description: guide.description, url, siteName: "Auto Opulence", locale: "en_GB", type: "article", images: [{ url: guide.heroImage, width: 1200, height: 800, alt: guide.heroAlt }] }, twitter: { card: "summary_large_image", title: guide.title, description: guide.description, images: [guide.heroImage] } };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const guide = getGuide(slug); if (!guide) notFound();
  const pageUrl = `${siteUrl}/guides/${guide.slug}`;
  const related = guide.relatedServiceSlugs.map((serviceSlug) => getService(serviceSlug)).filter((result): result is NonNullable<typeof result> => Boolean(result));
  const relatedGuides = guide.relatedGuideSlugs.map((guideSlug) => getGuide(guideSlug)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const caseStudy = guide.caseStudySlug ? getCaseStudy(guide.caseStudySlug) : undefined;
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "WebPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: guide.title, description: guide.description, mainEntity: { "@id": `${pageUrl}/#article` }, primaryImageOfPage: { "@id": `${pageUrl}/#primaryimage` }, inLanguage: "en-GB" }, { "@type": "ImageObject", "@id": `${pageUrl}/#primaryimage`, contentUrl: `${siteUrl}${guide.heroImage}`, caption: guide.heroAlt }, { "@type": "Article", "@id": `${pageUrl}/#article`, headline: guide.name, description: guide.description, image: { "@id": `${pageUrl}/#primaryimage` }, dateModified: guide.updatedIso, mainEntityOfPage: { "@id": `${pageUrl}/#webpage` }, author: { "@id": `${siteUrl}/#business` }, publisher: { "@id": `${siteUrl}/#business` }, inLanguage: "en-GB" }, { "@type": "FAQPage", "@id": `${pageUrl}/#faq`, mainEntity: guide.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Guides", item: `${siteUrl}/guides` }, { "@type": "ListItem", position: 3, name: guide.name, item: pageUrl }] }] };
  return <><JsonLd data={schema} /><Header /><main><article>
    <header className="guide-detail-hero"><img src={guide.heroImage} alt={guide.heroAlt} /><div className="service-hero-shade" /><div className="shell"><Link href="/guides" className="back-link"><ArrowLeft size={17} /> All guides</Link><p className="kicker">{guide.category}</p><h1>{guide.name}</h1><p>{guide.intro}</p><div className="guide-byline"><span><Clock size={16} />{guide.readTime}</span><span>Reviewed by Auto Opulence</span><span>Updated {guide.updated}</span></div></div></header>
    <div className="shell guide-detail-layout"><aside className="guide-toc"><p className="kicker">In this guide</p><nav>{guide.sections.map((section, index) => <a href={`#section-${index + 1}`} key={section.heading}>{section.heading}</a>)}{guide.comparison && <a href="#comparison">Quick comparison</a>}{guide.checklist && <a href="#checklist">Checklist</a>}<a href="#faq">FAQs</a></nav></aside><div className="guide-detail-body">
      <section className="guide-quick-answer"><BookOpen /><div><p className="kicker">Quick answer</p><p>{guide.quickAnswer}</p></div></section>
      {guide.sections.map((section, index) => <section id={`section-${index + 1}`} key={section.heading}><span className="guide-section-number">{String(index + 1).padStart(2, "0")}</span><h2>{section.heading}</h2><p>{section.body}</p></section>)}
      {guide.comparison && <section id="comparison"><p className="kicker">At a glance</p><h2>{guide.comparison.caption}</h2><div className="guide-table-wrap"><table><thead><tr>{guide.comparison.headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{guide.comparison.rows.map((row) => <tr key={row.join("-")}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div></section>}
      {guide.checklist && <section className="guide-checklist" id="checklist"><p className="kicker">Practical checklist</p><h2>{guide.checklist.heading}</h2><ul>{guide.checklist.items.map((item) => <li key={item}><Check size={18} />{item}</li>)}</ul></section>}
    </div></div>
    {caseStudy && <section className="guide-case-study"><div className="shell"><figure><img src={caseStudy.images[0].src} alt={caseStudy.images[0].alt} /></figure><div><p className="kicker">Related case study</p><h2>{caseStudy.title}</h2><p>{caseStudy.summary}</p><Link href={`/case-studies/${caseStudy.slug}`} className="button">View the vehicle <ArrowRight size={17} /></Link></div></div></section>}
    <section className="section shell guide-related-services"><div className="section-heading compact"><div><p className="kicker">Relevant treatments</p><h2>Services mentioned in this guide.</h2></div><p>Open a service to see exactly what is included, vehicle-size pricing and booking options.</p></div><div>{related.map(({ category, service }) => { const image = getServiceCardImage(service.slug, category.image); return <Link href={`/service/${service.slug}`} key={service.slug}><img src={image} alt={getServiceImageAlt(service.slug, service.title)} /><span>{category.title}</span><h3>{service.title}</h3><p>{service.short}</p><strong>From {getServiceFromPrice(service)}</strong><small>View service <ArrowRight size={15} /></small></Link>; })}</div></section>
    <section className="section shell faq-section" id="faq"><div><p className="kicker">Frequently asked</p><h2>Good to know.</h2></div><div className="faq-list">{guide.faqs.map((faq, index) => <details key={faq.question} open={index === 0}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
    <section className="section shell guide-more"><div className="section-heading compact"><div><p className="kicker">Keep reading</p><h2>Related vehicle-care guides.</h2></div></div><div>{relatedGuides.map((item) => <Link href={`/guides/${item.slug}`} key={item.slug}><span>{item.category} · {item.readTime}</span><h3>{item.name}</h3><strong>Read next <ArrowRight size={16} /></strong></Link>)}</div></section>
    <section className="guide-hub-cta"><div className="shell"><div><p className="kicker">Norwich vehicle care</p><h2>Need advice for your vehicle?</h2><p>Tell us how it is used, its current condition and the result you want. We will recommend the most suitable starting point.</p></div><div><Link href="/contact" className="button">Ask Auto Opulence <ArrowRight size={17} /></Link><Link href="/locations" className="inline-link">See service areas</Link></div></div></section>
  </article></main><Footer /></>;
}
