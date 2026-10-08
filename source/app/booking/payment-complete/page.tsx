import type { Metadata } from "next";
import { CrmBooking } from "@/components/crm-booking";
import { JsonLd } from "@/components/json-ld";
import { Footer } from "@/components/site-chrome";
import { Header } from "@/components/site-chrome";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

const title = "Booking Payment | Auto Opulence";
const description = "Check your Auto Opulence booking payment status, order reference, appointment details and contact information.";
const pageUrl = `${siteUrl}/booking/payment-complete`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/booking/payment-complete" },
  openGraph: { title, description, url: "/booking/payment-complete", siteName: "Auto Opulence", locale: "en_GB", type: "website" },
  robots: { index: false, follow: false },
};

export default function BookingPaymentPage() {
  const schema = { "@context": "https://schema.org", "@graph": [localBusinessSchema, { "@type": "WebPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: title, description, about: { "@id": `${siteUrl}/#business` }, inLanguage: "en-GB" }] };
  return <><JsonLd data={schema} /><Header /><main className="booking-payment-page"><CrmBooking mode="payment-complete" /></main><Footer /></>;
}
