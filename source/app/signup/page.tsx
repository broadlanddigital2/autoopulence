import type { Metadata } from "next";
import { CodeLoginPage } from "@/components/CustomerAccount";
import { JsonLd } from "@/components/json-ld";
import { Footer, Header } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Create Customer Account | Auto Opulence", description: "Create an Auto Opulence customer booking account.", robots: { index: false, follow: true }, alternates: { canonical: "/signup" }, openGraph: { title: "Create Customer Account | Auto Opulence", description: "Create an account to manage vehicle-care bookings and packages.", url: "/signup" } };

export default function SignupPage() { return <><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", name: "Create Customer Account", url: "https://autoopulence.co.uk/signup" }} /><Header /><CodeLoginPage register /><Footer /></>; }
