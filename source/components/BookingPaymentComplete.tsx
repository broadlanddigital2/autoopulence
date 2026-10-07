"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, Mail, MapPin, Phone } from "lucide-react";
import { loadBookingStatus, type CrmBookingStatus } from "@/lib/crm-booking";
import { bookingMoney, ukDate, ukTime, PACKAGE_DISCLAIMER } from "@/lib/vehicle-care";

const unsuccessful = (status: string) => /^(cancelled|canceled|failed|expired|refunded)$/i.test(status);

export function BookingPaymentComplete() {
  const [summary, setSummary] = useState<CrmBookingStatus>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const sessionId = new URLSearchParams(window.location.search).get("session_id") || "";
    setBusy(true); setError("");
    async function check() {
      if (!sessionId) { setError("This page needs the payment reference from checkout. If you have paid, please contact us with your booking details."); setBusy(false); return; }
      try {
        // The CRM confirms the payment with Stripe and finalises the order (confirmation email, calendar).
        const result = await loadBookingStatus(sessionId, controller.signal);
        if (controller.signal.aborted) return;
        setSummary(result);
        if (result.paid) {
          try { sessionStorage.removeItem("ao-care-pending"); } catch { /* Storage is optional. */ }
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

// The receipt is driven by the CRM's verified payment record, never by return URL parameters.
export function PaymentReceipt({ summary, busy, error, headingRef, onCheck }: {
  summary?: CrmBookingStatus; busy: boolean; error: string;
  headingRef?: React.Ref<HTMLHeadingElement>; onCheck: () => void;
}) {
  const isPaid = summary?.paid === true;
  const stopped = !isPaid && summary && unsuccessful(summary.status);
  const title = isPaid ? "Payment complete." : busy ? "Checking your payment…" : stopped ? "Payment not completed." : summary ? "Payment awaiting confirmation." : "We couldn’t confirm your payment.";
  const booking = summary?.booking;
  const contact = summary?.contact;
  const order = summary?.order;
  const reference = order?.order_number;

  return <section className="booking-receipt shell" aria-labelledby="payment-complete-title">
    <div className="booking-receipt__intro" aria-live="polite" aria-atomic="true">
      <span className="booking-receipt__icon">{isPaid ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}</span>
      <span className="section-kicker">Your booking</span>
      <h1 id="payment-complete-title" ref={headingRef} tabIndex={-1}>{title}</h1>
      <p>{isPaid ? "Thank you. Your payment has been received and your appointment is confirmed. A confirmation email is on its way — keep the order number below for any questions." : busy ? "Please wait while we confirm your payment." : stopped ? "This payment has not completed. Contact our team with your order number before trying again." : "If you have just paid, allow a moment and check again. Please contact us before making another payment or booking."}</p>
    </div>
    <div className="booking-receipt__layout">
      <div className="booking-receipt__card">
        <h2>{isPaid ? "Your order details" : "Booking details"}</h2>
        {summary ? <>
          <dl className="booking-receipt__details">
            {reference && <div className="booking-receipt__order"><dt>Order number</dt><dd>{reference}</dd></div>}
            {booking && <div><dt>Booking status</dt><dd>{booking.status === "confirmed" ? "Confirmed" : booking.status === "cancelled" ? "Cancelled" : booking.status === "completed" ? "Completed" : "Awaiting payment"}</dd></div>}
            <div><dt>{isPaid ? "Amount paid" : "Amount due"}</dt><dd>{bookingMoney(summary.amount, summary.currency)}</dd></div>
            {order && order.balance_due > 0 && isPaid && <div><dt>Balance due on the day</dt><dd>{bookingMoney(order.balance_due, order.currency)}</dd></div>}
            {summary.package && <div><dt>Package</dt><dd>{summary.package.name}<br />{summary.package.total_visits} visits, paid in full</dd></div>}
            {booking && <><div><dt>Service</dt><dd>{booking.service_name}</dd></div>{summary.package?.visits && summary.package.visits.length > 1 ? summary.package.visits.map((start, index) => <div key={start}><dt>Visit {index + 1}</dt><dd>{ukDate(start)}<br />{ukTime(start)} · UK time</dd></div>) : <div><dt>{summary.package ? "First visit" : "Appointment"}</dt><dd>{ukDate(booking.start_at)}<br />{ukTime(booking.start_at)} · UK time</dd></div>}</>}
          </dl>
          {contact && <><h3>Your contact details</h3><dl className="booking-receipt__details"><div><dt>Name</dt><dd>{contact.name}</dd></div><div><dt>Email</dt><dd>{contact.email}</dd></div><div><dt>Telephone</dt><dd>{contact.phone}</dd></div>{contact.vehicle_registration && <div><dt>Vehicle</dt><dd>{[contact.vehicle_registration, contact.vehicle_size].filter(Boolean).join(" · ")}</dd></div>}</dl></>}
          {summary.package && isPaid && (() => {
            const booked = summary.package.visits?.length || 1, left = Math.max(0, summary.package.total_visits - booked);
            return <p className="booking-service-note"><strong>{PACKAGE_DISCLAIMER}</strong> {left > 0 ? <>Book your remaining {left} visit{left === 1 ? "" : "s"} — one each month — in <a href="/account?section=packages">your account</a>. Sign in with your email and we'll send you a code.</> : <>All {summary.package.total_visits} visits are booked.</>} Your invoice is attached to your confirmation email.</p>;
          })()}
        </> : <p>Your order details will appear once we can verify your booking. Our team can help using your booking email or order number.</p>}
        {error && <p className="booking-form-error" role="alert">{error}</p>}
        {isPaid ? <div className="booking-actions"><a className="button" href="/">Return to homepage</a><a className="button button--ghost" href="/#book">Book another appointment</a></div> : <div className="booking-actions">
          <button type="button" className="button" disabled={busy} onClick={onCheck}>{busy ? "Checking payment…" : "Check payment again"}</button>
          {summary && !stopped && !busy && <a className="button button--ghost" href="/?step=payment#book">Return to payment</a>}
        </div>}
      </div>
      <aside className="booking-receipt__support" aria-labelledby="booking-support-title">
        <span className="section-kicker">Here to help</span><h2 id="booking-support-title">Questions about your booking?</h2>
        <p>Contact Auto Opulence for vehicle-care bookings. Please quote your order number.</p>
        <a href="tel:03300536925"><Phone aria-hidden="true" /><span><small>Call our team</small>0330 053 6925</span></a>
        <a href="mailto:valeting@autoopulence.co.uk"><Mail aria-hidden="true" /><span><small>Email us</small>valeting@autoopulence.co.uk</span></a>
        <a href="/contact"><MapPin aria-hidden="true" /><span><small>Visit us · directions and contact details</small>Unit 7 Consensus House<br />St Faiths Road<br />Norwich, NR6 7BW</span></a>
      </aside>
    </div>
  </section>;
}
