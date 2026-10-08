import type { Metadata } from "next";
import { CrmBooking } from "@/components/crm-booking";
import { JsonLd } from "@/components/json-ld";
import { Footer, Header } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Customer Account | Auto Opulence", description: "Manage your Auto Opulence customer booking account.", robots: { index: false, follow: false }, alternates: { canonical: "/account" }, openGraph: { title: "Customer Account | Auto Opulence", description: "Manage bookings and prepaid package visits.", url: "/account" } };

export default function AccountPage() { return <><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", name: "Auto Opulence Customer Account", description: "Secure customer area for managing Auto Opulence bookings and prepaid package visits.", url: "https://autoopulence.co.uk/account" }} /><Header /><main className="shell crm-booking-page"><CrmBooking mode="account" /></main><Footer /></>; }
