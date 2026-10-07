"use client";

// Auto Opulence booking form, backed by the Race Car Graphics CRM: live services, prices, availability and
// prepaid packages; guest or email-code sign-in; payment through Stripe checkout. Same form as racecargraphics.uk.

import { FormEvent, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CarFront, CheckCircle2, ChevronDown, Lock, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { bookingTypes, sizeLabels, type BookingTypeId, type CustomerKind, type VehicleSize } from "@/lib/booking-services";
import { bookingDate, bookingMoney, bookingPaymentCompletePath, careAudience, careBusinessUnitId, careCatalogue, carePackagePrice, carePrice, careServiceFor, careServicesFor, careSizeOption, careTypeFor, PACKAGE_DISCLAIMER, packageMonthRanges, ukDate, ukTime, type CareCatalogue, type CareExtra, type CarePackage, type CarePackagePrice, type CareSlot } from "@/lib/vehicle-care";
import { BookingError, bookingRequest, currentSession, loadAvailableDates, loadAvailableSlots, loadCatalogue, loadCustomerProfile, requestEmailCode, signInWithEmailCode, signOut as crmSignOut, type CrmCustomer, type CrmServiceOrder } from "@/lib/crm-booking";
import { Calendar } from "@/components/ui/calendar";
import { BookingAddressFields } from "./BookingAddressFields";

const vehicleSizeExamples: Record<VehicleSize, { title: string; description: string; examples: string[] }> = {
  small: { title: "Small car", description: "Compact city cars and short three-door hatchbacks.", examples: ["Fiat 500", "Toyota Aygo", "Volkswagen up!", "MINI 3-Door Hatch", "Ford Ka"] },
  medium: { title: "Medium car", description: "Family hatchbacks and similarly sized compact cars.", examples: ["Ford Focus", "Volkswagen Golf", "Vauxhall Astra", "Audi A3", "BMW 1 Series"] },
  large: { title: "Large car", description: "Longer saloons, estates and medium-sized crossovers.", examples: ["BMW 3 or 5 Series", "Mercedes C or E-Class", "Tesla Model 3", "Skoda Octavia", "Volvo V60"] },
  extraLarge: { title: "Extra-large car", description: "Large SUVs and seven-seat passenger vehicles.", examples: ["Range Rover", "BMW X5", "Volvo XC90", "Mercedes GLE", "Toyota Land Cruiser"] },
};

// A booking awaiting payment, kept for this browser tab so the customer can return to checkout.
type PendingBooking = { orderNumber?: string; serviceName: string; packageName?: string; startAt: string; total: number; checkoutUrl: string; createdAt: number };
export const pendingBookingKey = "ao-care-pending";
const checkoutLifetimeMs = 29 * 60 * 1000; // Stripe checkout sessions expire after 30 minutes.

const message = (error: unknown) => error instanceof Error ? error.message : "Please try again shortly.";
function focusBookingSection(element: HTMLElement | null) {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
}
function readPending(): PendingBooking | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingBookingKey) || "null") as PendingBooking | null;
    if (value && Date.now() - value.createdAt < checkoutLifetimeMs) return value;
    sessionStorage.removeItem(pendingBookingKey);
  } catch { /* Storage is optional. */ }
  return undefined;
}
function checkoutUrl(value?: string) {
  if (!value) return "";
  const url = new URL(value);
  if (url.protocol !== "https:" || !/(^|\.)stripe\.com$/.test(url.hostname)) throw new Error("The payment link could not be verified. Please call us before trying again.");
  return url.href;
}

