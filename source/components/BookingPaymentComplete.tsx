/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, Mail, MapPin, Phone } from "lucide-react";
import { bookingMoney, bookingPaymentCompletePath, pendingBookingKey, simplyBookRequest, type SimplyBookPaymentSummary } from "@/lib/simplybook";

const unsuccessful = (status: string) => /^(cancelled|canceled|deleted|failed|error)$/i.test(status);

export function BookingPaymentComplete() {
  const [summary, setSummary] = useState<SimplyBookPaymentSummary>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const invoiceId = new URLSearchParams(window.location.search).get("invoiceId");
    const summaryEndpoint = invoiceId === null ? "payment/summary" : `payment/summary?invoiceId=${encodeURIComponent(invoiceId)}`;
    setBusy(true); setError("");
    async function check() {
      try {
        const result = await simplyBookRequest<SimplyBookPaymentSummary>(summaryEndpoint, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setSummary(result);
        if (result.paid) {
          try { sessionStorage.removeItem(pendingBookingKey); } catch { /* Storage is optional. */ }
          if (window.location.pathname !== bookingPaymentCompletePath) {
            window.location.replace(bookingPaymentCompletePath);
            return;
          }
        } else if (!unsuccessful(result.status) && ++attempts < 6) {
          timer = setTimeout(check, 2000);
          return;
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : "We couldn’t check your payment. Please try again.");
      }
      setBusy(false);
    }
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [revision]);

  return <PaymentReceipt summary={summary} busy={busy} error={error} headingRef={headingRef} onCheck={() => setRevision(value => value + 1)} />;
}

// Keep the receipt driven by the server-verified invoice, never return URL parameters.
export function PaymentReceipt({ summary, busy, error, headingRef, onCheck }: {
  summary?: SimplyBookPaymentSummary; busy: boolean; error: string;
  headingRef?: React.Ref<HTMLHeadingElement>; onCheck: () => void;
}) {
  const isPaid = summary?.paid === true;
  const stopped = !isPaid && summary && unsuccessful(summary.status);
  const title = isPaid ? "Payment complete." : busy ? "Checking your payment…" : stopped ? "Payment not completed." : summary ? "Payment awaiting confirmation." : "We couldn’t confirm your payment.";
  const details = summary?.details;
  const isPackage = summary?.booking.orderType === "package";
  const appointmentDate = details ? new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date(`${details.date}T12:00:00Z`)) : "";

  return <section className="booking-receipt shell" aria-labelledby="payment-complete-title">
    <div className="booking-receipt__intro" aria-live="polite" aria-atomic="true">
      <span className="booking-receipt__icon">{isPaid ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}</span>
      <span className="section-kicker">{isPackage ? "Your package order" : "Your booking"}</span>
      <h1 id="payment-complete-title" ref={headingRef} tabIndex={-1}>{title}</h1>
      <p>{isPaid ? isPackage ? summary?.booking.firstAppointmentMessage || "Thank you. Your package payment has been received. Your prepaid visits are available in your customer account." : "Thank you. Your payment has been received. Keep the order number below for any questions about your appointment." : busy ? "Please wait while we check your payment with our booking provider." : stopped ? "This payment has not completed. Contact our team with your order number before trying again." : "If you have just paid, allow a moment and check again. Please contact us before making another payment or booking."}</p>
    </div>
    <div className="booking-receipt__layout">
      <div className="booking-receipt__card">
        <h2>{isPaid ? "Your order details" : "Booking details"}</h2>
        {summary ? <>
          <dl className="booking-receipt__details">
            <div className="booking-receipt__order"><dt>Order number</dt><dd>{summary.booking.invoiceNumber || summary.booking.bookingCode}</dd></div>
            {summary.booking.bookingCode && <div><dt>Booking reference</dt><dd>{summary.booking.bookingCode}</dd></div>}
            {isPackage && summary.booking.packageName && <div><dt>Package</dt><dd>{summary.booking.packageName}</dd></div>}
            {isPackage && summary.booking.firstAppointmentStatus && <div><dt>First visit</dt><dd>{summary.booking.firstAppointmentStatus === "booked" ? "Booked" : summary.booking.firstAppointmentStatus === "pending" ? "Being confirmed" : "Choose another date in your account"}</dd></div>}
            {summary.booking.invoiceAmount !== undefined && <div><dt>{isPaid ? "Amount paid" : "Order total"}</dt><dd>{bookingMoney(summary.booking.invoiceAmount, summary.booking.currency)}</dd></div>}
            {details && <><div><dt>Service</dt><dd>{details.serviceName}</dd></div><div><dt>Appointment</dt><dd>{appointmentDate}<br />{details.time.slice(0, 5)} · UK time</dd></div><div><dt>Vehicle registration</dt><dd><span className="vehicle-registration-plate">{details.vehicleRegistration}</span></dd></div></>}
          </dl>
          {details && <><h3>Your contact details</h3><dl className="booking-receipt__details"><div><dt>Name</dt><dd>{details.customerName}</dd></div><div><dt>Email</dt><dd>{details.customerEmail}</dd></div><div><dt>Telephone</dt><dd>{details.customerPhone}</dd></div></dl></>}
        </> : <p>Your order details will appear once we can verify your booking. If this session has expired, our team can help using your booking email or reference.</p>}
        {error && <p className="booking-form-error" role="alert">{error}</p>}
        {isPaid ? <div className="simplybook-actions"><a className="button button--lime" href={isPackage ? "/account" : "/"}>{isPackage ? "View customer account" : "Return to homepage"}</a><a className="button button--ghost" href="/#book">{isPackage ? "Return to booking" : "Book another appointment"}</a></div> : <div className="simplybook-actions">
          <button type="button" className="button button--lime" disabled={busy} onClick={onCheck}>{busy ? "Checking payment…" : "Check payment again"}</button>
          {summary && !stopped && !busy && <a className="button button--ghost" href="/vehicle-valeting?step=payment#complete-payment">Return to payment options</a>}
        </div>}
      </div>
      <aside className="booking-receipt__support" aria-labelledby="booking-support-title">
        <span className="section-kicker">Here to help</span><h2 id="booking-support-title">Questions about your booking?</h2>
        <p>Contact Auto Opulence for vehicle-care bookings. Please quote your order number or booking reference.</p>
        <a href="tel:03300536925"><Phone aria-hidden="true" /><span><small>Call our team</small>0330 053 6925</span></a>
        <a href="mailto:valeting@autoopulence.co.uk"><Mail aria-hidden="true" /><span><small>Email us</small>valeting@autoopulence.co.uk</span></a>
        <a href="/contact"><MapPin aria-hidden="true" /><span><small>Visit us · directions and contact details</small>Unit 7 Consensus House<br />St Faiths Road<br />Norwich, NR6 7BW</span></a>
      </aside>
    </div>
  </section>;
}
