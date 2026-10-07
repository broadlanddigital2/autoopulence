"use client";

// Website "My account", backed by the Race Car Graphics CRM (shared with racecargraphics.uk): email-code sign-in,
// bookings, prepaid packages (customers book their own visits), orders, invoices and account details.
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, FileText, PackageCheck, Repeat, UserRound } from "lucide-react";
import { BookingError, bookingRequest, currentSession, requestEmailCode, signInWithEmailCode, signOut, type CrmCustomer } from "@/lib/crm-booking";
import { bookingMoney, ukDate, ukTime, PACKAGE_DISCLAIMER, type CareSlot } from "@/lib/vehicle-care";
import { PackageVisitPicker } from "./ServiceBookingForm";
import { BookingAddressFields } from "./BookingAddressFields";

type Money = number;
type AccountOrder = { id: string; order_number: string; order_type: string; status: string; total: Money; amount_paid: Money; balance_due: Money; currency: string; created_at: string; business_units?: { name?: string }; ecommerce_order_items?: { description: string; quantity: number; line_total: Money }[] };
type AccountBooking = { id: string; order_id?: string; start_at: string; end_at: string; status: string; package_entitlement_id?: string | null; vehicle_registration?: string; vehicle_size?: string; balance_due?: Money; ecommerce_services?: { id: string; name: string }; ecommerce_packages?: { name?: string } | null; business_units?: { name?: string }; ecommerce_orders?: { order_number?: string } | null };
type AccountInvoice = { id: string; invoice_number: string; order_id?: string | null; quote_invoice_kind?: string | null; status: string; total: Money; amount_paid: Money; balance_due: Money; issued_at?: string; created_at: string; business_units?: { name?: string }; download_url?: string | null };
type AccountQuote = { id: string; quote_reference?: string; quote_number?: string; project_title?: string; status: string; total: Money; accepted_total?: Money | null; amount_paid?: Money; created_at: string; valid_until?: string; url?: string | null; business_units?: { name?: string }; jobs?: { job_number?: string; status?: string }[]; fitting_bookings?: { reference?: string; status?: string; start_date?: string; start_period?: number }[] };
type AccountPackage = { id: string; status: string; total_visits: number; used_visits: number; remaining_visits: number; price_label?: string; valid_until?: string | null; renewed_at?: string | null; renewal_url?: string; renewal_per_visit?: string; next_visit_number?: number | null; next_window_start?: string | null; next_window_end?: string | null; visits?: { booking_id: string; start_at: string; status: string }[]; ecommerce_packages?: { name?: string; ecommerce_package_items?: { service_id: string; ecommerce_services?: { id: string; name: string } }[] }; ecommerce_orders?: { order_number?: string } };
type AccountDesign = { id: string; reference: string; name?: string; status?: string; graphics_type?: string; ordered: boolean; updated_at: string; previews: string[]; edit_url?: string | null };
type Account = { customer: CrmCustomer; orders: AccountOrder[]; bookings: AccountBooking[]; invoices: AccountInvoice[]; quotes: AccountQuote[]; packages: AccountPackage[]; designs: AccountDesign[] };

const sections = ["Dashboard", "Bookings", "Packages", "Orders", "Invoices", "Account details"] as const;
type Section = (typeof sections)[number];
const message = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";
const statusLabel = (value: string) => value.replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
const shortDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }).format(new Date(iso));

