import type { Metadata } from "next";
import { Header, Footer } from "@/components/site-chrome";
import { BlogSlot } from "@/components/blog-slot";

// The blog list and posts are filled in by the worker at request time (worker/src/crm-blog.js) from the CRM's
// approved posts (CRM: Marketing → Blog posts). This page is only the shell: header, footer and an empty slot.
const title = "Vehicle Care Blog | Auto Opulence";
const description = "Car-care advice, seasonal tips and news from Auto Opulence, the indoor valeting and detailing studio in Norwich.";

export const metadata: Metadata = {
  title, description, alternates: { canonical: "/blog" },
  openGraph: { title, description, url: "/blog", siteName: "Auto Opulence", locale: "en_GB", type: "website" },
};

export default function BlogPage() {
  return <><Header /><main><section className="section shell"><BlogSlot /></section></main><Footer /></>;
}
