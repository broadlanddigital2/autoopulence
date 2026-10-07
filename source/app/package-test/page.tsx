import type { Metadata } from "next";
import { PackageTest } from "@/components/PackageTest";
import { Footer, Header } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Package Payment Test | Auto Opulence",
  description: "Private Auto Opulence package payment integration test.",
  alternates: { canonical: "/package-test" },
  openGraph: { title: "Package Payment Test | Auto Opulence", description: "Private Auto Opulence package payment integration test.", url: "/package-test", siteName: "Auto Opulence", locale: "en_GB", type: "website" },
  robots: { index: false, follow: false, noarchive: true },
};

export default function PackageTestPage() {
  const schema = { "@context": "https://schema.org", "@type": "WebPage", name: "Package Payment Test", url: `${siteUrl}/package-test`, isPartOf: { "@id": `${siteUrl}/#website` } };
  return <><JsonLd data={schema} /><Header /><main className="package-test-page"><div className="shell"><PackageTest /></div></main><Footer /></>;
}
