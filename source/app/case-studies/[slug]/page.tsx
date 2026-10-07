import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Quote } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { caseStudies, getCaseStudy } from "@/lib/case-studies";
import { getService } from "@/lib/services";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

export function generateStaticParams() { return caseStudies.map((study) => ({ slug: study.slug })); }

function caseStudyMetaTitle(title: string) {
  if (title === "Mercedes CLA45 Indoor Detailing Bay Hire") return "Mercedes CLA45 Bay Hire Case Study | Auto Opulence";
  if (title === "BMW E21 3 Series Restoration Detail") return "BMW E21 Restoration Case Study | Auto Opulence";
  return `${title} Case Study | Auto Opulence`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const study = getCaseStudy(slug); if (!study) return {};
  const url = `/case-studies/${study.slug}`;
  const title = caseStudyMetaTitle(study.title);
  const image = study.images[0];
  return { title, description: study.description, alternates: { canonical: url }, openGraph: { title, description: study.description, url, siteName: "Auto Opulence", locale: "en_GB", type: "article", images: [{ url: image.src, width: 1200, height: 800, alt: image.alt }] }, twitter: { card: "summary_large_image", title, description: study.description, images: [image.src] } };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const study = getCaseStudy(slug); if (!study) notFound();
  const services = study.serviceSlugs.map((serviceSlug) => getService(serviceSlug)).filter((result): result is NonNullable<typeof result> => Boolean(result));
  const serviceLinks = study.serviceLinks ?? services.map(({ category, service }) => ({ title: service.title, category: category.title, href: `/service/${service.slug}` }));
  const pageUrl = `${siteUrl}/case-studies/${study.slug}`;
  const pageTitle = caseStudyMetaTitle(study.title);
  const projectImages = study.images.slice(0, 5);
  const reviewSchema = study.review ? [{ "@type": "Review", reviewBody: study.review, author: { "@type": "Person", name: study.reviewAuthor }, itemReviewed: { "@id": `${siteUrl}/#business` } }] : [];
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "WebPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: pageTitle, description: study.description, mainEntity: { "@id": `${pageUrl}/#article` }, primaryImageOfPage: { "@id": `${pageUrl}/#image-1` }, inLanguage: "en-GB" }, ...projectImages.map((image, index) => ({ "@type": "ImageObject", "@id": `${pageUrl}/#image-${index + 1}`, contentUrl: `${siteUrl}${image.src}`, caption: image.alt })), { "@type": "Article", "@id": `${pageUrl}/#article`, headline: study.title, description: study.description, articleBody: [study.summary, ...(study.processSections?.map((section) => `${section.title}: ${section.text}`) ?? [])].join("\n\n"), url: pageUrl, mainEntityOfPage: { "@id": `${pageUrl}/#webpage` }, author: { "@id": `${siteUrl}/#business` }, publisher: { "@id": `${siteUrl}/#business` }, image: projectImages.map((_, index) => ({ "@id": `${pageUrl}/#image-${index + 1}` })), about: serviceLinks.map((service) => service.title), citation: study.sourceUrl, inLanguage: "en-GB" }, ...reviewSchema, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Case Studies", item: `${siteUrl}/case-studies` }, { "@type": "ListItem", position: 3, name: study.title, item: pageUrl }] }] };
  return <><JsonLd data={schema} /><Header /><main>
    <article><header className="case-detail-hero"><div className="shell"><Link href="/case-studies" className="back-link"><ArrowLeft size={17} /> All case studies</Link><span>{study.status === "draft" ? "Draft project" : "Completed project"}</span><h1>{study.title}</h1><p>{study.description}</p></div></header>
    <section className="shell case-overview"><div><p className="kicker">The project</p><h2>Overview</h2><p className="case-summary">{study.summary}</p>{(study.sourceUrl || study.externalLinks?.length) && <div className="case-external-links">{study.sourceUrl && <a href={study.sourceUrl} target="_blank" rel="noreferrer" className="inline-link">View original project post <ExternalLink size={16} /></a>}{study.externalLinks?.map((link) => <a href={link.href} target="_blank" rel="noreferrer" className="inline-link" key={link.href}>{link.label} <ExternalLink size={16} /></a>)}</div>}</div><aside><p className="kicker">Services used</p>{serviceLinks.map((service) => <Link href={service.href} key={service.title}><Check size={17} /><span><small>{service.category}</small><strong>{service.title}</strong></span><ArrowRight size={16} /></Link>)}</aside></section>
    {study.processSections && <section className="case-process shell"><div className="section-heading compact"><div><p className="kicker">{study.processKicker ?? "How we treated it"}</p><h2>{study.processHeading ?? "Preparation before protection."}</h2></div><p>{study.processIntro ?? "Every coating result depends on the quality of the wash, rinse and surface preparation completed first."}</p></div><div className="case-process-grid">{study.processSections.map((section, index) => <article key={section.title}><span>0{index + 1}</span><h3>{section.title}</h3><p>{section.text}</p></article>)}</div></section>}
    <section className="case-gallery shell"><div className="section-heading compact"><div><p className="kicker">Project gallery</p><h2>Process and finish.</h2></div></div><div className={projectImages.length > 2 ? `case-gallery-grid-multi case-gallery-grid-count-${projectImages.length}` : undefined}>{projectImages.map((image) => <figure key={image.src}><img src={image.src} alt={image.alt} width="1200" height="800" loading="lazy" decoding="async" /><figcaption>{image.alt}</figcaption></figure>)}</div></section>
    <section className="case-review"><div className="shell"><Quote />{study.review ? <><blockquote>{study.review}</blockquote><p>{study.reviewAuthor} · {study.reviewSource ?? "Google Business Profile"}</p></> : study.status === "published" ? <><h2>Review to follow.</h2><p>The customer review for this completed project will be added when it becomes available.</p></> : <><h2>Customer review ready to add.</h2><p>Import the approved review associated with this project from the Auto Opulence Google Business Profile before publishing the case study.</p></>}</div></section>
    <section className="contact-strip"><div className="shell"><div><p className="kicker">Inspired by this project?</p><h2>{study.ctaHeading ?? "Discuss your vehicle."}</h2>{study.ctaText && <p>{study.ctaText}</p>}</div><div><Link href="/#book" className="button">Request a booking</Link>{study.secondaryCta ? <Link href={study.secondaryCta.href} className="inline-link">{study.secondaryCta.label} <ArrowRight size={17} /></Link> : <Link href="/contact" className="inline-link">Ask a question <ArrowRight size={17} /></Link>}</div></div></section></article>
  </main><Footer /></>;
}
