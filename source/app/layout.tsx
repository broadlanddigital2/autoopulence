import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { Suspense } from "react";
import "./globals.css";
import { defaultSocialImage, siteUrl } from "@/lib/seo";
import { CookieConsent } from "@/components/CookieConsent";
import { RouteTransitionLoader } from "@/components/RouteTransitionLoader";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Auto Opulence",
  authors: [{ name: "Auto Opulence", url: siteUrl }],
  creator: "Auto Opulence",
  publisher: "Auto Opulence",
  category: "Automotive detailing and vehicle care",
  title: "Car Valeting & Detailing Norwich | Auto Opulence",
  description: "Professional vehicle valeting, hand car washing, machine polishing, ceramic coatings and fully equipped valet bay hire in Norwich, Norfolk.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Car Valeting & Detailing Norwich | Auto Opulence",
    description: "Book professional vehicle valeting, washing, polishing and valet bay hire in Norwich, Norfolk.",
    siteName: "Auto Opulence",
    locale: "en_GB",
    type: "website",
    images: [{ url: defaultSocialImage, width: 1200, height: 800, alt: "Auto Opulence vehicle detailing studio in Norwich" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Car Valeting & Detailing Norwich | Auto Opulence",
    description: "Book professional vehicle valeting, washing, polishing and valet bay hire in Norwich, Norfolk.",
    images: [defaultSocialImage],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/auto-opulence-favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased"><Suspense fallback={null}><RouteTransitionLoader /></Suspense>{children}<a className="whatsapp-launcher" href="https://wa.me/+447383563859" target="_blank" rel="noopener noreferrer" aria-label="Chat with Auto Opulence on WhatsApp"><MessageCircle aria-hidden="true" /></a><CookieConsent /><script src="https://crm.racecargraphics.uk/rcg-enquiry-bot.js" data-bot-key="a13cbd35-f793-4389-b26e-8064e45ac31d" defer /></body>
    </html>
  );
}