export function ServiceBookingForm({ initialType, initialService = "" }: { initialType: BookingTypeId; initialService?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const choicesRef = useRef<HTMLFieldSetElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const submissionLock = useRef(false);
  const [typeId, setTypeId] = useState<BookingTypeId>(initialType);
  const [customerKind, setCustomerKind] = useState<CustomerKind>("public");
  const [serviceId, setServiceId] = useState("");
  const [vehicleSize, setVehicleSize] = useState<VehicleSize>("small");
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [plan, setPlan] = useState("single"); // "single" or the id of a prepaid package
  const [wantedPackage, setWantedPackage] = useState(""); // package slug from a renewal link
  const [renewId, setRenewId] = useState(""); // the package being renewed (from a renewal link)
  const [renewals, setRenewals] = useState<{ id: string; name: string; url: string; nextMonth?: string; perVisit?: string }[]>([]);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<CareSlot>();
  // Packages: book every visit now (one per consecutive month), or just the first and the rest in the customer account.
  const [bookAllVisits, setBookAllVisits] = useState(false);
  const [laterVisits, setLaterVisits] = useState<(CareSlot | undefined)[]>([]);
  const [activeVisit, setActiveVisit] = useState(1);
  const errorRef = useRef<HTMLParagraphElement>(null);
  // Review step: everything checked, shown as a full summary before "Pay now" sends the customer to Stripe.
  type ReviewSnapshot = { values: Record<string, string>; marketing: boolean; extraVisits: CareSlot[]; signedIn: boolean };
  const [review, setReview] = useState<ReviewSnapshot>();
  const reviewRef = useRef<HTMLElement>(null);
  const [error, setError] = useState("");
  const [catalogue, setCatalogue] = useState<CareCatalogue>(careCatalogue);
  const [catalogueError, setCatalogueError] = useState("");
  const [catalogueBusy, setCatalogueBusy] = useState(!careCatalogue.services.length);
  const [catalogueRevision, setCatalogueRevision] = useState(0);
  const [dates, setDates] = useState<string[]>([]);
  const [loadedServiceId, setLoadedServiceId] = useState("");
  const [slots, setSlots] = useState<CareSlot[]>([]);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [slotsBusy, setSlotsBusy] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityRevision, setAvailabilityRevision] = useState(0);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingUncertain, setBookingUncertain] = useState(false);
  const [booking, setBooking] = useState<PendingBooking & { resumed?: boolean }>();
  const [paymentError, setPaymentError] = useState("");
  const [cancelledPayment, setCancelledPayment] = useState(false);
  const [client, setClient] = useState<CrmCustomer | null>(null);
  const [sessionBusy, setSessionBusy] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [codeSentTo, setCodeSentTo] = useState(""); // email the current code was sent to
  const [signInCode, setSignInCode] = useState("");
  const [signInStatus, setSignInStatus] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const activeType = bookingTypes.find(type => type.id === typeId)!;
  const services = useMemo(() => careServicesFor(typeId, customerKind, catalogue), [catalogue, customerKind, typeId]);
  const selectedService = services.find(service => service.id === serviceId);
  const liveService = selectedService?.bookable ? selectedService : undefined;
  const hasSizeChoices = !!liveService?.sizes.length;
  const sizeOption = careSizeOption(liveService, vehicleSize);
  const extras = liveService?.extras || [];
  const selectedExtras = extras.filter(extra => extraIds.includes(extra.addon_id));
  const needsSize = hasSizeChoices && !sizeOption;
  // Prepaid packages (3 / 6 monthly visits): no extras, paid in full, visits in consecutive months.
  const packages = liveService?.packages || [];
  const chosenPackage = packages.find(pkg => pkg.id === plan);
  const packagePrice = carePackagePrice(chosenPackage, vehicleSize, hasSizeChoices);
  const singlePrice = carePrice(liveService, vehicleSize, chosenPackage ? [] : extraIds);
  const visitPrice = carePrice(liveService, vehicleSize);
  const price = chosenPackage ? packagePrice?.amount : singlePrice;
  const requiresPriceConfirmation = !!liveService && !needsSize && (price === undefined || price <= 0);
  const depositPrice = liveService?.deposit_required && price ? Math.min(liveService.deposit_amount, price) : 0;
  const dateKey = selectedDate ? bookingDate(selectedDate) : "";
  const formattedDate = selectedDate ? new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(selectedDate) : "";
  const currency = "GBP";

  function fillClient(value: CrmCustomer) {
    setClient(value);
    const values = { firstName: value.first_name, lastName: value.last_name, email: value.email, mobile: value.mobile, address1: value.address_line_1, address2: value.address_line_2 };
    for (const [name, text] of Object.entries(values)) {
      const field = formRef.current?.elements.namedItem(name);
      if (field instanceof HTMLInputElement && text) field.value = text;
    }
    if (value.postcode) setPostcode(value.postcode);
    if (value.city) setCity(value.city);
  }

  // Pre-select from the page link (?type=…&service=…&size=…) and restore any booking awaiting payment.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const matchedType = bookingTypes.find(type => type.id === params.get("type"));
    const service = careServiceFor(params.get("service")) || careServiceFor(initialService);
    const serviceType = service && careTypeFor(service);
    if (service && serviceType) {
      setTypeId(serviceType); setServiceId(service.id);
      if (serviceType === "bay") setCustomerKind(careAudience(service));
    } else if (matchedType) setTypeId(matchedType.id);
    const audience = params.get("audience");
    if (!service && (audience === "trade" || audience === "public")) setCustomerKind(audience);
    const size = params.get("size");
    if (size && Object.hasOwn(sizeLabels, size)) setVehicleSize(size as VehicleSize);
    if (params.get("package")) setWantedPackage(params.get("package")!);
    if (params.get("renew") && /^[0-9a-f-]{36}$/i.test(params.get("renew")!)) setRenewId(params.get("renew")!);
    const pending = readPending();
    if (pending) setBooking({ ...pending, resumed: true });
    if (params.get("step") === "payment-cancelled") setCancelledPayment(true);

    const controller = new AbortController();
    currentSession().then(session => session ? loadCustomerProfile(controller.signal).then(fillClient).then(() => loadRenewals(controller.signal)) : undefined)
      .catch(() => { /* Signed out or profile unavailable: the customer can sign in again. */ })
      .finally(() => { if (!controller.signal.aborted) setSessionBusy(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (booking) focusBookingSection(resultRef.current);
  }, [booking?.checkoutUrl]);

  // Refresh prices and services from the CRM; the published catalogue is used until (or if) this fails.
  useEffect(() => {
    const controller = new AbortController();
    setCatalogueError("");
    loadCatalogue(controller.signal)
      .then(({ ok: _ok, ...live }) => { if (!controller.signal.aborted && live.services?.length) setCatalogue(live); })
      .catch(error => { if (!controller.signal.aborted && !careCatalogue.services.length) setCatalogueError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setCatalogueBusy(false); });
    return () => controller.abort();
  }, [catalogueRevision]);

  // A renewal link names the package by slug: select it once the service's packages are loaded.
  useEffect(() => {
    if (!wantedPackage) return;
    const match = packages.find(pkg => pkg.slug === wantedPackage);
    if (match) { setPlan(match.id); setWantedPackage(""); }
  }, [wantedPackage, liveService?.id, catalogue]);

  // Packages need a signed-in customer: open the email-code sign-in when one is chosen.
  useEffect(() => { if (chosenPackage && !client && !sessionBusy) setSignInOpen(true); }, [chosenPackage?.id, client, sessionBusy]);

  // Keep the chosen plan valid for the selected service.
  useEffect(() => { if (plan !== "single" && !packages.some(pkg => pkg.id === plan)) setPlan("single"); }, [liveService?.id, catalogue]);

  // Keep the chosen size and extras valid for the selected service.
  useEffect(() => {
    setExtraIds(ids => ids.filter(id => liveService?.extras.some(extra => extra.addon_id === id)));
    if (liveService?.sizes.length && !careSizeOption(liveService, vehicleSize)) {
      const fallback = liveService.sizes.find(option => option.is_default && option.size) || liveService.sizes.find(option => option.size);
      if (fallback?.size) setVehicleSize(fallback.size);
    }
  }, [liveService?.id, catalogue]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadedServiceId(""); setDates([]); setSlots([]); setSelectedDate(undefined); setSelectedSlot(undefined); setAvailabilityError("");
    if (!liveService) { setAvailabilityBusy(false); return () => controller.abort(); }
    const id = liveService.id;
    setAvailabilityBusy(true);
    loadAvailableDates(id, controller.signal)
      .then(dates => { if (!controller.signal.aborted) { setDates(dates); setLoadedServiceId(id); } })
      .catch(error => { if (!controller.signal.aborted) setAvailabilityError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setAvailabilityBusy(false); });
    return () => controller.abort();
  }, [liveService?.id, availabilityRevision]);

  useEffect(() => {
    const controller = new AbortController();
    setSlots([]); setSelectedSlot(undefined);
    if (!liveService || !dateKey) { setSlotsBusy(false); return () => controller.abort(); }
    setSlotsBusy(true); setAvailabilityError("");
    loadAvailableSlots(liveService.id, dateKey, controller.signal)
      .then(slots => { if (!controller.signal.aborted) setSlots(slots); })
      .catch(error => { if (!controller.signal.aborted) setAvailabilityError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setSlotsBusy(false); });
    return () => controller.abort();
  }, [liveService?.id, dateKey]);

  // The pay button sits in the summary column: show problems next to it and bring the form's message into view.
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [error]);
  useEffect(() => { setLaterVisits([]); setActiveVisit(1); }, [selectedSlot?.start_at, chosenPackage?.id, liveService?.id]);

  /** Signed-in customers whose package is fully booked are offered a renewal. */
  async function loadRenewals(signal?: AbortSignal) {
    try {
      const data = await bookingRequest<{ packages: { id: string; status: string; renewal_url?: string; renewal_next_month?: string; renewal_per_visit?: string; ecommerce_packages?: { name?: string } }[] }>("portal_data", {}, { signal });
      setRenewals((data.packages || []).filter(p => p.renewal_url).map(p => ({ id: p.id, name: p.ecommerce_packages?.name || "Your package", url: p.renewal_url!, nextMonth: p.renewal_next_month, perVisit: p.renewal_per_visit })));
    } catch { /* Renewal prompts are optional. */ }
  }

  function changeType(nextType: BookingTypeId) { setTypeId(nextType); setServiceId(""); setSelectedSlot(undefined); setError(""); }
  function toggleExtra(id: string) { setExtraIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]); }

  /** Step 1: email a 6-digit code (new and existing customers alike). */
  async function sendCode() {
    const email = signInEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setSignInStatus("Enter your email address.");
    setAuthBusy(true); setSignInStatus("");
    try {
      await requestEmailCode(email);
      setCodeSentTo(email); setSignInCode("");
      setSignInStatus(`We've emailed a 6-digit code to ${email}. It expires in 10 minutes.`);
    } catch (error) { setSignInStatus(message(error)); } finally { setAuthBusy(false); }
  }
  /** Step 2: check the code — signs the customer in, creating their account if it's new. */
  async function verifyCode() {
    const code = signInCode.replace(/\D/g, "");
    if (code.length !== 6) return setSignInStatus("Enter the 6-digit code from your email.");
    setAuthBusy(true); setSignInStatus("");
    try {
      const form = formRef.current ? new FormData(formRef.current) : null;
      const value = (name: string) => String(form?.get(name) || "").trim();
      await signInWithEmailCode(codeSentTo, code, { firstName: value("firstName"), lastName: value("lastName"), mobile: value("mobile") });
      const profile = await loadCustomerProfile().catch(() => null);
      if (profile) fillClient({ ...profile, email: profile.email || codeSentTo });
      else setClient({ first_name: "", last_name: "", email: codeSentTo, mobile: "", address_line_1: "", address_line_2: "", city: "", county: "", postcode: "" });
      const emailField = formRef.current?.elements.namedItem("email");
      if (emailField instanceof HTMLInputElement && !emailField.value) emailField.value = codeSentTo;
      void loadRenewals();
      setSignInOpen(false); setCodeSentTo(""); setSignInCode("");
      setSignInStatus("You're signed in. Check your details, then continue to payment.");
      if (error) setError("");
    } catch (error) { setSignInStatus(message(error)); } finally { setAuthBusy(false); }
  }
  async function signOut() {
    setAuthBusy(true);
    try { await crmSignOut(); setClient(null); setSignInStatus("Signed out."); }
    catch (error) { setSignInStatus(message(error)); } finally { setAuthBusy(false); }
  }

  async function prepareBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Keep the form now: React clears event.currentTarget once this handler awaits (e.g. the session check below).
    const formElement = event.currentTarget;
    if (submissionLock.current || booking || bookingUncertain || sessionBusy) return;
    // Single visits can be booked as a guest; prepaid packages are linked to a customer account.
    const signedIn = !!client && !!(await currentSession());
    if (client && !signedIn) setClient(null);
    if (chosenPackage && !signedIn) { setSignInOpen(true); setError("Packages are linked to your customer account. Please sign in or create an account to continue."); formRef.current?.querySelector(".booking-account")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (chosenPackage && !packagePrice) return setError("This package isn't available for the selected vehicle size.");
    if (!liveService || loadedServiceId !== liveService.id || availabilityBusy || availabilityError || catalogueBusy) return setError("Wait for the live booking options to load.");
    if (needsSize) return setError("Please select an available vehicle size.");
    if (requiresPriceConfirmation || price === undefined) return setError("Please call us to confirm the price and book this service.");
    if (!dateKey || !dates.includes(dateKey) || !selectedSlot || !slots.some(slot => slot.start_at === selectedSlot.start_at)) return setError("Please choose an available date and time.");
    const data = new FormData(formElement);
    const field = (name: string) => String(data.get(name) || "").trim();
    if (!field("firstName") || !field("lastName") || !field("email") || !field("mobile") || !postcode || !field("address1") || !city) return setError("Please complete your contact and address details.");
    if (data.get("acceptedTerms") !== "on") return setError("Please accept the booking terms before continuing.");
    const extraVisits = chosenPackage && bookAllVisits ? laterVisits.slice(0, chosenPackage.total_visits - 1) : [];
    if (chosenPackage && bookAllVisits && (extraVisits.length < chosenPackage.total_visits - 1 || extraVisits.some(visit => !visit))) return setError("Choose a date and time for each visit, or choose to book the rest later in your account.");
    if (chosenPackage && data.get("packageTerms") !== "on") return setError(`Please confirm you understand the package terms: ${PACKAGE_DISCLAIMER.toLowerCase()}`);
    // All checks passed: show the summary. Payment starts from "Pay now".
    const values: Record<string, string> = {};
    for (const name of ["firstName", "lastName", "email", "mobile", "address1", "address2", "registration", "website"]) values[name] = field(name);
    setError("");
    setReview({ values, marketing: data.get("marketing") === "on", extraVisits: extraVisits.filter(Boolean) as CareSlot[], signedIn });
  }

  useEffect(() => { if (review) requestAnimationFrame(() => { reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); reviewRef.current?.focus({ preventScroll: true }); }); }, [review]);

  function editBooking() {
    setReview(undefined);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  /** "Pay now" on the summary: recheck the slot, create the order in the CRM and go to Stripe. */
  async function payNow() {
    if (!review || submissionLock.current || !liveService || !selectedSlot) return;
    const { values, marketing, extraVisits, signedIn } = review;
    const field = (name: string) => values[name] || "";
    submissionLock.current = true; setBookingBusy(true); setError("");
    try {
      // Recheck availability immediately before creating the booking.
      const latest = await loadAvailableSlots(liveService.id, dateKey);
      const slot = latest.find(item => item.start_at === selectedSlot.start_at);
      if (!slot) { setSlots(latest); setSelectedSlot(undefined); setReview(undefined); throw new Error("That time has just been taken. Please choose another available time."); }
      const registration = field("registration").toUpperCase();
      const sizeLabel = hasSizeChoices ? sizeLabels[vehicleSize] : "";
      const origin = window.location.origin;
      let result: CrmServiceOrder;
      try {
        const action = chosenPackage ? "create_package_order" : signedIn ? "create_service_order" : "public_guest_service_order";
        const extrasChosen = chosenPackage ? [] : selectedExtras;
        result = await bookingRequest<CrmServiceOrder>(action, {
          business_unit_id: careBusinessUnitId, service_id: liveService.id, provider_id: slot.provider_id, start_at: slot.start_at,
          addon_ids: [...(sizeOption ? [sizeOption.addon_id] : []), ...extrasChosen.map(extra => extra.addon_id)],
          ...(chosenPackage ? { package_id: chosenPackage.id, package_price_id: packagePrice!.id, ...(renewId ? { renew_entitlement_id: renewId } : {}), ...(extraVisits.length ? { extra_visits: extraVisits.map(visit => ({ provider_id: visit.provider_id, start_at: visit.start_at })) } : {}) } : {}),
          source: "website", website: field("website"), marketing_email_consent: marketing,
          notes: [`Booked online at ${window.location.host}`, chosenPackage && `Package: ${chosenPackage.name} (${chosenPackage.total_visits} visits, consecutive months)`, sizeLabel && `Vehicle size: ${sizeLabel}`, registration && `Vehicle registration: ${registration}`, extrasChosen.length ? `Extras: ${extrasChosen.map(extra => extra.name).join(", ")}` : ""].filter(Boolean).join("\n"),
          service_type: activeType.label, vehicle_registration: registration, vehicle_size: sizeLabel,
          first_name: field("firstName"), last_name: field("lastName"), email: field("email"), mobile: field("mobile"),
          address_line_1: field("address1"), address_line_2: field("address2"), city, postcode: postcode.trim().toUpperCase(),
          source_url: window.location.href.split("#")[0],
          success_url: `${origin}${bookingPaymentCompletePath}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}${window.location.pathname}?step=payment-cancelled#book`,
        }, { signedIn });
      } catch (error) {
        if (error instanceof BookingError && (error.status === 0 || error.status >= 500)) setBookingUncertain(true);
        throw error;
      }
      if (!result.booking_id && !result.checkout?.url) { setBookingUncertain(true); throw new Error("Please call us to check your booking before submitting again. The confirmation was incomplete."); }
      const pending: PendingBooking = { orderNumber: result.order_number, serviceName: liveService.name, packageName: chosenPackage?.name, startAt: slot.start_at, total: Number(result.total ?? price), checkoutUrl: checkoutUrl(result.checkout?.url), createdAt: Date.now() };
      setBooking(pending);
      if (pending.checkoutUrl) {
        try { sessionStorage.setItem(pendingBookingKey, JSON.stringify(pending)); } catch { /* Storage is optional. */ }
        window.location.assign(pending.checkoutUrl);
      }
    } catch (error) { setError(message(error)); }
    finally { submissionLock.current = false; setBookingBusy(false); }
  }

  function startNewBooking() {
    try { sessionStorage.removeItem(pendingBookingKey); } catch { /* Storage is optional. */ }
    setBooking(undefined); setCancelledPayment(false); setPaymentError("");
  }

  if (booking) return <div className="booking-result" id="complete-payment" ref={resultRef} tabIndex={-1} role="region" aria-labelledby="booking-payment-heading">
    <span className="section-kicker">{booking.checkoutUrl ? "Finish your booking" : "Booking received"}</span>
    <h3 id="booking-payment-heading">{booking.checkoutUrl ? booking.resumed ? "Complete your payment." : "Taking you to secure checkout…" : "Thank you. Your booking has been received."}</h3>
    {booking.resumed && <p>{cancelledPayment ? "Your payment wasn’t completed. Your appointment is held for a short time — continue to checkout to confirm it, or start again." : "We’ve kept your booking so you can finish payment below."}</p>}
    {booking.orderNumber && <p>Order number: <strong>{booking.orderNumber}</strong></p>}
    <p><strong>{booking.packageName || booking.serviceName}</strong><br />{booking.packageName ? "First visit: " : ""}{ukDate(booking.startAt, { day: "numeric", month: "long", year: "numeric" })} at {ukTime(booking.startAt)} · UK time</p>
    {booking.checkoutUrl ? <>
      <p>Amount due: <strong>{bookingMoney(booking.total, currency)}</strong></p>
      <div className="booking-checkout"><a className="button" href={booking.checkoutUrl}>Continue to secure checkout ↗</a><p>You’ll return to this website after checkout to see your payment status and booking details.</p></div>
      <div className="booking-actions"><button type="button" className="button button--ghost" onClick={startNewBooking}>Start a new booking</button></div>
      {paymentError && <p className="booking-form-error" role="alert">{paymentError}</p>}
      <p>Your appointment is confirmed once payment is complete. Unpaid bookings are released automatically after 30 minutes.</p>
    </> : <p>Auto Opulence will email your appointment confirmation. Keep your order number for any questions or changes.</p>}
    <a href="tel:03300536925">Booking help: 0330 053 6925</a>
  </div>;

  return <>
  {review && liveService && selectedSlot && <BookingReview ref={reviewRef}
    serviceName={liveService.name} typeLabel={activeType.label} sizeLabel={hasSizeChoices ? sizeLabels[vehicleSize] : ""}
    registration={review.values.registration.toUpperCase()} pkg={chosenPackage} packagePrice={packagePrice} visitPrice={visitPrice}
    firstSlot={selectedSlot} extraVisits={review.extraVisits} extras={chosenPackage ? [] : selectedExtras} sizePrice={chosenPackage ? undefined : carePrice(liveService, vehicleSize)}
    total={price ?? 0} deposit={depositPrice} currency={currency} values={review.values}
    city={city} postcode={postcode.trim().toUpperCase()} busy={bookingBusy} error={error} uncertain={bookingUncertain}
    onPay={payNow} onEdit={editBooking} />}
  <form className="service-booking-form" onSubmit={prepareBooking} ref={formRef} hidden={!!review}>
    <div className="booking-form-main">
      <div className="booking-account">
        <div className="booking-account-prompt"><UserRound aria-hidden="true" /><span>{client ? `Signed in as ${[client.first_name, client.last_name].filter(Boolean).join(" ") || client.email}` : chosenPackage ? "Packages are linked to your email — sign in with a code" : "Book a single visit as a guest, or sign in with a code"}</span>{client ? <button type="button" disabled={authBusy} onClick={signOut}>Sign out</button> : <button type="button" aria-expanded={signInOpen} aria-controls="booking-sign-in" onClick={() => { setSignInOpen(open => !open); setSignInStatus(""); }}>{signInOpen ? "Close" : "Sign in"}</button>}</div>
        {signInOpen && !client && <section className="booking-sign-in" id="booking-sign-in" aria-label="Customer sign in">
          <div className="booking-sign-in__heading"><strong>{codeSentTo ? "Enter your code" : chosenPackage ? "Packages are linked to your account" : "Sign in"}</strong><span>{codeSentTo ? `We sent a 6-digit code to ${codeSentTo}.` : "Enter your email and we'll send you a 6-digit code — no password needed. New customers get an account automatically."}</span></div>
          {!codeSentTo ? <div className="booking-sign-in__fields">
            <label className="booking-field"><span>Email address</span><input type="email" value={signInEmail} onChange={event => setSignInEmail(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void sendCode(); } }} autoComplete="email" maxLength={254} /></label>
          </div> : <div className="booking-sign-in__fields">
            <label className="booking-field"><span>6-digit code</span><input value={signInCode} onChange={event => setSignInCode(event.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void verifyCode(); } }} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} className="booking-code-input" autoFocus /></label>
          </div>}
          <div className="booking-sign-in__actions">
            {!codeSentTo ? <button type="button" className="button" disabled={authBusy} onClick={sendCode}>{authBusy ? "Sending…" : "Email me a code"}</button>
              : <><button type="button" className="button" disabled={authBusy || signInCode.length !== 6} onClick={verifyCode}>{authBusy ? "Checking…" : "Continue"}</button>
                <button type="button" disabled={authBusy} onClick={sendCode}>Send a new code</button>
                <button type="button" disabled={authBusy} onClick={() => { setCodeSentTo(""); setSignInCode(""); setSignInStatus(""); }}>Use a different email</button></>}
          </div>
          <p className="booking-sign-in__note">By continuing you agree to your details being used to manage your bookings, as described in the <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.</p>
        </section>}
        {signInStatus && <p className="booking-sign-in__status" role="status">{signInStatus}</p>}
        {client && <button type="button" className="button booking-account-continue" onClick={() => focusBookingSection(choicesRef.current)}>Continue to Booking</button>}
      </div>
      {renewId && chosenPackage && <div className="booking-package-disclaimer" role="note"><strong>Renewing your {chosenPackage.name}</strong><p>Choose the first visit of your new package below — to keep your monthly schedule, book it in the month after your current package's last visit. {PACKAGE_DISCLAIMER}</p></div>}
      {!renewId && renewals.length > 0 && renewals.map(r => <div className="booking-package-disclaimer booking-renewal-offer" role="note" key={r.id}><strong>Your {r.name} is fully booked</strong><p>Renew now{r.perVisit ? ` at ${r.perVisit} per visit` : ""}{r.nextMonth ? ` and your next visits start in ${r.nextMonth}` : ""}.</p><a className="button" href={r.url}>Renew my package</a></div>)}
      {sessionBusy && <p role="status">Checking your account…</p>}
      {catalogueBusy && <p role="status">Loading live booking options…</p>}
      {catalogueError && <div className="booking-form-error" role="alert"><p>{catalogueError}</p><button type="button" className="button button--ghost" onClick={() => setCatalogueRevision(value => value + 1)}>Try again</button></div>}
      <fieldset id="booking-choices" ref={choicesRef} tabIndex={-1} disabled={bookingBusy || bookingUncertain}>
        <legend><span>01</span> Select type</legend>
        <div className="booking-type-options">{bookingTypes.map(type => <label className={typeId === type.id ? "is-selected" : ""} key={type.id}><input type="radio" name="bookingType" value={type.id} checked={typeId === type.id} onChange={() => changeType(type.id)} /><strong>{type.label}</strong></label>)}</div>
      </fieldset>
      {typeId === "bay" && <fieldset disabled={bookingBusy || bookingUncertain}><legend>Trade or general public?</legend><div className="booking-audience-options">{(["public", "trade"] as CustomerKind[]).map(kind => <label className={customerKind === kind ? "is-selected" : ""} key={kind}><input type="radio" name="customerKind" checked={customerKind === kind} onChange={() => { setCustomerKind(kind); setServiceId(""); }} /><strong>{kind === "trade" ? "Trade" : "General public"}</strong></label>)}</div></fieldset>}
      <fieldset disabled={bookingBusy || bookingUncertain}>
        <legend><span>02</span> Select service</legend>
        <label className="booking-field"><span>Service type</span><select value={serviceId} onChange={event => { setServiceId(event.target.value); setError(""); }} required><option value="">Choose a service</option>{services.map(service => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label>
        {selectedService?.description && <p className="booking-service-note">{selectedService.description.replace(/\s*View inclusions and size-based prices from Auto Opulence in Norwich, then book online\.?$/, "")}</p>}
        {selectedService && !catalogueBusy && !catalogueError && !liveService && <p className="booking-form-error">Online booking is not available for this service. Please <a href="tel:03300536925">call 0330 053 6925</a>.</p>}
        {availabilityBusy && <p role="status">Loading live availability…</p>}
        {availabilityError && <div className="booking-form-error" role="alert"><p>{availabilityError}</p><button type="button" className="button button--ghost" onClick={() => setAvailabilityRevision(value => value + 1)}>Reload availability</button></div>}
        {extras.length > 0 && !chosenPackage && <div className="booking-addons"><span>Optional extras</span><div>{extras.map(extra => <label key={extra.addon_id} title={extra.description || undefined}><input type="checkbox" checked={extraIds.includes(extra.addon_id)} onChange={() => toggleExtra(extra.addon_id)} /><i aria-hidden="true" /><strong>{extra.name}{extra.price_adjustment > 0 ? ` — +${bookingMoney(extra.price_adjustment, currency)}` : ""}</strong></label>)}</div></div>}
      </fieldset>
      {hasSizeChoices && <fieldset disabled={bookingBusy || bookingUncertain}>
        <legend><span>03</span> Select vehicle size</legend>
        <div className="booking-size-options">{(Object.keys(sizeLabels) as VehicleSize[]).map(size => {
          const option = careSizeOption(liveService, size);
          const sizePrice = option ? carePrice(liveService, size) : undefined;
          return <label className={vehicleSize === size ? "is-selected" : ""} key={size}><input type="radio" name="vehicleSize" value={size} checked={vehicleSize === size} disabled={!option} onChange={() => { setVehicleSize(size); setSizeGuideOpen(true); }} /><strong>{sizeLabels[size]}</strong><small>{sizePrice !== undefined ? bookingMoney(sizePrice, currency) : "Not available online"}</small></label>;
        })}</div>
        <div className={`vehicle-size-guide ${sizeGuideOpen ? "is-open" : ""}`}>
          <button className="vehicle-size-guide__toggle" type="button" aria-expanded={sizeGuideOpen} aria-controls="vehicle-size-guide-panel" onClick={() => setSizeGuideOpen((open) => !open)}>
            <span><CarFront aria-hidden="true" /><span><strong>Which vehicle size should I choose?</strong><small>View common examples for each price category</small></span></span><ChevronDown aria-hidden="true" />
          </button>
          {sizeGuideOpen && <div className="vehicle-size-guide__panel" id="vehicle-size-guide-panel">
            <div className="vehicle-size-guide__grid">{(Object.keys(vehicleSizeExamples) as VehicleSize[]).map((size, index) => { const item = vehicleSizeExamples[size]; return <article className={vehicleSize === size ? `vehicle-size-guide__card vehicle-size-guide__card--${size} is-selected` : `vehicle-size-guide__card vehicle-size-guide__card--${size}`} key={size}>
              <button type="button" aria-pressed={vehicleSize === size} disabled={!careSizeOption(liveService, size)} onClick={() => setVehicleSize(size)}><span className="vehicle-size-guide__icon"><CarFront aria-hidden="true" /></span><span className="vehicle-size-guide__number">{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong></button><small>{item.description}</small><ul>{item.examples.map((example) => <li key={example}>{example}</li>)}</ul>
            </article>; })}</div>
            <p><strong>Not sure?</strong> Choose the closest example or call <a href="tel:03300536925">0330 053 6925</a>. The team will confirm the vehicle category before your booking is finalised.</p>
          </div>}
        </div>
      </fieldset>}
      {liveService && packages.length > 0 && <fieldset disabled={bookingBusy || bookingUncertain}>
        <legend><span>{hasSizeChoices ? "04" : "03"}</span> Single visit or package</legend>
        <div className="booking-plan-options">
          <label className={plan === "single" ? "is-selected" : ""}>
            <input type="radio" name="plan" checked={plan === "single"} onChange={() => setPlan("single")} />
            <span className="booking-plan__name">Single visit</span>
            <span className="booking-plan__price">{visitPrice !== undefined ? bookingMoney(visitPrice, currency) : "—"}</span>
            <small>Pay for one visit. Book as a guest or with your account.</small>
          </label>
          {packages.map(pkg => {
            const option = carePackagePrice(pkg, vehicleSize, hasSizeChoices);
            const perVisit = option?.per_visit ?? (option ? option.amount / pkg.total_visits : undefined);
            const saving = option && visitPrice !== undefined ? Math.max(0, visitPrice * pkg.total_visits - option.amount) : 0;
            return <label className={plan === pkg.id ? "is-selected" : ""} key={pkg.id}>
              <input type="radio" name="plan" checked={plan === pkg.id} disabled={!option} onChange={() => setPlan(pkg.id)} />
              {saving > 0 && <span className="booking-plan__badge">Save {bookingMoney(saving, currency)}</span>}
              <span className="booking-plan__name">{pkg.months}-month package</span>
              <span className="booking-plan__price">{perVisit !== undefined ? bookingMoney(perVisit, currency) : "—"}<em> per visit</em></span>
              {visitPrice !== undefined && perVisit !== undefined && perVisit < visitPrice && <span className="booking-plan__was">Usually {bookingMoney(visitPrice, currency)} per visit</span>}
              <small>{pkg.total_visits} visits, one a month · {option ? `${bookingMoney(option.amount, currency)} paid today` : "Not available for this size"}</small>
            </label>;
          })}
        </div>
        {chosenPackage && <div className="booking-package-disclaimer" role="note"><strong>{PACKAGE_DISCLAIMER}</strong><p>Pay for all {chosenPackage.total_visits} visits today, one visit each month. Book every visit now, or just the first and book the rest later in your customer account. Packages are linked to your customer account.</p></div>}
      </fieldset>}
      {depositPrice > 0 && <p className="booking-service-note">A {bookingMoney(depositPrice, currency)} deposit is taken when you book. The remaining balance is payable on the day.</p>}
      {requiresPriceConfirmation && <p className="booking-form-error">The price for this service needs confirming. Please <a href="tel:03300536925">call 0330 053 6925</a> to book.</p>}
      <fieldset disabled={bookingBusy || bookingUncertain || !liveService || availabilityBusy || requiresPriceConfirmation}>
        <legend><span>{String(4 + (packages.length ? 1 : 0) - (hasSizeChoices ? 0 : 1)).padStart(2, "0")}</span> {chosenPackage ? "First visit — date and time" : "Date and time"}</legend>
        <div className="booking-date-time">
          <div className="booking-calendar"><span className="booking-control-label">Select date</span><Calendar mode="single" selected={selectedDate} onSelect={date => { setSelectedDate(date); setSelectedSlot(undefined); setError(""); }} disabled={date => !dates.includes(bookingDate(date))} showOutsideDays={false} /></div>
          <div className="booking-time-panel"><span className="booking-control-label">Available times · UK time</span>{slotsBusy ? <p role="status">Checking available times…</p> : selectedDate ? slots.length ? <div className="booking-time-options">{slots.map(slot => <button type="button" className={selectedSlot?.start_at === slot.start_at ? "is-selected" : ""} aria-pressed={selectedSlot?.start_at === slot.start_at} onClick={() => { setSelectedSlot(slot); setError(""); }} key={slot.start_at}>{ukTime(slot.start_at)}</button>)}</div> : <p>No times are available on this date. Please choose another day.</p> : <div className="booking-time-empty"><CalendarDays aria-hidden="true" /><strong>{liveService ? "Choose an available date" : "Choose a service first"}</strong><p>{!availabilityBusy && liveService && !dates.length ? "No appointments are currently available online. Please call us." : "Dates and times come directly from our booking calendar."}</p></div>}</div>
        </div>
        {selectedDate && <p className="booking-selected-slot"><strong>{formattedDate}</strong>{selectedSlot ? ` at ${ukTime(selectedSlot.start_at)}` : " — now choose a time"}</p>}
        {chosenPackage && selectedSlot && <div className="booking-package-visits">
          <div className="booking-plan-options booking-plan-options--compact" role="radiogroup" aria-label="When to book your other visits">
            <label className={`booking-plan-option${bookAllVisits ? " is-selected" : ""}`}><input type="radio" name="visitPlan" checked={bookAllVisits} onChange={() => setBookAllVisits(true)} /><strong>Book all {chosenPackage.total_visits} visits now</strong><small>Choose a date and time in each month</small></label>
            <label className={`booking-plan-option${!bookAllVisits ? " is-selected" : ""}`}><input type="radio" name="visitPlan" checked={!bookAllVisits} onChange={() => setBookAllVisits(false)} /><strong>Book the first visit only</strong><small>Book the rest later in your account</small></label>
          </div>
          {bookAllVisits && liveService ? (() => {
            const months = packageMonthRanges(selectedSlot.start_at, chosenPackage.total_visits);
            const active = Math.min(Math.max(1, activeVisit), months.length - 1);
            const choose = (slot?: CareSlot) => {
              const next = [...laterVisits]; next[active - 1] = slot; setLaterVisits(next); setError("");
              if (slot) { const open = months.findIndex((_, i) => i > 0 && i !== active && !next[i - 1]); if (open > 0) setActiveVisit(open); }
            };
            return <div className="booking-visit-planner">
              <div className="booking-visit-tabs" role="tablist" aria-label="Package visits">
                {months.map((month, index) => {
                  const slot = index === 0 ? selectedSlot : laterVisits[index - 1];
                  return <button type="button" role="tab" key={month.from} aria-selected={index === active} disabled={index === 0}
                    className={`booking-visit-tab${index === active ? " is-active" : ""}${slot ? " is-done" : ""}`} onClick={() => setActiveVisit(index)}>
                    <small>Visit {index + 1} · {month.label}</small>
                    <strong>{slot ? <>{new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" }).format(new Date(slot.start_at))} · {ukTime(slot.start_at)}</> : "Choose a time"}</strong>
                    {slot && <CheckCircle2 aria-hidden="true" />}
                  </button>;
                })}
              </div>
              <PackageVisitPicker key={months[active].from} serviceId={liveService.id} visitNumber={active + 1} month={months[active]} value={laterVisits[active - 1]} onChange={choose} />
            </div>;
          })() : <ol className="booking-package-schedule">{packageMonthRanges(selectedSlot.start_at, chosenPackage.total_visits).map((month, index) => <li key={month.from}>
            <span>Visit {index + 1}</span>
            {index === 0 ? <strong>{ukDate(selectedSlot.start_at)}, {ukTime(selectedSlot.start_at)}</strong> : <><strong>{month.label}</strong><small>book in your account</small></>}
          </li>)}</ol>}
          {!bookAllVisits && <p className="booking-service-note">After payment, book each remaining visit in its month from <a href="/account?section=packages">your account</a> — sign in with your email and we'll send you a code. We'll email a confirmation for each one.</p>}
        </div>}
      </fieldset>
      <fieldset disabled={bookingBusy || bookingUncertain}>
        <legend><span>{String(5 + (packages.length ? 1 : 0) - (hasSizeChoices ? 0 : 1)).padStart(2, "0")}</span> Your details</legend>
        <div className="booking-form-grid">
          <label className="booking-field"><span>First name</span><input name="firstName" autoComplete="given-name" maxLength={100} required /></label>
          <label className="booking-field"><span>Last name</span><input name="lastName" autoComplete="family-name" maxLength={100} required /></label>
          <label className="booking-field"><span>Email address</span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <label className="booking-field"><span>Mobile number</span><input name="mobile" type="tel" autoComplete="tel" maxLength={30} required /></label>
          {typeId !== "bay" && <label className="booking-field"><span>Vehicle registration</span><input name="registration" autoComplete="off" maxLength={12} style={{ textTransform: "uppercase" }} /></label>}
        </div>
        <BookingAddressFields postcode={postcode} city={city} onPostcodeChange={setPostcode} onCityChange={setCity} />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1 }} />
        {chosenPackage && <label className="booking-consent"><input type="checkbox" name="packageTerms" required /><span>I understand that {PACKAGE_DISCLAIMER.charAt(0).toLowerCase() + PACKAGE_DISCLAIMER.slice(1)} All {chosenPackage.total_visits} visits are paid in advance today.</span></label>}
        <label className="booking-consent"><input type="checkbox" name="acceptedTerms" required /><span>I agree to the booking terms and to my details being used by Auto Opulence to manage this booking, as described in the <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.</span></label>
      </fieldset>
      {error && <p className="booking-form-error" ref={errorRef}>{error}</p>}
      {bookingUncertain && <p className="booking-form-error">Please call us before trying again. We need to check whether the booking was received.</p>}
    </div>
    <aside className="booking-form-summary">
      <span className="section-kicker">{chosenPackage ? "Your package" : "Your booking"}</span><h3>{selectedService?.name || "Select a service"}</h3>
      <dl className="booking-price-summary"><div><dt>Type</dt><dd>{activeType.label}</dd></div>{typeId === "bay" && <div><dt>Customer</dt><dd>{customerKind === "trade" ? "Trade" : "General public"}</dd></div>}{hasSizeChoices && <div><dt>Vehicle size</dt><dd>{sizeLabels[vehicleSize]}</dd></div>}{!chosenPackage && selectedExtras.map(extra => <div key={extra.addon_id}><dt>{extra.name}</dt><dd>{bookingMoney(extra.price_adjustment, currency)}</dd></div>)}{chosenPackage && packagePrice && <><div><dt>Package</dt><dd>{chosenPackage.months} months · {chosenPackage.total_visits} visits</dd></div><div><dt>Per visit</dt><dd>{bookingMoney(packagePrice.per_visit ?? packagePrice.amount / chosenPackage.total_visits, currency)}{visitPrice !== undefined && <s style={{ marginLeft: 8, opacity: .6 }}>{bookingMoney(visitPrice, currency)}</s>}</dd></div></>}{depositPrice > 0 && <div><dt>Deposit due now</dt><dd>{bookingMoney(depositPrice, currency)}</dd></div>}<div className="booking-price-row"><dt>{chosenPackage ? "Paid today" : "Booking total"}</dt><dd>{!liveService || needsSize ? "—" : requiresPriceConfirmation || price === undefined ? "Please call" : bookingMoney(price, currency)}</dd></div></dl>
            {chosenPackage && <p className="booking-package-disclaimer booking-package-disclaimer--summary"><strong>{PACKAGE_DISCLAIMER}</strong></p>}
      <ul><li><CarFront aria-hidden="true" /><span><strong>Norwich facility</strong>Unit 7 Consensus House, St Faiths Road, NR6 7BW</span></li><li><CalendarDays aria-hidden="true" /><span><strong>Live availability</strong>Select an available appointment from our booking calendar.</span></li><li><MapPin aria-hidden="true" /><span><strong>{chosenPackage ? "Your account" : "Guest or account"}</strong>{chosenPackage ? "Packages are linked to your account so our team can book your remaining visits." : "Book as a guest, or sign in to keep your bookings together."}</span></li><li><CheckCircle2 aria-hidden="true" /><span><strong>Secure checkout</strong>Pay securely by card to confirm your appointment.</span></li></ul>
      <button className="button" type="submit" disabled={bookingBusy || bookingUncertain || sessionBusy || catalogueBusy || !liveService || availabilityBusy || slotsBusy || !!availabilityError || needsSize || requiresPriceConfirmation || !selectedSlot}>{chosenPackage && !client ? "Sign in to continue" : "Review booking"}</button>
      {error && <p className="booking-form-error booking-form-error--summary" role="alert">{error}</p>}
      <a href="tel:03300536925">Prefer to call? 0330 053 6925</a>
      <p>Review your service, date and details before continuing. Your appointment is confirmed once checkout is complete.</p>
    </aside>
  </form>
  </>;
}

/** Calendar and times for one later package visit, locked to the month it must fall in. */
export function PackageVisitPicker({ serviceId, visitNumber, month, value, onChange }: { serviceId: string; visitNumber: number; month: { from: string; to: string; days: number; label: string }; value?: CareSlot; onChange: (slot?: CareSlot) => void }) {
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value.start_at) : undefined);
  const [times, setTimes] = useState<CareSlot[]>([]);
  const [busy, setBusy] = useState(true);
  const [timesBusy, setTimesBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const key = date ? bookingDate(date) : "";
  const monthStart = new Date(`${month.from}T12:00:00`);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setProblem("");
    loadAvailableDates(serviceId, controller.signal, { from: month.from, days: month.days })
      .then(list => { if (!controller.signal.aborted) setDates(list.filter(d => d >= month.from && d <= month.to)); })
      .catch(error => { if (!controller.signal.aborted) setProblem(error instanceof Error ? error.message : "Availability could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [serviceId, month.from]);
  useEffect(() => {
    const controller = new AbortController();
    setTimes([]);
    if (!key) return () => controller.abort();
    setTimesBusy(true);
    loadAvailableSlots(serviceId, key, controller.signal)
      .then(list => { if (!controller.signal.aborted) setTimes(list); })
      .catch(error => { if (!controller.signal.aborted) setProblem(error instanceof Error ? error.message : "Times could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setTimesBusy(false); });
    return () => controller.abort();
  }, [serviceId, key]);
  return <div className="booking-visit-picker">
    <p className="booking-visit-picker__title"><strong>Visit {visitNumber}</strong> — choose a date in {month.label}</p>
    <div className="booking-date-time">
      <div className="booking-calendar"><span className="booking-control-label">Select date · {month.label}</span>
        {busy ? <p role="status">Checking availability…</p> : <Calendar mode="single" selected={date} defaultMonth={monthStart} startMonth={monthStart} endMonth={monthStart} onSelect={next => { setDate(next); onChange(undefined); }} disabled={d => !dates.includes(bookingDate(d))} showOutsideDays={false} />}
      </div>
      <div className="booking-time-panel"><span className="booking-control-label">Available times · UK time</span>
        {timesBusy ? <p role="status">Checking available times…</p>
          : date ? times.length ? <div className="booking-time-options">{times.map(slot => <button type="button" className={value?.start_at === slot.start_at ? "is-selected" : ""} aria-pressed={value?.start_at === slot.start_at} onClick={() => onChange(slot)} key={slot.start_at}>{ukTime(slot.start_at)}</button>)}</div> : <p>No times are available on this date. Please choose another day.</p>
          : <div className="booking-time-empty"><CalendarDays aria-hidden="true" /><strong>Choose a date in {month.label}</strong><p>{!busy && !dates.length ? `No appointments are left online in ${month.label}. Please call us, or book this visit later in your account.` : "Package visits have to be booked in consecutive months."}</p></div>}
      </div>
    </div>
    {problem && <p className="booking-form-error" role="alert">{problem}</p>}
  </div>;
}

type ReviewProps = {
  serviceName: string; typeLabel: string; sizeLabel: string; registration: string;
  pkg?: CarePackage; packagePrice?: CarePackagePrice; visitPrice?: number; sizePrice?: number;
  firstSlot: CareSlot; extraVisits: CareSlot[]; extras: CareExtra[];
  total: number; deposit: number; currency: string; values: Record<string, string>; city: string; postcode: string;
  busy: boolean; error: string; uncertain: boolean; onPay: () => void; onEdit: () => void;
};
/** Full order summary shown before Stripe: what's booked, when, for whom, and what's paid today. */
const BookingReview = forwardRef<HTMLElement, ReviewProps>(function BookingReview(props, ref) {
  const { pkg, packagePrice, firstSlot, extraVisits, currency, values } = props;
  const when = (iso: string) => `${ukDate(iso)} · ${ukTime(iso)}`;
  const months = pkg ? packageMonthRanges(firstSlot.start_at, pkg.total_visits) : [];
  const perVisit = packagePrice ? (packagePrice.per_visit ?? packagePrice.amount / Math.max(1, pkg?.total_visits || 1)) : undefined;
  const saving = pkg && props.visitPrice && perVisit ? Math.max(0, props.visitPrice * pkg.total_visits - (packagePrice?.amount || 0)) : 0;
  const payToday = props.deposit > 0 ? props.deposit : props.total;
  const later = pkg ? months.length - 1 - extraVisits.length : 0;
  return <section className="booking-receipt booking-review" ref={ref} tabIndex={-1} aria-labelledby="booking-review-title">
    <div className="booking-receipt__intro">
      <span className="section-kicker">Step 2 of 2 · Review and pay</span>
      <h1 id="booking-review-title">Check your booking.</h1>
      <p>Make sure everything below is right, then pay securely with Stripe. {pkg ? `All ${pkg.total_visits} visits are paid today.` : props.deposit > 0 ? "A deposit secures your appointment." : "Your appointment is confirmed as soon as payment completes."}</p>
    </div>
    <div className="booking-receipt__layout">
      <div className="booking-receipt__card">
        <h2>{pkg ? "Your package" : "Your appointment"}</h2>
        <dl className="booking-receipt__details">
          <div><dt>Service</dt><dd>{props.serviceName}<br /><small className="booking-review__muted">{props.typeLabel}</small></dd></div>
          {pkg && <div><dt>Package</dt><dd>{pkg.name}<br /><small className="booking-review__muted">{pkg.total_visits} visits, one each month{packagePrice?.label ? ` · ${packagePrice.label}` : ""}</small></dd></div>}
          {(props.sizeLabel || props.registration) && <div><dt>Vehicle</dt><dd>{[props.registration, props.sizeLabel].filter(Boolean).join(" · ")}</dd></div>}
          {pkg ? months.map((month, index) => {
            const slot = index === 0 ? firstSlot : extraVisits[index - 1];
            return <div key={month.from}><dt>Visit {index + 1}</dt><dd>{slot ? when(slot.start_at) : <>{month.label}<br /><small className="booking-review__muted">Book later in your account</small></>}</dd></div>;
          }) : <div><dt>Appointment</dt><dd>{when(firstSlot.start_at)}<br /><small className="booking-review__muted">UK time · Auto Opulence, Unit 7 Consensus House, Norwich NR6 7BW</small></dd></div>}
        </dl>

        <h3>Price</h3>
        <dl className="booking-receipt__details booking-review__prices">
          {pkg && packagePrice ? <>
            <div><dt>{pkg.total_visits} visits × {bookingMoney(perVisit || 0, currency)}</dt><dd>{bookingMoney(packagePrice.amount, currency)}</dd></div>
            {saving > 0 && <div><dt>You save</dt><dd className="booking-review__saving">{bookingMoney(saving, currency)}<br /><small className="booking-review__muted">vs {bookingMoney(props.visitPrice || 0, currency)} per single visit</small></dd></div>}
          </> : <>
            <div><dt>{props.serviceName}{props.sizeLabel ? ` (${props.sizeLabel})` : ""}</dt><dd>{bookingMoney(props.sizePrice ?? props.total, currency)}</dd></div>
            {props.extras.map(extra => <div key={extra.addon_id}><dt>{extra.name}</dt><dd>{bookingMoney(extra.price_adjustment, currency)}</dd></div>)}
          </>}
          <div className="booking-review__total"><dt>Total</dt><dd>{bookingMoney(props.total, currency)}</dd></div>
          {props.deposit > 0 && <div><dt>Balance on the day</dt><dd>{bookingMoney(props.total - props.deposit, currency)}</dd></div>}
          <div className="booking-receipt__order"><dt>Pay today</dt><dd>{bookingMoney(payToday, currency)}</dd></div>
        </dl>

        <h3>Your details</h3>
        <dl className="booking-receipt__details">
          <div><dt>Name</dt><dd>{values.firstName} {values.lastName}</dd></div>
          <div><dt>Email</dt><dd>{values.email}</dd></div>
          <div><dt>Mobile</dt><dd>{values.mobile}</dd></div>
          <div><dt>Address</dt><dd>{[values.address1, values.address2, props.city, props.postcode].filter(Boolean).map((line, i) => <span key={i}>{line}<br /></span>)}</dd></div>
        </dl>

        {pkg && <p className="booking-package-disclaimer"><strong>{PACKAGE_DISCLAIMER}</strong>{later > 0 ? ` After payment, book your remaining ${later} visit${later === 1 ? "" : "s"} in your account — each in its own month.` : ""}</p>}
        {props.error && <p className="booking-form-error" role="alert">{props.error}</p>}
        {props.uncertain && <p className="booking-form-error">Please call us before trying again. We need to check whether the booking was received.</p>}
        <div className="booking-actions">
          <button type="button" className="button booking-review__pay" disabled={props.busy || props.uncertain} onClick={props.onPay}><Lock aria-hidden="true" />{props.busy ? "Preparing secure payment…" : `Pay now · ${bookingMoney(payToday, currency)}`}</button>
          <button type="button" className="button button--ghost" disabled={props.busy} onClick={props.onEdit}>Edit booking</button>
        </div>
        <p className="booking-review__muted">You'll be taken to Stripe's secure checkout. Card, Apple Pay and Google Pay accepted.</p>
      </div>
      <aside className="booking-receipt__support" aria-label="Help with your booking">
        <span className="section-kicker">Here to help</span><h2>Questions before you pay?</h2>
        <p>Our team can check availability, prices or package terms with you.</p>
        <a href="tel:03300536925"><Phone aria-hidden="true" /><span><small>Call our team</small>0330 053 6925</span></a>
        <a href="mailto:valeting@autoopulence.co.uk"><Mail aria-hidden="true" /><span><small>Email us</small>valeting@autoopulence.co.uk</span></a>
        <a href="/contact"><MapPin aria-hidden="true" /><span><small>Visit us</small>Unit 7 Consensus House<br />St Faiths Road<br />Norwich, NR6 7BW</span></a>
      </aside>
    </div>
  </section>;
});