/** Email-code sign-in (also creates the account on first use). Used by /login, /register and the account page. */
export function CodeSignIn({ title = "Sign in to your account", intro, onSignedIn }: { title?: string; intro?: ReactNode; onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function send(event?: FormEvent) {
    event?.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) return setStatus("Enter your email address.");
    setBusy(true); setStatus("");
    try { await requestEmailCode(value); setSentTo(value); setCode(""); setStatus(`We've emailed a 6-digit code to ${value}. It expires in 10 minutes.`); }
    catch (error) { setStatus(message(error)); } finally { setBusy(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) return setStatus("Enter the 6-digit code from your email.");
    setBusy(true); setStatus("");
    try { await signInWithEmailCode(sentTo, digits); onSignedIn(); }
    catch (error) { setStatus(message(error)); setBusy(false); }
  }
  return <form className="auth-card" onSubmit={sentTo ? verify : send}>
    <h2>{title}</h2>
    {intro || <p className="auth-card__intro">Enter your email and we'll send you a 6-digit code — no password needed. New customers get an account automatically.</p>}
    {!sentTo ? <label><span>Email address</span><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      : <label><span>6-digit code</span><input inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={e => setCode(e.target.value)} autoFocus required /></label>}
    {status && <p className={/emailed/.test(status) ? "form-success" : "form-error"} role="status">{status}</p>}
    <button className="button" type="submit" disabled={busy}>{busy ? "Please wait…" : sentTo ? "Sign in" : "Email me a code"}</button>
    {sentTo && <p className="auth-row"><button type="button" className="auth-link" onClick={() => void send()} disabled={busy}>Send a new code</button><button type="button" className="auth-link" onClick={() => { setSentTo(""); setStatus(""); }}>Use a different email</button></p>}
  </form>;
}

export function CustomerAccount() {
  const [signedIn, setSignedIn] = useState<boolean>();
  const [account, setAccount] = useState<Account>();
  const [section, setSection] = useState<Section>("Dashboard");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoadError("");
    try { const data = await bookingRequest<Account & { ok: true }>("customer_account"); setAccount(data); }
    catch (error) {
      if (error instanceof BookingError && (error.status === 401 || error.status === 403)) { await signOut().catch(() => undefined); setSignedIn(false); return; }
      setLoadError(message(error));
    }
  }
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("section")?.toLowerCase();
    const match = sections.find(item => item.toLowerCase() === requested || item.toLowerCase().startsWith(requested || "-"));
    if (match) setSection(match);
    currentSession().then(session => { setSignedIn(!!session); if (session) void load(); }).catch(() => setSignedIn(false));
  }, []);
  function go(next: Section) {
    setSection(next); setNotice("");
    const url = new URL(location.href); url.searchParams.set("section", next.split(" ")[0].toLowerCase()); history.replaceState(null, "", url);
  }

  if (signedIn === undefined) return <main className="customer-page account-page"><section className="account-shell shell"><p role="status">Loading your account…</p></section></main>;
  if (!signedIn) return <main className="customer-page auth-page"><section className="auth-layout shell">
    <div className="auth-intro"><span className="eyebrow">Customer account</span><h1>Your Auto Opulence account</h1>
      <p>See your bookings and orders, book the remaining visits on a prepaid package, and download invoices.</p>
      <ul><li>Upcoming and past bookings</li><li>Prepaid packages — book your monthly visits</li><li>Orders, invoices and payments</li></ul></div>
    <CodeSignIn onSignedIn={() => { setSignedIn(true); void load(); }} />
  </section></main>;

  const customer = account?.customer;
  const upcoming = (account?.bookings || []).filter(b => ["pending", "confirmed"].includes(b.status) && new Date(b.end_at || b.start_at) > new Date());
  const activePackages = (account?.packages || []).filter(p => p.status === "active");
  return <main className="customer-page account-page">
    <section className="account-shell shell">
      <aside className="account-nav">
        <div><UserRound /><span>Welcome back</span><strong>{customer ? `${customer.first_name} ${customer.last_name}`.trim() || customer.email : "…"}</strong></div>
        <nav>
          {sections.map(item => <button type="button" className={section === item ? "is-active" : ""} key={item} onClick={() => go(item)}>{item}</button>)}
          <button type="button" onClick={async () => { await signOut(); setAccount(undefined); setSignedIn(false); }}>Sign out</button>
        </nav>
      </aside>
      <div className="account-content">
        {loadError && <p className="form-error" role="alert">{loadError} <button type="button" className="auth-link" onClick={() => void load()}>Try again</button></p>}
        {notice && <p className="form-success" role="status">{notice}</p>}
        {!account && !loadError ? <p role="status">Loading your account…</p> : account && <>
          {section === "Dashboard" && <>
            <span className="eyebrow">Customer area</span><h1>Dashboard</h1>
            <p>Your Auto Opulence bookings, packages, orders and invoices.</p>
            {upcoming[0] && <div className="account-next"><CalendarDays /><div><small>Next appointment</small><strong>{upcoming.at(-1)!.ecommerce_services?.name}</strong><span>{ukDate(upcoming.at(-1)!.start_at)} · {ukTime(upcoming.at(-1)!.start_at)}</span></div><button type="button" className="auth-link" onClick={() => go("Bookings")}>View bookings</button></div>}
            {activePackages.filter(p => p.remaining_visits > 0).map(p => <div className="account-next account-next--package" key={p.id}><Repeat /><div><small>Package visits to book</small><strong>{p.ecommerce_packages?.name}</strong><span>{p.remaining_visits} of {p.total_visits} visits left to book{p.next_window_start && p.next_window_end ? ` · next in ${monthLabel(p.next_window_start)}` : ""}</span></div><button type="button" className="button" onClick={() => go("Packages")}>Book visit</button></div>)}
            <div className="account-stat-grid">
              <button onClick={() => go("Bookings")}><CalendarDays /><strong>{upcoming.length}</strong><span>Upcoming bookings</span></button>
              <button onClick={() => go("Packages")}><Repeat /><strong>{activePackages.length}</strong><span>Active packages</span></button>
              <button onClick={() => go("Orders")}><PackageCheck /><strong>{account.orders.length}</strong><span>Orders</span></button>
              <button onClick={() => go("Invoices")}><FileText /><strong>{account.invoices.length}</strong><span>Invoices</span></button>
            </div>
          </>}
          {section === "Bookings" && <Bookings bookings={account.bookings} onChanged={async text => { setNotice(text); await load(); }} />}
          {section === "Packages" && <Packages packages={account.packages} onBooked={async text => { setNotice(text); await load(); }} />}
          {section === "Orders" && <Orders orders={account.orders} invoices={account.invoices} />}
          {section === "Invoices" && <Invoices invoices={account.invoices} />}
          {section === "Account details" && customer && <Details customer={customer} onSaved={async () => { setNotice("Your details have been updated."); await load(); }} />}
        </>}
      </div>
    </section>
  </main>;
}

