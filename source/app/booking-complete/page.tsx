import type { Metadata } from "next";
import { BookingPaymentComplete } from "@/components/BookingPaymentComplete";
import { JsonLd } from "@/components/json-ld";
import { Footer, Header } from "@/components/site-chrome";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

const title = "Booking Complete | Auto Opulence";
const description = "Confirmation that your Auto Opulence booking payment has completed successfully.";
const pageUrl = `${siteUrl}/booking-complete`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/booking-complete" },
  robots: { index: false, follow: false },
};

export default function BookingCompletePage() {
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "WebPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: title, description, about: { "@id": `${siteUrl}/#business` }, inLanguage: "en-GB" }] };
  return <><JsonLd data={schema} /><Header /><main className="booking-payment-page"><BookingPaymentComplete /></main><Footer /></>;
}
