import type { Metadata } from "next";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import { Footer, Header } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Enquiry Complete | Auto Opulence",
  description: "Confirmation that your Auto Opulence enquiry has been submitted successfully.",
  alternates: { canonical: "/enquiry-complete" },
  robots: { index: false, follow: false },
};

export default function EnquiryCompletePage() {
  return <><Header /><main className="booking-payment-page"><section className="booking-receipt shell" aria-labelledby="enquiry-complete-title"><div className="booking-receipt__intro"><span className="booking-receipt__icon"><CheckCircle2 aria-hidden="true" /></span><span className="section-kicker">Enquiry received</span><h1 id="enquiry-complete-title">Thank you for your enquiry.</h1><p>We’ve emailed you a confirmation and aim to respond within 24 hours.</p></div><div className="booking-receipt__layout"><div className="booking-receipt__card"><h2>What happens next?</h2><p>Our team will review your vehicle and service requirements, then contact you using the details supplied.</p><div className="simplybook-actions"><a className="button button--lime" href="/">Return to homepage</a><a className="button button--ghost" href="/contact">Send another enquiry</a></div></div><aside className="booking-receipt__support"><span className="section-kicker">Need to speak sooner?</span><h2>Contact Auto Opulence</h2><a href="tel:03300536925"><Phone aria-hidden="true" /><span><small>Call our team</small>0330 053 6925</span></a><a href="mailto:valeting@autoopulence.co.uk"><Mail aria-hidden="true" /><span><small>Email us</small>valeting@autoopulence.co.uk</span></a></aside></div></section></main><Footer /></>;
}
