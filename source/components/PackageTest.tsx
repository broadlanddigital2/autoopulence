"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, CreditCard, LockKeyhole, PackageCheck } from "lucide-react";
import { bookingMoney, bookingPaymentCompletePath, simplyBookRequest, type SimplyBookBooking, type SimplyBookClient, type SimplyBookPackage } from "@/lib/simplybook";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "The test package could not be loaded.";

export function PackageTest() {
  const [client, setClient] = useState<SimplyBookClient | null>();
  const [packages, setPackages] = useState<SimplyBookPackage[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<SimplyBookBooking>();
  const [methods, setMethods] = useState<string[]>([]);
  const [paymentBusy, setPaymentBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      simplyBookRequest<SimplyBookClient | null>("client/session", { signal: controller.signal }),
      simplyBookRequest<SimplyBookPackage[]>("packages", { signal: controller.signal }),
    ]).then(([customer, livePackages]) => {
      if (controller.signal.aborted) return;
      setClient(customer); setPackages(livePackages); setSelectedId(livePackages[0]?.id);
    }).catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);

  async function purchase() {
    if (!selectedId || !accepted || busy) return;
    setBusy(true); setError("");
    try {
      const result = await simplyBookRequest<SimplyBookBooking>("package/purchase", { method: "POST", body: JSON.stringify({ packageId: selectedId, startDate }) });
      setOrder(result);
      const payment = await simplyBookRequest<{ availableMethods: string[] }>("payment/methods");
      setMethods(payment.availableMethods);
      if (!payment.availableMethods.length) setError("The package invoice was created, but no payment methods are currently available.");
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function pay(system: string) {
    if (!order?.invoiceId || paymentBusy) return;
    setPaymentBusy(true); setError("");
    try {
      const result = await simplyBookRequest<{ redirect_url?: string }>("payment/pay", { method: "POST", body: JSON.stringify({ invoiceId: order.invoiceId, system }) });
      if (result.redirect_url) window.location.assign(result.redirect_url);
      else window.location.assign(bookingPaymentCompletePath);
    } catch (error) { setError(errorMessage(error)); setPaymentBusy(false); }
  }

  if (busy && client === undefined) return <div className="package-test-state" role="status">Loading the live test package…</div>;
  if (!client) return <section className="package-test-login"><LockKeyhole aria-hidden="true" /><p className="kicker">Customer login required</p><h1>Sign in to test package purchasing.</h1><p>The test uses your connected booking account. It is separate from the normal booking form.</p><Link className="button" href="/login?return=/package-test">Login to continue</Link>{error && <p className="booking-form-error" role="alert">{error}</p>}</section>;

  return <section className="package-test-panel" aria-labelledby="package-test-title">
    <header><div><p className="kicker">Private integration test</p><h1 id="package-test-title">Package payment test.</h1><p>Signed in as <strong>{client.name}</strong>. Package information and prices below come directly from the live booking system.</p></div><span><PackageCheck aria-hidden="true" /> Not indexed</span></header>
    <div className="package-test-warning"><CreditCard aria-hidden="true" /><p><strong>This uses the live payment system.</strong> Check the displayed total before continuing. A purchase creates a real invoice.</p></div>
    {packages.length ? <div className="package-test-grid">{packages.map(item => <label className={selectedId === item.id ? "is-selected" : ""} key={item.id}>
      <input type="radio" name="testPackage" checked={selectedId === item.id} onChange={() => setSelectedId(item.id)} />
      <span className="package-test-card__status">Live package #{item.id}</span><h2>{item.name}</h2><strong className="package-test-card__price">{bookingMoney(Number(item.price), item.currency)}</strong><small>Valid for {item.duration} {item.duration_type}{Number(item.duration) === 1 ? "" : "s"} · package limit {item.package_limit}</small>
      <div><h3>Included services</h3><ul>{item.services.map(service => <li key={service.id}><CheckCircle2 aria-hidden="true" />{service.name} ×{service.qty}</li>)}</ul></div>
      {item.paid_attributes.length > 0 && <div><h3>Included vehicle options</h3><ul>{item.paid_attributes.map(option => <li key={option.id}><CheckCircle2 aria-hidden="true" />{option.name} ×{option.qty}</li>)}</ul></div>}
    </label>)}</div> : <div className="package-test-state">No purchasable test packages are currently visible in the booking system.</div>}
    {!order && packages.length > 0 && <div className="package-test-checkout"><label><span><CalendarDays aria-hidden="true" /> Package start date</span><input type="date" min={new Date().toISOString().slice(0, 10)} value={startDate} onChange={event => setStartDate(event.target.value)} /></label><label className="booking-consent"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>I understand this creates a live package invoice for the displayed amount.</span></label><button className="button button--lime" type="button" disabled={!selectedId || !accepted || busy} onClick={purchase}>{busy ? "Creating invoice…" : "Create test package invoice"}</button></div>}
    {order && <div className="package-test-payment"><p className="kicker">Invoice created</p><h2>{order.packageName}</h2><dl><div><dt>Invoice</dt><dd>{order.invoiceNumber}</dd></div><div><dt>Total</dt><dd>{bookingMoney(order.invoiceAmount || 0, order.currency)}</dd></div></dl><div className="simplybook-actions">{methods.map(method => <button className="button button--lime" type="button" disabled={paymentBusy} onClick={() => pay(method)} key={method}>{method.toLowerCase().includes("stripe") ? "Pay securely with Stripe" : `Pay with ${method}`}</button>)}</div><p>After Stripe confirms payment, open your customer account to confirm that the package credits have been created.</p></div>}
    {error && <p className="booking-form-error" role="alert">{error}</p>}
    <footer><Link href="/account">Open customer account</Link><Link href="/#book">Return to normal booking</Link></footer>
  </section>;
}
