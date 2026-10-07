import type { Metadata } from "next";
import { CustomerSignupForm } from "@/components/CustomerSignupForm";
import { JsonLd } from "@/components/json-ld";
import { Footer, Header } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Create Customer Account | Auto Opulence", description: "Create an Auto Opulence customer booking account.", robots: { index: false, follow: true }, alternates: { canonical: "/signup" }, openGraph: { title: "Create Customer Account | Auto Opulence", description: "Create an account to manage vehicle-care bookings and packages.", url: "/signup" } };

export default function SignupPage() { return <><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", name: "Create Customer Account", url: "https://autoopulence.co.uk/signup" }} /><Header /><main className="customer-auth-page"><div className="shell customer-auth-shell"><CustomerSignupForm /><aside><p className="kicker">New customer</p><h2>Make repeat bookings simpler.</h2><ul><li>Keep your details securely linked</li><li>Return to book future visits</li><li>Use the same account on the booking form</li></ul></aside></div></main><Footer /></>; }
