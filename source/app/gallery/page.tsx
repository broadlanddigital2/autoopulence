import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Images } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { caseStudies } from "@/lib/case-studies";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

const title = "Vehicle Valeting & Detailing Gallery | Auto Opulence";
const description = "Browse real Auto Opulence vehicle valeting, detailing, ceramic coating and valet bay hire photographs grouped by completed case study.";
const socialImage = "/images/case-studies/merl-grey-range-rover-sport/range-rover-auto-opulence-ceramic-coating.webp";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/gallery" },
  openGraph: { title, description, url: "/gallery", siteName: "Auto Opulence", locale: "en_GB", type: "website", images: [{ url: socialImage, width: 1200, height: 800, alt: "Auto Opulence vehicle valeting and detailing gallery" }] },
  twitter: { card: "summary_large_image", title, description, images: [socialImage] },
};

const batches = caseStudies
  .filter((study) => study.status === "published")
  .map((study) => ({ ...study, images: study.images.slice(0, 5) }));

export default function GalleryPage() {
  const pageUrl = `${siteUrl}/gallery`;
  const images = batches.flatMap((batch) => batch.images);
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "ImageGallery", "@id": `${pageUrl}/#gallery`, url: pageUrl, name: title, description, about: { "@id": `${siteUrl}/#business` }, associatedMedia: images.map((image) => ({ "@type": "ImageObject", contentUrl: `${siteUrl}${image.src}`, caption: image.alt })) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Gallery", item: pageUrl }] }] };
  return <><JsonLd data={schema} /><Header /><main>
    <section className="gallery-hero"><div className="shell"><div><p className="kicker">Auto Opulence gallery</p><h1>Our work, grouped by vehicle.</h1><p>Explore photographs from completed valeting, detailing, ceramic-coating and bay-hire projects. Every image set is kept with its matching vehicle and links to the full case study.</p></div><Images /></div></section>
    <div className="gallery-batches shell">{batches.map((batch, batchIndex) => <section className="gallery-batch" key={batch.slug}><div className="gallery-batch-heading"><span>{String(batchIndex + 1).padStart(2, "0")}</span><div><p className="kicker">Case study gallery · {Math.min(batch.images.length, 5)} images</p><h2>{batch.title}</h2><p>{batch.description}</p></div><Link href={`/case-studies/${batch.slug}`} className="inline-link">View case study <ArrowRight size={17} /></Link></div><div className="gallery-batch-images">{batch.images.slice(0, 5).map((image) => <figure key={image.src}><img src={image.src} alt={image.alt} width="1200" height="800" loading="lazy" decoding="async" /><figcaption>{image.alt}</figcaption></figure>)}</div></section>)}</div>
    <section className="contact-strip"><div className="shell"><div><p className="kicker">Ready to discuss your vehicle?</p><h2>Choose your treatment.</h2></div><div><Link href="/#book" className="button">Request a booking</Link><Link href="/case-studies" className="inline-link">View case studies <ArrowRight size={17} /></Link></div></div></section>
  </main><Footer /></>;
}
