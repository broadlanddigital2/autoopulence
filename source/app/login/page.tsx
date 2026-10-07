import type { Metadata } from "next";
import { CodeLoginPage } from "@/components/CustomerAccount";
import { JsonLd } from "@/components/json-ld";
import { Footer, Header } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Customer Login | Auto Opulence", description: "Login to your Auto Opulence customer booking account.", robots: { index: false, follow: true }, alternates: { canonical: "/login" }, openGraph: { title: "Customer Login | Auto Opulence", description: "Sign in to manage Auto Opulence bookings and package visits.", url: "/login" } };

export default function LoginPage() { return <><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", name: "Customer Login", url: "https://autoopulence.co.uk/login" }} /><Header /><CodeLoginPage /><Footer /></>; }
