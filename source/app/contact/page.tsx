import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";
import { EnquiryForm } from "@/components/enquiry-form";
import { JsonLd } from "@/components/json-ld";
import { defaultSocialImage, localBusinessSchema, siteUrl } from "@/lib/seo";

const title = "Contact Auto Opulence | Vehicle Care Norwich";
const description = "Contact Auto Opulence in Norwich for vehicle valeting, hand washing, machine polishing, ceramic coatings and professional valet bay hire enquiries.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  openGraph: { title, description, url: "/contact", siteName: "Auto Opulence", locale: "en_GB", type: "website", images: [{ url: defaultSocialImage, width: 1200, height: 800, alt: "Auto Opulence vehicle detailing studio in Norwich" }] },
  twitter: { card: "summary_large_image", title, description, images: [defaultSocialImage] },
};

export default function ContactPage() {
  const pageUrl = `${siteUrl}/contact`;
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "ContactPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: title, description, about: { "@id": `${siteUrl}/#business` }, inLanguage: "en-GB" }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Contact Auto Opulence", item: pageUrl }] }] };
  return <><JsonLd data={schema} /><Header /><main>
    <section className="contact-hero"><div className="shell"><p className="kicker">Contact Auto Opulence</p><h1>Let’s talk about your vehicle.</h1><p>Ask about a valet, wash, machine polish, ceramic coating or valet bay booking. Our Norwich team will help you choose the right option.</p></div></section>
    <section className="contact-main shell">
      <EnquiryForm />
      <aside className="nap-card" aria-label="Auto Opulence contact details">
        <div><p className="kicker">Name, address & phone</p><h2>Auto Opulence</h2><p>Vehicle valeting and detailing specialists in Norwich, Norfolk.</p></div>
        <address>
          <a href="https://www.google.com/maps/search/?api=1&query=Unit+7+Consensus+House+St+Faiths+Road+Norwich+NR6+7BW" target="_blank" rel="noreferrer"><MapPin /><span><strong>Visit us</strong>Unit 7 Consensus House<br />St Faiths Road<br />Norwich, Norfolk<br />NR6 7BW</span></a>
          <a href="tel:03300536925"><Phone /><span><strong>Call us</strong>0330 053 6925</span></a>
          <a href="mailto:valeting@autoopulence.co.uk"><Mail /><span><strong>Email us</strong>valeting@autoopulence.co.uk</span></a>
          <div><Clock3 /><span><strong>Appointments</strong>Please contact us to confirm availability.</span></div>
        </address>
        <Link href="/#book" className="button">Book a service</Link>
      </aside>
    </section>
    <section className="map-section"><header className="shell map-heading"><div><p className="kicker">Find us in Norwich</p><h2>Unit 7 Consensus House</h2></div><p>St Faiths Road, Norwich, NR6 7BW. Open the map for directions to the Auto Opulence detailing facility.</p></header><figure className="map-frame"><iframe title="Map showing Auto Opulence at Unit 7 Consensus House, Norwich" src="https://www.google.com/maps?q=Unit+7+Consensus+House,+St+Faiths+Road,+Norwich,+NR6+7BW&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></figure></section>
  </main><Footer /></>;
}