function monthLabel(isoDate: string) { return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(isoDate + "T12:00:00Z")); }
function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) { return <div className="account-empty">{icon}<h2>{title}</h2>{children}</div>; }

function Bookings({ bookings, onChanged }: { bookings: AccountBooking[]; onChanged: (text: string) => void }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const now = Date.now();
  const upcoming = bookings.filter(b => ["pending", "confirmed"].includes(b.status) && new Date(b.end_at || b.start_at).getTime() > now).sort((a, b) => a.start_at.localeCompare(b.start_at));
  const past = bookings.filter(b => !upcoming.includes(b));
  async function cancel(b: AccountBooking) {
    if (!window.confirm(`Cancel your ${b.ecommerce_services?.name || "booking"} on ${ukDate(b.start_at)} at ${ukTime(b.start_at)}?${b.package_entitlement_id ? " The visit goes back on your package so you can rebook it in the same month." : ""}`)) return;
    setBusy(b.id); setError("");
    try { const r = await bookingRequest<{ package_credit_released?: boolean }>("cancel_booking", { booking_id: b.id, reason: "Cancelled by customer in website account" }); onChanged(r.package_credit_released ? "Booking cancelled — the visit is back on your package." : "Booking cancelled. We've emailed you a confirmation."); }
    catch (e) { setError(message(e)); } finally { setBusy(""); }
  }
  const card = (b: AccountBooking, actions: boolean) => <article key={b.id}>
    <header>
      <div><small>{b.package_entitlement_id ? "Package visit" : "Booking"}</small><strong>{b.ecommerce_services?.name || "Booking"}</strong></div>
      <div><small>Date</small><strong>{ukDate(b.start_at, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</strong></div>
      <div><small>Time</small><strong>{ukTime(b.start_at)}</strong></div>
      <span>{statusLabel(b.status)}</span>
    </header>
    <p>{[b.business_units?.name, b.vehicle_registration, b.vehicle_size, b.ecommerce_packages?.name, b.ecommerce_orders?.order_number && `Order ${b.ecommerce_orders.order_number}`].filter(Boolean).join(" · ")}{!!b.balance_due && b.balance_due > 0 && ` · ${bookingMoney(b.balance_due)} due on the day`}</p>
    {actions && <footer><a href="tel:03300536925">Change date — call 0330 053 6925</a><button type="button" disabled={busy === b.id} onClick={() => void cancel(b)}>{busy === b.id ? "Cancelling…" : "Cancel booking"}</button></footer>}
  </article>;
  return <>
    <h1>Bookings</h1>
    {error && <p className="form-error" role="alert">{error}</p>}
    <h2 className="account-subhead">Upcoming</h2>
    {upcoming.length ? <div className="account-orders">{upcoming.map(b => card(b, true))}</div> : <Empty icon={<CalendarDays />} title="No upcoming bookings"><a href="/#book">Book a service</a></Empty>}
    {past.length > 0 && <><h2 className="account-subhead">Past</h2><div className="account-orders account-orders--past">{past.map(b => card(b, false))}</div></>}
  </>;
}

function Packages({ packages, onBooked }: { packages: AccountPackage[]; onBooked: (text: string) => void }) {
  const [booking, setBooking] = useState<string>();
  const [slot, setSlot] = useState<CareSlot>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shown = packages.filter(p => ["active", "expired"].includes(p.status));
  async function confirm(p: AccountPackage, serviceId: string) {
    if (!slot) return setError("Choose a date and time.");
    setBusy(true); setError("");
    try {
      await bookingRequest("book_package_visit", { entitlement_id: p.id, service_id: serviceId, provider_id: slot.provider_id, start_at: slot.start_at });
      setBooking(undefined); setSlot(undefined);
      onBooked(`Visit booked for ${ukDate(slot.start_at)} at ${ukTime(slot.start_at)}. We've emailed your confirmation — it's already paid for.`);
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <>
    <h1>Packages</h1>
    <p>Your prepaid visits. {PACKAGE_DISCLAIMER} Book each visit in its month — there's nothing more to pay.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {shown.length ? <div className="account-orders">{shown.map(p => {
      const serviceId = p.ecommerce_packages?.ecommerce_package_items?.[0]?.ecommerce_services?.id || p.ecommerce_packages?.ecommerce_package_items?.[0]?.service_id || "";
      const canBook = p.status === "active" && p.remaining_visits > 0 && !!p.next_visit_number && !!serviceId;
      const from = p.next_window_start || "", to = p.next_window_end || "";
      const month = from && to ? { from, to, days: Number(to.slice(8, 10)) - Number(from.slice(8, 10)) + 1, label: monthLabel(from) } : undefined;
      return <article key={p.id}>
        <header>
          <div><small>Package</small><strong>{p.ecommerce_packages?.name || "Service package"}</strong></div>
          <div><small>Visits</small><strong>{p.used_visits} of {p.total_visits} booked</strong></div>
          <div><small>{p.valid_until ? "Valid until" : "Order"}</small><strong>{p.valid_until ? shortDate(p.valid_until) : p.ecommerce_orders?.order_number || "—"}</strong></div>
          <span>{p.renewed_at ? "Renewed" : statusLabel(p.status)}</span>
        </header>
        <ol className="account-visits">
          {Array.from({ length: p.total_visits }, (_, i) => { const v = p.visits?.[i]; return <li key={i} className={v ? "is-booked" : ""}><span>Visit {i + 1}</span>{v ? <strong>{ukDate(v.start_at, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {ukTime(v.start_at)}</strong> : <em>{i + 1 === p.next_visit_number && month ? `To book in ${month.label}` : "To book"}</em>}</li>; })}
        </ol>
        {booking === p.id && month && <div className="account-visit-booker">
          <PackageVisitPicker key={month.from} serviceId={serviceId} visitNumber={p.next_visit_number || 1} month={month} value={slot} onChange={setSlot} />
          <div className="booking-actions"><button type="button" className="button" disabled={!slot || busy} onClick={() => void confirm(p, serviceId)}>{busy ? "Booking…" : slot ? `Book ${ukDate(slot.start_at, { day: "numeric", month: "short" })} at ${ukTime(slot.start_at)}` : "Choose a time"}</button><button type="button" className="button button--ghost" onClick={() => { setBooking(undefined); setSlot(undefined); }}>Cancel</button></div>
        </div>}
        <footer>
          {canBook && booking !== p.id && <button type="button" onClick={() => { setBooking(p.id); setSlot(undefined); setError(""); }}><CalendarDays /> Book visit {p.next_visit_number}{month ? ` · ${month.label}` : ""}</button>}
          {p.renewal_url && <a href={p.renewal_url}><Repeat /> Renew package{p.renewal_per_visit ? ` · ${p.renewal_per_visit} per visit` : ""}</a>}
          <a href="/contact">Package help</a>
        </footer>
      </article>;
    })}</div> : <Empty icon={<Repeat />} title="No packages yet"><p>Save on regular valets with a 3 or 6 month package.</p><a href="/service/premium-exterior-car-valet">View packages</a></Empty>}
  </>;
}

async function downloadInvoice(invoice: AccountInvoice) {
  if (invoice.download_url) { window.open(invoice.download_url, "_blank", "noopener"); return; }
  const r = await bookingRequest<{ pdf: string; filename: string }>("customer_invoice_pdf", { invoice_id: invoice.id });
  const bytes = Uint8Array.from(atob(r.pdf), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a"); a.href = url; a.download = r.filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function InvoiceButton({ invoice, label = "Download invoice" }: { invoice: AccountInvoice; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <><button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await downloadInvoice(invoice); } catch (e) { setError(message(e)); } finally { setBusy(false); } }}><FileText /> {busy ? "Preparing…" : label}</button>{error && <small className="form-error">{error}</small>}</>;
}

function Orders({ orders, invoices }: { orders: AccountOrder[]; invoices: AccountInvoice[] }) {
  const invoiceFor = useMemo(() => new Map(invoices.filter(i => i.order_id).map(i => [i.order_id!, i])), [invoices]);
  return <>
    <h1>Orders</h1>
    {orders.length ? <div className="account-orders">{orders.map(o => <article key={o.id}>
      <header>
        <div><small>Order</small><strong>{o.order_number}</strong></div>
        <div><small>Date</small><strong>{shortDate(o.created_at)}</strong></div>
        <div><small>Total</small><strong>{bookingMoney(o.total, o.currency)}</strong></div>
        <span>{o.balance_due > 0 && o.amount_paid > 0 ? "Part paid" : o.balance_due <= 0 ? "Paid" : statusLabel(o.status)}</span>
      </header>
      <ul className="account-order-items">{(o.ecommerce_order_items || []).map((item, i) => <li key={i}><span>{item.quantity > 1 ? `${item.quantity} × ` : ""}{item.description}</span><strong>{bookingMoney(item.line_total, o.currency)}</strong></li>)}</ul>
      <p>{[o.business_units?.name, o.order_type === "package" ? "Prepaid package" : o.order_type === "booking" || o.order_type === "service" ? "Vehicle care booking" : ""].filter(Boolean).join(" · ")}{o.balance_due > 0 ? ` · ${bookingMoney(o.balance_due, o.currency)} still to pay` : ""}</p>
      <footer>{invoiceFor.get(o.id) && <InvoiceButton invoice={invoiceFor.get(o.id)!} />}<a href="/contact">Order help</a></footer>
    </article>)}</div> : <Empty icon={<PackageCheck />} title="No orders yet"><a href="/services">Browse services</a></Empty>}
  </>;
}

function Invoices({ invoices }: { invoices: AccountInvoice[] }) {
  return <>
    <h1>Invoices</h1>
    {invoices.length ? <div className="account-orders">{invoices.map(i => <article key={i.id}>
      <header>
        <div><small>Invoice</small><strong>{i.invoice_number}</strong></div>
        <div><small>Date</small><strong>{shortDate(i.issued_at || i.created_at)}</strong></div>
        <div><small>Total</small><strong>{bookingMoney(i.total)}</strong></div>
        <span>{i.balance_due <= 0 ? "Paid" : i.amount_paid > 0 ? `${bookingMoney(i.balance_due)} due` : statusLabel(i.status)}</span>
      </header>
      <p>{[i.business_units?.name, i.quote_invoice_kind && `${statusLabel(i.quote_invoice_kind)} invoice`].filter(Boolean).join(" · ")}</p>
      <footer><InvoiceButton invoice={i} /></footer>
    </article>)}</div> : <Empty icon={<FileText />} title="No invoices yet" />}
  </>;
}



function Details({ customer, onSaved }: { customer: CrmCustomer; onSaved: () => void }) {
  const [postcode, setPostcode] = useState(customer.postcode || "");
  const [city, setCity] = useState(customer.city || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget), v = (n: string) => String(data.get(n) || "").trim();
    setBusy(true); setError("");
    try { await bookingRequest("customer_update_profile", { first_name: v("firstName"), last_name: v("lastName"), mobile: v("mobile"), address_line_1: v("address1"), address_line_2: v("address2"), city, postcode }); onSaved(); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <>
    <h1>Account details</h1>
    <p>Used for your bookings, orders and invoices. You sign in with a code sent to <strong>{customer.email}</strong> — there's no password to manage.</p>
    <form className="account-form" onSubmit={save}>
      <div className="form-grid">
        <label><span>First name</span><input name="firstName" defaultValue={customer.first_name} autoComplete="given-name" required /></label>
        <label><span>Last name</span><input name="lastName" defaultValue={customer.last_name} autoComplete="family-name" required /></label>
        <label><span>Email</span><input value={customer.email} readOnly aria-readonly="true" /></label>
        <label><span>Mobile number</span><input name="mobile" type="tel" defaultValue={customer.mobile} autoComplete="tel" /></label>
      </div>
      <h2 className="account-subhead">Address</h2>
      <BookingAddressFields postcode={postcode} city={city} onPostcodeChange={setPostcode} onCityChange={setCity} />
      <AddressDefaults line1={customer.address_line_1} line2={customer.address_line_2} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
    </form>
  </>;
}
/** BookingAddressFields renders uncontrolled address lines: fill them with the saved values once. */
function AddressDefaults({ line1, line2 }: { line1: string; line2: string }) {
  useEffect(() => {
    const set = (name: string, value: string) => { const el = document.querySelector<HTMLInputElement>(`.account-form [name="${name}"]`); if (el && !el.value && value) el.value = value; };
    set("address1", line1); set("address2", line2);
  }, [line1, line2]);
  return null;
}

/** /login and /register: one email-code page. */
export function CodeLoginPage({ register = false }: { register?: boolean }) {
  const next = () => { const target = new URLSearchParams(location.search).get("next") || "/account"; location.assign(target.startsWith("/") ? target : "/account"); };
  useEffect(() => { currentSession().then(s => { if (s) next(); }).catch(() => undefined); }, []);
  return <main className="customer-page auth-page"><section className="auth-layout shell">
    <div className="auth-intro"><span className="eyebrow">Customer account</span><h1>{register ? "Create your account" : "Sign in to Auto Opulence"}</h1>
      <p>No password needed — we email you a 6-digit code each time you sign in.{register ? " Your account is created the first time you use your code." : ""}</p>
      <ul><li>Upcoming and past bookings</li><li>Prepaid packages — book your monthly visits</li><li>Orders, invoices and payments</li></ul></div>
    <CodeSignIn title={register ? "Create your account" : "Welcome back"} onSignedIn={next} />
  </section></main>;
}
