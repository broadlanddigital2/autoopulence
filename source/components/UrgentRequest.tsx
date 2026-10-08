"use client";

// "Need it sooner?" on the booking form. Sends an urgent request to the CRM (public_urgent_request), which saves it
// as a lead, emails the team and sends the customer an acknowledgement. Nothing is booked or charged.
// Shared by autoopulence.co.uk and racecargraphics.uk — keep this file identical on both sites.
import { useState, type KeyboardEvent } from "react";
import { Zap } from "lucide-react";
import { bookingRequest } from "@/lib/crm-booking";

type Defaults = { firstName?: string; lastName?: string; email?: string; mobile?: string; registration?: string };

export function UrgentRequest({ businessUnitId, serviceId, serviceName, vehicleSize, defaults, phone }: {
  businessUnitId: string; serviceId?: string; serviceName?: string; vehicleSize?: string;
  /** Called when the panel opens, to pre-fill anything already typed into the booking form. */
  defaults?: () => Defaults; phone: string;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Defaults & { date?: string; time?: string; message?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const set = (key: string) => (event: { target: { value: string } }) => { setValues(v => ({ ...v, [key]: event.target.value })); setError(""); };
  // These fields sit inside the booking form: Enter must not submit it.
  const noSubmit = (event: KeyboardEvent) => { if (event.key === "Enter" && (event.target as HTMLElement).tagName !== "TEXTAREA") event.preventDefault(); };
  const today = new Date().toISOString().slice(0, 10);

  async function send() {
    const v = { ...values, firstName: values.firstName?.trim(), lastName: values.lastName?.trim(), email: values.email?.trim(), mobile: values.mobile?.trim() };
    if (!v.firstName || !v.lastName || !v.email || !/^\S+@\S+\.\S+$/.test(v.email) || (v.mobile || "").replace(/\D/g, "").length < 10) return setError("Please enter your name, email address and mobile number.");
    setBusy(true); setError("");
    try {
      await bookingRequest("public_urgent_request", {
        business_unit_id: businessUnitId, service_id: serviceId || undefined, service_name: serviceName || undefined, vehicle_size: vehicleSize || undefined,
        first_name: v.firstName, last_name: v.lastName, email: v.email, mobile: v.mobile, vehicle_registration: v.registration,
        preferred_date: v.date, preferred_time: v.time, message: v.message, source_url: window.location.href.split("#")[0],
      }, { signedIn: false });
      setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn't send your request. Please call us."); }
    finally { setBusy(false); }
  }

  if (sent) return <div className="booking-urgent booking-urgent--sent" role="status"><Zap aria-hidden="true" /><div><strong>Urgent request sent.</strong><p>Thanks, {values.firstName}. Our team will contact you as soon as possible to arrange it. Nothing has been booked or charged yet. A copy is on its way to {values.email}.</p></div></div>;

  return <div className="booking-urgent">
    <div className="booking-urgent__prompt">
      <Zap aria-hidden="true" />
      <div><strong>Need it sooner?</strong><p>Online booking needs advance notice. For short-notice appointments, send an urgent request and our team will get back to you.</p></div>
      <button type="button" className="button button--ghost" aria-expanded={open} aria-controls="booking-urgent-panel" onClick={() => { if (!open) setValues(v => ({ ...defaults?.(), ...Object.fromEntries(Object.entries(v).filter(([, x]) => x)) })); setOpen(o => !o); setError(""); }}>{open ? "Close" : "Send an urgent request"}</button>
    </div>
    {open && <div className="booking-urgent__panel" id="booking-urgent-panel" onKeyDown={noSubmit}>
      <p className="booking-urgent__about">{serviceName ? <>For <strong>{serviceName}</strong>{vehicleSize ? ` · ${vehicleSize}` : ""}.</> : "Tell us what you need."} We'll reply by phone or email.</p>
      <div className="booking-form-grid">
        <label className="booking-field"><span>First name</span><input value={values.firstName || ""} onChange={set("firstName")} autoComplete="given-name" maxLength={100} /></label>
        <label className="booking-field"><span>Last name</span><input value={values.lastName || ""} onChange={set("lastName")} autoComplete="family-name" maxLength={100} /></label>
        <label className="booking-field"><span>Email address</span><input type="email" value={values.email || ""} onChange={set("email")} autoComplete="email" maxLength={254} /></label>
        <label className="booking-field"><span>Mobile number</span><input type="tel" value={values.mobile || ""} onChange={set("mobile")} autoComplete="tel" maxLength={30} /></label>
        <label className="booking-field"><span>Preferred date</span><input type="date" min={today} value={values.date || ""} onChange={set("date")} /></label>
        <label className="booking-field"><span>Preferred time</span><select value={values.time || ""} onChange={set("time")}><option value="">Any time</option><option>Morning</option><option>Afternoon</option><option>As soon as possible</option></select></label>
        <label className="booking-field"><span>Vehicle registration</span><input value={values.registration || ""} onChange={set("registration")} maxLength={12} style={{ textTransform: "uppercase" }} /></label>
      </div>
      <label className="booking-field"><span>Anything we should know?</span><textarea rows={3} value={values.message || ""} onChange={set("message")} maxLength={2000} placeholder="For example: needed before a sale on Friday, or how flexible you can be" /></label>
      {error && <p className="booking-form-error" role="alert">{error}</p>}
      <div className="booking-actions">
        <button type="button" className="button" disabled={busy} onClick={() => void send()}>{busy ? "Sending…" : "Send urgent request"}</button>
        <a href={`tel:${phone.replace(/\s/g, "")}`}>Or call {phone}</a>
      </div>
    </div>}
  </div>;
}
