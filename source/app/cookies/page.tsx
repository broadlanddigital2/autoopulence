import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/seo";
import { CookieSettingsButton } from "@/components/CookieConsent";

const title = "Cookie Policy | Auto Opulence";
const description = "Details of essential booking technology, Google Analytics cookies and how to change cookie choices on the Auto Opulence website.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cookies" },
  openGraph: { title, description, url: "/cookies", siteName: "Auto Opulence", locale: "en_GB", type: "website" },
  twitter: { card: "summary", title, description },
};

export default function CookiesPage() {
  const pageUrl = `${siteUrl}/cookies`;
  const schema = { "@context": "https://schema.org", "@type": "WebPage", "@id": `${pageUrl}/#webpage`, url: pageUrl, name: title, description, isPartOf: { "@id": `${siteUrl}/#website` }, dateModified: "2026-09-22", inLanguage: "en-GB" };
  return <><JsonLd data={schema} /><Header /><main className="policy-page">
    <header className="policy-hero"><div className="shell"><p className="kicker">Legal information</p><h1>Cookie Policy</h1><p>What the Auto Opulence website stores on your device, why it is needed and how to control optional analytics.</p><small>Last updated: 22 September 2026</small></div></header>
    <div className="policy-layout shell">
      <aside><strong>On this page</strong><nav aria-label="Cookie policy sections"><a href="#what">What cookies are</a><a href="#choices">Your choices</a><a href="#essential">Essential technology</a><a href="#analytics">Analytics cookies</a><a href="#browser">Browser controls</a></nav></aside>
      <article className="policy-content">
        <section id="what"><h2>1. What cookies are</h2><p>Cookies are small text files placed on a computer, phone or other device when you use a website. Similar technologies, including browser local storage and session storage, can remember preferences or temporary information.</p><p>Some technology is strictly necessary for a feature you request, such as securely signing in to a customer account. Optional analytics technology requires your permission.</p></section>
        <section id="choices"><h2>2. Your cookie choices</h2><p>When you first visit, you can accept or reject Google Analytics. Rejecting analytics does not stop you browsing, making an enquiry or using the booking service. Essential technology cannot be disabled through our banner because the requested account and booking functions would not work correctly.</p><CookieSettingsButton /><p>If you withdraw analytics consent, we stop loading Google Analytics on future page views and attempt to remove its first-party cookies from this website. You may need to clear browser data to remove every previously stored item.</p></section>
        <section id="essential"><h2>3. Essential technology</h2><div className="policy-table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Purpose</th><th>Duration</th></tr></thead><tbody><tr><td>Booking session</td><td>First-party secure cookie</td><td>Maintains a signed-in booking session, protects account access and carries the minimum temporary state needed to complete a booking or payment return.</td><td>About 50 minutes; refreshed when a new authenticated session is created</td></tr><tr><td>Pending booking</td><td>Session storage</td><td>Temporarily remembers pending booking or invoice information while you leave for secure payment and return to the website.</td><td>Until the browser tab is closed or payment completes</td></tr><tr><td><code>ao_cookie_consent</code></td><td>Local storage</td><td>Remembers whether you accepted or rejected optional analytics so the site can respect your choice.</td><td>Until you change the choice or clear browser data</td></tr></tbody></table></div><p>Our hosting and security infrastructure may also process short-lived technical identifiers needed to deliver pages, balance traffic and protect the service. These are used only for essential operational purposes.</p></section>
        <section id="analytics"><h2>4. Google Analytics</h2><p>If you select “Accept analytics”, we load Google Analytics using measurement ID <code>G-9WZ6VX5PJM</code>. It helps us understand matters such as page visits, general traffic sources and how people move through the website. We configure analytics to request IP anonymisation and do not load it before consent.</p><div className="policy-table-wrap"><table><thead><tr><th>Name</th><th>Provider</th><th>Purpose</th><th>Typical duration</th></tr></thead><tbody><tr><td><code>_ga</code></td><td>Google Analytics</td><td>Distinguishes website visitors for aggregated measurement.</td><td>Up to 2 years</td></tr><tr><td><code>_ga_*</code></td><td>Google Analytics</td><td>Maintains session and campaign information for this Analytics property.</td><td>Up to 2 years</td></tr></tbody></table></div><p>Google may update cookie names or durations. See <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer">Google’s cookie information</a> for current details.</p></section>
        <section id="browser"><h2>5. Browser controls</h2><p>Most browsers let you view, delete or block cookies and site storage. Blocking all cookies may prevent customer login, bookings or payment returns from working. Browser controls are separate from the choice stored by this website.</p></section>
        <section><h2>6. Third-party services and websites</h2><p>The EnquiryBot launcher is supplied by EnquiryBot and may process technical information needed to display and operate the chat service. If you open the launcher or submit information, EnquiryBot may use its own storage or cookies under its service terms.</p><p>Links to our booking platform, Stripe, WhatsApp, Google Maps, social networks and other external services take you to websites with their own cookies and privacy policies. Their choices are controlled on those services rather than by our banner.</p></section>
        <section><h2>7. Contact and updates</h2><p>For questions, email <a href="mailto:valeting@autoopulence.co.uk">valeting@autoopulence.co.uk</a>. We may update this policy following a cookie audit, a provider change or a change in legal guidance. See our <Link href="/privacy">Privacy Policy</Link> for wider information about personal data.</p></section>
      </article>
    </div>
  </main><Footer /></>;
}
