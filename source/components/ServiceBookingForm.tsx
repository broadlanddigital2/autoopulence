/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CarFront, CheckCircle2, ChevronDown, Eye, EyeOff, MapPin, UserRound } from "lucide-react";
import { bookingPackages, bookingTypes, sizeLabels, type BookingTypeId, type CustomerKind, type VehicleSize } from "@/lib/booking-services";
import { isWeekdayDateKey } from "@/lib/booking-dates";
import { bookingDate, bookingMoney, bookingPaymentCompletePath, pendingBookingKey, productVehicleSize, simplyBookCategoryIds, simplyBookRequest, simplyBookServiceIds, SimplyBookError, type SimplyBookBooking, type SimplyBookCategory, type SimplyBookClient, type SimplyBookInvoice, type SimplyBookPackage, type SimplyBookPaymentSummary, type SimplyBookProduct, type SimplyBookProvider, type SimplyBookService } from "@/lib/simplybook";
import { Calendar } from "@/components/ui/calendar";
import { BookingAddressFields } from "./BookingAddressFields";

const vehicleSizeExamples: Record<VehicleSize, { title: string; description: string; examples: string[] }> = {
  small: { title: "Small car", description: "Compact city cars and short three-door hatchbacks.", examples: ["Fiat 500", "Toyota Aygo", "Volkswagen up!", "MINI 3-Door Hatch", "Ford Ka"] },
  medium: { title: "Medium car", description: "Family hatchbacks and similarly sized compact cars.", examples: ["Ford Focus", "Volkswagen Golf", "Vauxhall Astra", "Audi A3", "BMW 1 Series"] },
  large: { title: "Large car", description: "Longer saloons, estates and medium-sized crossovers.", examples: ["BMW 3 or 5 Series", "Mercedes C or E-Class", "Tesla Model 3", "Skoda Octavia", "Volvo V60"] },
  extraLarge: { title: "Extra-large car", description: "Large SUVs and seven-seat passenger vehicles.", examples: ["Range Rover", "BMW X5", "Volvo XC90", "Mercedes GLE", "Toyota Land Cruiser"] },
};

const message = (error: unknown) => error instanceof Error ? error.message : "Please try again shortly.";
function isLivePackageForOption(livePackage: SimplyBookPackage, option: (typeof bookingPackages)[number], baseServiceId: string) {
  const serviceId = simplyBookServiceIds[baseServiceId];
  return new RegExp(`\\b${option.appointmentCount}\\s*month\\b`, "i").test(livePackage.name)
    && livePackage.services.some(item => Number(item.service_id) === serviceId && Number(item.qty) >= option.appointmentCount);
}
function focusBookingSection(element: HTMLElement | null) {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
}

export function ServiceBookingForm({ initialType, initialServiceId = "" }: { initialType: BookingTypeId; initialServiceId?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const signInPasswordRef = useRef<HTMLInputElement>(null);
  const choicesRef = useRef<HTMLFieldSetElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const submissionLock = useRef(false);
  const [typeId, setTypeId] = useState<BookingTypeId>(initialType);
  const initialService = bookingTypes.find(type => type.id === initialType)?.services.find(service => service.id === initialServiceId);
  const [customerKind, setCustomerKind] = useState<CustomerKind>(initialService?.audience || "public");
  const [serviceId, setServiceId] = useState(initialService?.id || "");
  const [packageId, setPackageId] = useState("");
  const [vehicleSize, setVehicleSize] = useState<VehicleSize>("small");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [error, setError] = useState("");
  const [catalogueError, setCatalogueError] = useState("");
  const [catalogueBusy, setCatalogueBusy] = useState(true);
  const [catalogueRevision, setCatalogueRevision] = useState(0);
  const [liveServices, setLiveServices] = useState<SimplyBookService[]>([]);
  const [liveCategories, setLiveCategories] = useState<SimplyBookCategory[]>([]);
  const [livePackages, setLivePackages] = useState<SimplyBookPackage[]>([]);
  const [bookingTerms, setBookingTerms] = useState<{ policies: { title: string; content: string }[]; simplybook: boolean; accountRequired: boolean }>({ policies: [], simplybook: false, accountRequired: false });
  const [products, setProducts] = useState<SimplyBookProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [providerId, setProviderId] = useState<number>();
  const [loadedServiceId, setLoadedServiceId] = useState<number>();
  const [dates, setDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [slotsBusy, setSlotsBusy] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityRevision, setAvailabilityRevision] = useState(0);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingUncertain, setBookingUncertain] = useState(false);
  const [booking, setBooking] = useState<SimplyBookBooking>();
  const [sessionBusy, setSessionBusy] = useState(true);
  const [previousPaidBooking, setPreviousPaidBooking] = useState(false);
  const [resumedDetails, setResumedDetails] = useState<SimplyBookPaymentSummary["details"]>();
  const [confirmed, setConfirmed] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [client, setClient] = useState<SimplyBookClient | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInStatus, setSignInStatus] = useState("");
  const [signInError, setSignInError] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [accountTermsAccepted, setAccountTermsAccepted] = useState(false);

  const activeType = bookingTypes.find(type => type.id === typeId)!;
  const services = useMemo(() => activeType.services.filter(service => {
    if (typeId === "bay" && service.audience !== customerKind) return false;
    return true;
  }), [activeType, customerKind, typeId]);
  const selectedService = services.find(service => service.id === serviceId);
  const packageOptions = bookingPackages.filter(item => item.baseServiceId === serviceId && livePackages.some(livePackage => isLivePackageForOption(livePackage, item, serviceId)));
  const selectedPackage = packageOptions.find(item => item.id === packageId);
  const selectedPackageName = selectedPackage?.name.split(" — ");
  const appointmentTarget = selectedPackage?.appointmentCount || 1;
  const availabilityMonths = selectedPackage ? 12 : 3;
  const hasSelectedLivePackage = !!selectedPackage && livePackages.some(item => isLivePackageForOption(item, selectedPackage, serviceId));
  const effectiveServiceId = hasSelectedLivePackage ? serviceId : selectedPackage ? selectedPackage.serviceId : serviceId;
  const liveCategory = liveCategories.find(category => simplyBookCategoryIds[typeId].includes(category.id) && category.is_visible && category.services.includes(simplyBookServiceIds[effectiveServiceId]));
  const liveService = liveServices.find(service => service.id === simplyBookServiceIds[effectiveServiceId] && service.is_active && service.is_visible && liveCategory?.services.includes(service.id));
  const deposits = products.filter(item => /deposit/i.test(item.product.name));
  const choices = products.filter(item => !/deposit/i.test(item.product.name));
  const hasSizeChoices = choices.some(item => productVehicleSize(item.product.name));
  const selectedProduct = hasSizeChoices ? choices.find(item => productVehicleSize(item.product.name) === vehicleSize) : choices.find(item => String(item.product.id) === productId);
  const selectedNativePackage = selectedPackage ? livePackages.find(item => isLivePackageForOption(item, selectedPackage, serviceId) && (!selectedProduct || item.paid_attributes.some(attribute => Number(attribute.product_id) === selectedProduct.product.id && Number(attribute.qty) >= selectedPackage.appointmentCount))) : undefined;
  const depositPrice = deposits.reduce((sum, item) => sum + item.product.price * (item.qty || 1), 0);
  const pricePerAppointment = liveService && !availabilityBusy && !availabilityError ? liveService.price + (selectedProduct?.product.price || 0) + depositPrice : undefined;
  const price = selectedNativePackage ? Number(selectedNativePackage.price) : pricePerAppointment === undefined ? undefined : pricePerAppointment * appointmentTarget;
  const displayedPricePerAppointment = selectedNativePackage && Number.isFinite(price) ? (price as number) / appointmentTarget : pricePerAppointment;
  const requiresPriceConfirmation = price !== undefined && price <= 0;
  const needsProduct = choices.length > 0 && !selectedProduct;
  const optionStepNumber = 3 + (packageOptions.length > 0 ? 1 : 0);
  const dateStepNumber = optionStepNumber + (choices.length > 0 ? 1 : 0);
  const detailsStepNumber = dateStepNumber + 1;
  const dateKey = selectedDate ? bookingDate(selectedDate) : "";
  const displayedSlots = slots;
  const formattedDate = selectedDate ? new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(selectedDate) : "";
  const currency = liveService?.currency || "GBP";

  function isBookingDateDisabled(date: Date) {
    const candidate = bookingDate(date);
    if (!isWeekdayDateKey(candidate)) return true;
    return !dates.includes(candidate);
  }

  function fillClient(value: SimplyBookClient) {
    setClient(value);
    const names = value.name.trim().split(/\s+/);
    const values = { firstName: names.shift() || "", lastName: names.join(" "), email: value.email, mobile: value.phone || "", address1: value.address1 || "", address2: value.address2 || "" };
    for (const [name, text] of Object.entries(values)) {
      const field = formRef.current?.elements.namedItem(name);
      if (field instanceof HTMLInputElement) field.value = text;
    }
    setPostcode(value.zip || ""); setCity(value.city || "");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const matchedType = bookingTypes.find(type => type.id === params.get("type"));
    if (matchedType) {
      setTypeId(matchedType.id);
      const service = matchedType.services.find(item => item.id === params.get("service"));
      if (service) {
        setServiceId(service.id); if (service.audience) setCustomerKind(service.audience);
        const requestedPackage = bookingPackages.find(item => item.id === params.get("package") && item.baseServiceId === service.id);
        if (requestedPackage) setPackageId(requestedPackage.id);
      }
      const size = params.get("size");
      if (size && Object.hasOwn(sizeLabels, size)) setVehicleSize(size as VehicleSize);
    }
    const returningFromPayment = params.get("step") === "payment";
    const controller = new AbortController();
    // The encrypted cookie is the source of truth, including in another tab or
    // after browser storage has been cleared. Never restore an old local invoice.
    simplyBookRequest<SimplyBookPaymentSummary>("payment/summary", { signal: controller.signal }).then(summary => {
      if (controller.signal.aborted) return;
      if (summary.paid) {
        try { sessionStorage.removeItem(pendingBookingKey); } catch {}
        if (returningFromPayment) window.location.replace(bookingPaymentCompletePath);
        else setPreviousPaidBooking(true);
        return;
      }
      setBooking({ ...summary.booking, resumed: true }); setResumedDetails(summary.details);
      try { sessionStorage.setItem(pendingBookingKey, JSON.stringify(summary.booking)); } catch {}
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof SimplyBookError && [401, 404].includes(error.status)) {
        try { sessionStorage.removeItem(pendingBookingKey); } catch {}
        if (returningFromPayment) setError(message(error));
      } else {
        setPaymentError(message(error)); setError(message(error));
        if (error instanceof SimplyBookError && error.status === 409) setBookingUncertain(true);
      }
    }).finally(() => { if (!controller.signal.aborted) setSessionBusy(false); });
    simplyBookRequest<SimplyBookClient | null>("client/session", { signal: controller.signal }).then(value => { if (value && !controller.signal.aborted) fillClient(value); }).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (serviceId && !services.some(service => service.id === serviceId)) setServiceId("");
  }, [services, serviceId]);

  useEffect(() => {
    if (packageId && !bookingPackages.some(item => item.id === packageId && item.baseServiceId === serviceId)) setPackageId("");
  }, [packageId, serviceId]);

  useEffect(() => {
    setSelectedDate(undefined); setSelectedTime(""); setCalendarMonth(new Date()); setError("");
  }, [packageId, serviceId]);

  useEffect(() => {
    if (booking?.invoiceId || booking?.bookingCode) focusBookingSection(resultRef.current);
  }, [booking?.invoiceId, booking?.bookingCode]);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogueBusy(true); setCatalogueError("");
    Promise.all([
      simplyBookRequest<SimplyBookService[]>("services", { signal: controller.signal }),
      simplyBookRequest<SimplyBookCategory[]>("categories", { signal: controller.signal }),
      simplyBookRequest<typeof bookingTerms>("terms", { signal: controller.signal }),
      simplyBookRequest<SimplyBookPackage[]>("packages", { signal: controller.signal }),
    ]).then(([services, categories, terms, packages]) => { if (!controller.signal.aborted) {
      setLiveServices(services); setLiveCategories(categories); setLivePackages(packages);
      setBookingTerms({ ...terms, policies: terms.policies.map(policy => ({ ...policy, content: new DOMParser().parseFromString(policy.content, "text/html").body.textContent || "" })) });
    } })
      .catch(error => { if (!controller.signal.aborted) setCatalogueError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setCatalogueBusy(false); });
    return () => controller.abort();
  }, [catalogueRevision]);

  useEffect(() => {
    const controller = new AbortController();
    setProducts([]); setProductId(""); setProviderId(undefined); setLoadedServiceId(undefined); setDates([]); setSlots([]); setSelectedDate(undefined); setSelectedTime(""); setAvailabilityError("");
    if (!liveService) { setAvailabilityBusy(false); return () => controller.abort(); }
    const id = liveService.id;
    setAvailabilityBusy(true);
    Promise.all([
      simplyBookRequest<SimplyBookProduct[]>(`products?serviceId=${id}`, { signal: controller.signal }),
      simplyBookRequest<SimplyBookProvider[]>(`providers?serviceId=${id}`, { signal: controller.signal }),
    ]).then(async ([products, providers]) => {
      if (controller.signal.aborted) return;
      if (!providers.length) throw new Error("No team member is available for this service. Please call us to book.");
      const provider = providers[0].id; // Match the current live form's provider selection.
      setProducts(products); setProviderId(provider);
      const dates = await simplyBookRequest<string[]>(`availability?serviceId=${id}&providerId=${provider}&type=dates&months=${availabilityMonths}`, { signal: controller.signal });
      if (!controller.signal.aborted) { setDates(dates); setLoadedServiceId(id); }
    }).catch(error => { if (!controller.signal.aborted) setAvailabilityError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setAvailabilityBusy(false); });
    return () => controller.abort();
  }, [liveService?.id, availabilityMonths, availabilityRevision]);

  useEffect(() => {
    const controller = new AbortController();
    setSlots([]); setSelectedTime("");
    if (!liveService || !providerId || !dateKey) { setSlotsBusy(false); return () => controller.abort(); }
    setSlotsBusy(true); setAvailabilityError("");
    simplyBookRequest<string[]>(`availability?serviceId=${liveService.id}&providerId=${providerId}&type=slots&date=${dateKey}`, { signal: controller.signal })
      .then(slots => { if (!controller.signal.aborted) setSlots(slots); })
      .catch(error => { if (!controller.signal.aborted) setAvailabilityError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setSlotsBusy(false); });
    return () => controller.abort();
  }, [liveService?.id, providerId, dateKey]);

  async function loadPaymentMethods() {
    setPaymentBusy(true); setPaymentError("");
    try {
      const result = await simplyBookRequest<{ availableMethods: string[] }>("payment/methods");
      setPaymentMethods(result.availableMethods);
      if (!result.availableMethods.length) setPaymentError("Secure Stripe payment is not currently available. Please call us with your booking reference.");
    } catch (error) { setPaymentError(message(error)); } finally { setPaymentBusy(false); }
  }
  useEffect(() => { if (booking?.paymentRequired && !confirmed) void loadPaymentMethods(); }, [booking?.invoiceId, confirmed]);

  function changeType(nextType: BookingTypeId) { setTypeId(nextType); setServiceId(""); setPackageId(""); setSelectedTime(""); setError(""); }

  async function signIn() {
    if (!signInEmail.trim() || !signInPassword) { setSignInError(true); return setSignInStatus("Enter your email address and password."); }
    if (createAccount && (!accountName.trim() || !accountTermsAccepted)) { setSignInError(true); return setSignInStatus("Enter your full name and accept the account terms."); }
    setAuthBusy(true); setSignInStatus(""); setSignInError(false);
    try {
      const value = await simplyBookRequest<SimplyBookClient>(createAccount ? "client/register" : "client/login", { method: "POST", body: JSON.stringify({ email: signInEmail.trim(), password: signInPassword, ...(createAccount ? { name: accountName, phone: accountPhone, acceptedTerms: accountTermsAccepted } : {}) }) });
      fillClient(value); setSignInPassword(""); setSignInOpen(false); setSignInStatus("Signed in. Your booking details have been restored."); setSignInError(false);
    } catch (error) {
      const errorMessage = message(error);
      if (createAccount && /already|exist|registered/i.test(errorMessage)) {
        setCreateAccount(false);
        setSignInStatus("An account already exists for this email. Sign in below or use ‘Forgot password?’.");
      } else setSignInStatus(errorMessage);
      setSignInError(true);
    } finally { setAuthBusy(false); }
  }
  async function remindPassword() {
    if (!signInEmail.trim()) { setSignInError(true); return setSignInStatus("Enter your account email address first."); }
    setAuthBusy(true); setSignInStatus(""); setSignInError(false);
    try {
      await simplyBookRequest("client/remind-password", { method: "POST", body: JSON.stringify({ email: signInEmail.trim() }) });
      setSignInStatus("Password-reset request sent. Please check your email."); setSignInError(false);
    } catch (error) { setSignInStatus(message(error)); setSignInError(true); } finally { setAuthBusy(false); }
  }
  async function signOut() {
    setAuthBusy(true);
    try { await simplyBookRequest("client/logout", { method: "POST", body: "{}" }); setClient(null); setSignInStatus("Signed out."); }
    catch (error) { setSignInStatus(message(error)); } finally { setAuthBusy(false); }
  }

  async function prepareBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLock.current || booking || bookingUncertain || sessionBusy) return;
    if ((bookingTerms.accountRequired || selectedNativePackage) && !client) {
      setSignInOpen(true); setSignInStatus("Please sign in or create a booking account before continuing."); setSignInError(true); setError("");
      requestAnimationFrame(() => focusBookingSection(accountRef.current));
      return;
    }
    if (!liveService || loadedServiceId !== liveService.id || !providerId || availabilityBusy || availabilityError || catalogueBusy) return setError("Wait for the live booking options to load.");
    if (needsProduct) return setError("Please select an available vehicle size or service option.");
    if (requiresPriceConfirmation) return setError("Please call us to confirm the price and book this service.");
    if (!dateKey || !dates.includes(dateKey) || !selectedTime || !slots.includes(selectedTime)) return setError("Please choose an available date and time.");
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name) || "").trim();
    if (!field("firstName") || !field("lastName") || !field("email") || !field("mobile") || !field("vehicleRegistration") || !postcode || !field("address1") || !city) return setError("Please complete your vehicle, contact and address details.");
    if (data.get("acceptedTerms") !== "on") return setError("Please accept the booking terms before continuing.");
    submissionLock.current = true; setBookingBusy(true); setError("");
    try {
      const requestedAppointments = [{ date: dateKey, time: selectedTime }];
      for (const appointment of requestedAppointments) {
        const latest = await simplyBookRequest<string[]>(`availability?serviceId=${liveService.id}&providerId=${providerId}&type=slots&date=${appointment.date}`);
        if (!latest.includes(appointment.time)) throw new Error(`${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }).format(new Date(`${appointment.date}T12:00:00Z`))} at ${appointment.time.slice(0, 5)} is no longer available. Choose another first appointment.`);
      }
      let result: SimplyBookBooking;
      try {
        result = selectedNativePackage
          ? await simplyBookRequest<SimplyBookBooking>("package/purchase", { method: "POST", body: JSON.stringify({
              packageId: selectedNativePackage.id,
              startDate: dateKey,
              appointment: { serviceId: liveService.id, providerId, date: dateKey, time: selectedTime, productId: selectedProduct?.product.id, vehicleRegistration: field("vehicleRegistration") },
            }) })
          : await simplyBookRequest<SimplyBookBooking>("book", { method: "POST", body: JSON.stringify({
              serviceId: liveService.id, providerId, appointments: requestedAppointments, durationMinutes: liveService.duration,
              acceptedTerms: data.get("acceptedTerms") === "on", vehicleRegistration: field("vehicleRegistration"),
              clientData: { name: `${field("firstName")} ${field("lastName")}`, email: field("email"), phone: field("mobile"), address1: field("address1"), address2: field("address2"), city, zip: postcode.trim().toUpperCase() },
              products: [...deposits.map(item => ({ productId: item.product.id, qty: item.qty || 1 })), ...(selectedProduct ? [{ productId: selectedProduct.product.id, qty: 1 }] : [])],
            }) });
      } catch (error) {
        if (error instanceof SimplyBookError && error.status === 401) {
          setClient(null); setSignInOpen(true); setSignInPassword(""); setSignInError(true);
          setSignInStatus(selectedNativePackage ? "Your account session ended. Sign in again to purchase this package." : "Your account session ended. Sign in again or continue as a guest.");
        }
        if (error instanceof SimplyBookError && (error.status === 0 || error.status >= 500)) setBookingUncertain(true);
        throw error;
      }
      if ((selectedNativePackage ? !result.invoiceId : !result.bookingCode) || (result.paymentRequired && !result.invoiceId)) { setBookingUncertain(true); throw new Error("Please call us to check your booking before submitting again. The confirmation was incomplete."); }
      setBooking(result); setConfirmed(!result.paymentRequired);
      if (result.resumed || (selectedNativePackage && !result.paymentRequired)) simplyBookRequest<SimplyBookPaymentSummary>("payment/summary").then(summary => { setResumedDetails(summary.details); setBooking({ ...summary.booking, resumed: result.resumed }); }).catch(() => {});
      if (result.paymentRequired) { try { sessionStorage.setItem(pendingBookingKey, JSON.stringify(result)); } catch {} }
    } catch (error) { setError(message(error)); }
    finally { submissionLock.current = false; setBookingBusy(false); }
  }

  async function checkPayment() {
    if (!booking?.invoiceId) return;
    setPaymentBusy(true); setPaymentError("");
    try {
      const invoice = await simplyBookRequest<SimplyBookInvoice>(`payment/invoice-status?invoiceId=${booking.invoiceId}`);
      if (invoice.paid) window.location.assign(bookingPaymentCompletePath);
      else setPaymentError("Payment has not been confirmed yet. Complete checkout, then check again. If you have paid, please contact us with your booking reference.");
    } catch (error) { setPaymentError(message(error)); } finally { setPaymentBusy(false); }
  }
  async function startPayment(system: string) {
    if (!booking?.invoiceId || paymentBusy) return;
    setPaymentBusy(true); setPaymentError(""); setPaymentUrl("");
    try {
      const result = await simplyBookRequest<{ redirect_url?: string }>("payment/pay", { method: "POST", body: JSON.stringify({ invoiceId: booking.invoiceId, system }) });
      if (result.redirect_url) {
        const url = new URL(result.redirect_url);
        if (url.protocol !== "https:") throw new Error("The payment link could not be verified. Please call us with your booking reference.");
        setPaymentUrl(url.href);
        window.location.assign(url.href);
      } else {
        const invoice = await simplyBookRequest<SimplyBookInvoice>(`payment/invoice-status?invoiceId=${booking.invoiceId}`);
        if (invoice.paid) window.location.assign(bookingPaymentCompletePath);
        else throw new Error("Stripe has not confirmed payment. Your booking remains incomplete and must not be treated as confirmed.");
      }
    } catch (error) { setPaymentError(message(error)); } finally { setPaymentBusy(false); }
  }
  async function cancelPendingPackage() {
    if (!booking?.invoiceId || booking.orderType !== "package" || paymentBusy) return;
    if (!window.confirm("Cancel this unpaid package order and return to package selection?")) return;
    setPaymentBusy(true); setPaymentError("");
    try {
      await simplyBookRequest<{ cancelled: boolean }>("payment/cancel", { method: "POST", body: JSON.stringify({ invoiceId: booking.invoiceId }) });
      try { sessionStorage.removeItem(pendingBookingKey); } catch {}
      setBooking(undefined); setConfirmed(false); setResumedDetails(undefined); setPaymentMethods([]); setPaymentUrl(""); setPackageId(""); setSelectedDate(undefined); setSelectedTime(""); setError("");
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (error) { setPaymentError(message(error)); } finally { setPaymentBusy(false); }
  }

  if (booking) return <div className="simplybook-result" id="complete-payment" ref={resultRef} tabIndex={-1} role="region" aria-labelledby="booking-payment-heading">
    <span className="section-kicker">{confirmed ? booking.orderType === "package" ? "Package purchased" : "Booking received" : "Finish your booking"}</span>
    <h3 id="booking-payment-heading">{confirmed ? booking.orderType === "package" ? "Thank you. Your package is active." : "Thank you. Your booking has been received." : "Complete your payment."}</h3>
    {booking.resumed && <p>We’ve reopened your existing booking so you can finish payment below.</p>}
    {booking.vehicleRegistration && <p>Vehicle registration: <strong className="vehicle-registration-plate">{booking.vehicleRegistration}</strong></p>}
    <p>{booking.orderType === "package" ? "Package order" : booking.appointmentCount && booking.appointmentCount > 1 ? `${booking.appointmentCount} appointments reserved` : "Booking reference"}: <strong>{booking.orderType === "package" ? booking.invoiceNumber || booking.invoiceId : booking.bookingCodes?.join(", ") || booking.bookingCode}</strong>{booking.orderType !== "package" && booking.invoiceNumber ? ` · Invoice ${booking.invoiceNumber}` : ""}</p>
    {booking.orderType === "package" && booking.packageName && <p><strong>{booking.packageName}</strong><br />Your selected first visit will be reserved as soon as payment is confirmed.</p>}
    {booking.bookingDates && booking.bookingDates.length > 1 && <ol className="simplybook-recurring-dates" aria-label="Reserved recurring appointments">{booking.bookingDates.map((dateTime, index) => { const [date, time = ""] = dateTime.split(" "); return <li key={`${dateTime}-${index}`}><span>{index + 1}</span><strong>{new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date(`${date}T12:00:00Z`))}</strong><small>{time.slice(0, 5)} · UK time</small></li>; })}</ol>}
    {resumedDetails && <p><strong>{resumedDetails.serviceName}</strong><br />{resumedDetails.appointmentCount && resumedDetails.appointmentCount > 1 ? `First of ${resumedDetails.appointmentCount} appointments: ` : ""}{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date(`${resumedDetails.date}T12:00:00Z`))} at {resumedDetails.time.slice(0, 5)} · UK time</p>}
    {confirmed ? <p>{booking.orderType === "package" ? booking.firstAppointmentMessage || "Your package credits are available in your customer account." : "We’ll email your appointment status. Keep your booking reference for any questions or changes."}</p> : <>
      {booking.invoiceAmount !== undefined && <p>Amount due: <strong>{bookingMoney(booking.invoiceAmount, booking.currency)}</strong></p>}
      {paymentBusy && <p role="status">Checking your payment options…</p>}
      <div className="simplybook-actions">{paymentMethods.map(system => <button type="button" className="button button--lime" disabled={paymentBusy} onClick={() => startPayment(system)} key={system}>{system.toLowerCase().includes("stripe") ? "Pay securely with Stripe" : `Pay with ${system}`}</button>)}</div>
      {paymentUrl && <div className="simplybook-checkout"><a className="button button--lime" href={paymentUrl}>Continue to secure checkout ↗</a><p>You’ll return to this website after checkout to see your payment status and booking details.</p></div>}
      <div className="simplybook-actions"><button type="button" className="button button--ghost" disabled={paymentBusy} onClick={checkPayment}>Check payment status</button>{!paymentMethods.length && <button type="button" className="button button--ghost" disabled={paymentBusy} onClick={loadPaymentMethods}>Reload payment options</button>}{booking.orderType === "package" && <button type="button" className="button button--cancel" disabled={paymentBusy} onClick={cancelPendingPackage}>Cancel package order</button>}</div>
      {paymentError && <p className="booking-form-error" role="alert">{paymentError}</p>}
      <p>{booking.orderType === "package" ? "Your package order has been created. Complete Stripe payment now to activate the package and reserve the first visit. Unpaid reservations are cancelled automatically." : "Your booking has been created. Complete Stripe payment now to confirm it. Unpaid reservations are cancelled automatically."}</p>
    </>}
    <a href="tel:03300536925">Booking help: 0330 053 6925</a>
  </div>;

  return <form className="service-booking-form" onSubmit={prepareBooking} ref={formRef}>
    <div className="booking-form-main">
      <div className="booking-account" ref={accountRef} tabIndex={-1}>
        <div className="booking-account-prompt"><UserRound aria-hidden="true" /><span>{client ? `Signed in as ${client.name}` : selectedNativePackage || bookingTerms.accountRequired ? "Sign in or create an account to book" : "Already have a booking account?"}</span>{client ? <button type="button" disabled={authBusy} onClick={signOut}>Sign out</button> : <button type="button" aria-expanded={signInOpen} aria-controls="booking-sign-in" onClick={() => { setSignInOpen(open => !open); setSignInStatus(""); setSignInError(false); }}>{signInOpen ? "Close" : "Sign in / register"}</button>}</div>
        {signInOpen && !client && <section className="booking-sign-in" id="booking-sign-in" aria-label="Customer account sign in" onKeyDown={event => {
          if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
          event.preventDefault(); event.stopPropagation();
          if (event.target.type === "email") signInPasswordRef.current?.focus({ preventScroll: true });
          else if (!authBusy) void signIn();
        }}>
          <div className="booking-sign-in__heading"><strong>{createAccount ? "Create your booking account" : "Sign in to your booking account"}</strong><span>{selectedNativePackage ? "A customer account is needed so your prepaid package visits can be stored and managed." : bookingTerms.accountRequired ? "Use your Auto Opulence booking account to manage your appointment." : "Sign in, create an account or continue as a guest below."}</span></div>
          <div className="booking-sign-in__fields">
            {createAccount && <><label className="booking-field"><span>Full name</span><input value={accountName} onChange={event => setAccountName(event.target.value)} autoComplete="name" maxLength={200} /></label><label className="booking-field"><span>Phone number</span><input type="tel" value={accountPhone} onChange={event => setAccountPhone(event.target.value)} autoComplete="tel" maxLength={30} /></label></>}
            <label className="booking-field"><span>Email address</span><input type="email" value={signInEmail} onChange={event => setSignInEmail(event.target.value)} autoComplete="username" /></label>
            <label className="booking-field"><span>Password</span><span className="booking-password-input"><input ref={signInPasswordRef} type={showSignInPassword ? "text" : "password"} value={signInPassword} onChange={event => setSignInPassword(event.target.value)} autoComplete={createAccount ? "new-password" : "current-password"} maxLength={1024} /><button type="button" aria-label={showSignInPassword ? "Hide password" : "Show password"} aria-pressed={showSignInPassword} onClick={() => setShowSignInPassword(value => !value)}>{showSignInPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></span></label>
          </div>
          {createAccount && <>{bookingTerms.policies.map(policy => <details className="booking-service-note" key={policy.title}><summary>{policy.title}</summary><p style={{ whiteSpace: "pre-wrap" }}>{policy.content}</p></details>)}<label className="booking-consent"><input type="checkbox" checked={accountTermsAccepted} onChange={event => setAccountTermsAccepted(event.target.checked)} /><span>I agree to any terms shown above and to my details being used to create and manage my booking account.{bookingTerms.simplybook && <> I accept the <a href="https://simplybook.me/en/terms-and-conditions" target="_blank" rel="noopener noreferrer">booking-platform terms</a>.</>}</span></label></>}
          <div className="booking-sign-in__actions"><button type="button" className="button button--lime" disabled={authBusy || catalogueBusy || !!catalogueError} onClick={signIn}>{authBusy ? "Please wait…" : createAccount ? "Create account" : "Sign in"}</button><button type="button" disabled={authBusy} onClick={() => { setCreateAccount(value => !value); setSignInStatus(""); setSignInError(false); setSignInPassword(""); }}>{createAccount ? "I already have an account" : "Create an account"}</button>{!createAccount && <button type="button" className="booking-forgot-password" disabled={authBusy} onClick={remindPassword}>Forgot password?</button>}</div>
        </section>}
        {signInStatus && <p className={`booking-sign-in__status${signInError ? " is-error" : ""}`} role={signInError ? "alert" : "status"}>{signInStatus}</p>}
        {client && <button type="button" className="button button--lime booking-account-continue" onClick={() => focusBookingSection(choicesRef.current)}>Continue to Booking</button>}
      </div>
      {sessionBusy && <p role="status">Checking for an existing booking…</p>}
      {previousPaidBooking && <p className="booking-service-note">Your previous booking is paid. You can book another appointment below or <a href={bookingPaymentCompletePath}>view your payment confirmation</a>.</p>}
      {catalogueBusy && <p role="status">Loading live booking options…</p>}
      {catalogueError && <div className="booking-form-error" role="alert"><p>{catalogueError}</p><button type="button" className="button button--ghost" onClick={() => setCatalogueRevision(value => value + 1)}>Try again</button></div>}
      <fieldset id="booking-choices" ref={choicesRef} tabIndex={-1} disabled={bookingBusy || bookingUncertain}>
        <legend><span>01</span> Select category</legend>
        <div className="booking-type-options">{bookingTypes.map(type => <label className={typeId === type.id ? "is-selected" : ""} key={type.id}><input type="radio" name="bookingType" value={type.id} checked={typeId === type.id} onChange={() => changeType(type.id)} /><strong>{type.label}</strong></label>)}</div>
      </fieldset>
      {typeId === "bay" && <fieldset disabled={bookingBusy || bookingUncertain}><legend>Trade or general public?</legend><div className="booking-audience-options">{(["public", "trade"] as CustomerKind[]).map(kind => <label className={customerKind === kind ? "is-selected" : ""} key={kind}><input type="radio" name="customerKind" checked={customerKind === kind} onChange={() => { setCustomerKind(kind); setServiceId(""); setPackageId(""); }} /><strong>{kind === "trade" ? "Trade" : "General public"}</strong></label>)}</div></fieldset>}
      <fieldset disabled={bookingBusy || bookingUncertain}>
        <legend><span>02</span> Select service</legend>
        <label className="booking-field"><span>Service type</span><select value={serviceId} onChange={event => { setServiceId(event.target.value); setPackageId(""); setError(""); }} required><option value="">Choose a service</option>{services.map(service => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label>
        {selectedService?.note && <p className="booking-service-note">{selectedService.note}</p>}
        {selectedService && !catalogueBusy && !catalogueError && !liveService && <p className="booking-form-error">Online booking is not available for this service. Please <a href="tel:03300536925">call 0330 053 6925</a>.</p>}
        {availabilityBusy && <p role="status">Loading live prices and availability…</p>}
        {availabilityError && <div className="booking-form-error" role="alert"><p>{availabilityError}</p><button type="button" className="button button--ghost" onClick={() => setAvailabilityRevision(value => value + 1)}>Reload availability</button></div>}
      </fieldset>
      {selectedService && packageOptions.length > 0 && <fieldset disabled={bookingBusy || bookingUncertain}>
        <legend><span>03</span> Choose single service or package</legend>
        <div className="booking-package-options">
          <label className={!packageId ? "is-selected" : ""}><input type="radio" name="bookingPackage" value="base" checked={!packageId} onChange={() => { setPackageId(""); setError(""); }} /><span>Single option</span><strong>Single service</strong><small>{selectedService.name} as one appointment at the standard vehicle-size price.</small></label>
          {packageOptions.map(item => { const variants = livePackages.filter(value => isLivePackageForOption(value, item, serviceId)); const fromPrice = variants.length ? Math.min(...variants.map(value => Number(value.price))) : undefined; return <label className={packageId === item.id ? "is-selected" : ""} key={item.id}><input type="radio" name="bookingPackage" value={item.id} checked={packageId === item.id} onChange={() => { setPackageId(item.id); setError(""); }} /><span>{item.term}</span><strong>{item.name}</strong><small>{fromPrice !== undefined ? `From ${bookingMoney(fromPrice, variants[0]?.currency)} package total · ${item.appointmentCount} prepaid visits.` : ""}</small></label>; })}
        </div>
      </fieldset>}
      {hasSizeChoices && <fieldset disabled={bookingBusy || bookingUncertain || availabilityBusy}>
        <legend><span>{String(optionStepNumber).padStart(2, "0")}</span> Select vehicle size</legend>
        <div className="booking-size-options">{(Object.keys(sizeLabels) as VehicleSize[]).map(size => {
          const product = choices.find(item => productVehicleSize(item.product.name) === size);
          const matchingPackage = selectedPackage && product ? livePackages.find(item => isLivePackageForOption(item, selectedPackage, serviceId) && item.paid_attributes.some(attribute => Number(attribute.product_id) === product.product.id && Number(attribute.qty) >= selectedPackage.appointmentCount)) : undefined;
          const includedInPackage = !!selectedPackage && !!matchingPackage;
          return <label className={vehicleSize === size ? "is-selected" : ""} key={size}><input type="radio" name="vehicleSize" value={size} checked={vehicleSize === size} disabled={!product || (!!selectedPackage && !matchingPackage)} onChange={() => { setVehicleSize(size); setSizeGuideOpen(true); }} /><strong>{sizeLabels[size]}</strong><small>{includedInPackage ? `${bookingMoney(Number(matchingPackage.price), matchingPackage.currency)} package total` : product && liveService ? bookingMoney(liveService.price + product.product.price, currency) : "Not available online"}</small></label>;
        })}</div>
        <div className={`vehicle-size-guide ${sizeGuideOpen ? "is-open" : ""}`}>
          <button className="vehicle-size-guide__toggle" type="button" aria-expanded={sizeGuideOpen} aria-controls="vehicle-size-guide-panel" onClick={() => setSizeGuideOpen((open) => !open)}>
            <span><CarFront aria-hidden="true" /><span><strong>Which vehicle size should I choose?</strong><small>View common examples for each price category</small></span></span><ChevronDown aria-hidden="true" />
          </button>
          {sizeGuideOpen && <div className="vehicle-size-guide__panel" id="vehicle-size-guide-panel">
            <div className="vehicle-size-guide__grid">{(Object.keys(vehicleSizeExamples) as VehicleSize[]).map((size, index) => { const item = vehicleSizeExamples[size]; return <article className={vehicleSize === size ? `vehicle-size-guide__card vehicle-size-guide__card--${size} is-selected` : `vehicle-size-guide__card vehicle-size-guide__card--${size}`} key={size}>
              <button type="button" aria-pressed={vehicleSize === size} onClick={() => setVehicleSize(size)}><span className="vehicle-size-guide__icon"><CarFront aria-hidden="true" /></span><span className="vehicle-size-guide__number">{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong></button><small>{item.description}</small><ul>{item.examples.map((example) => <li key={example}>{example}</li>)}</ul>
            </article>; })}</div>
            <p><strong>Not sure?</strong> Choose the closest example or call <a href="tel:03300536925">0330 053 6925</a>. The team will confirm the vehicle category before your booking is finalised.</p>
          </div>}
        </div>
      </fieldset>}
      {!hasSizeChoices && choices.length > 0 && <fieldset disabled={bookingBusy || bookingUncertain}><legend><span>{String(optionStepNumber).padStart(2, "0")}</span> Select service option</legend><label className="booking-field"><span>Option</span><select value={productId} onChange={event => setProductId(event.target.value)} required><option value="">Choose an option</option>{choices.map(item => <option key={item.product.id} value={item.product.id}>{item.product.name} — {bookingMoney((liveService?.price || 0) + item.product.price, currency)}</option>)}</select></label></fieldset>}
      {depositPrice > 0 && <p className="booking-service-note">A {bookingMoney(depositPrice, currency)} damage deposit is included. It is refundable subject to the hire conditions.</p>}
      {requiresPriceConfirmation && <p className="booking-form-error">The price for this service needs confirming. Please <a href="tel:03300536925">call 0330 053 6925</a> to book.</p>}
      <fieldset disabled={bookingBusy || bookingUncertain || !liveService || availabilityBusy || requiresPriceConfirmation}>
        <legend><span>{String(dateStepNumber).padStart(2, "0")}</span> {selectedNativePackage ? "First package visit" : selectedPackage ? "First recurring appointment" : "Date and time"}</legend>
        {selectedNativePackage && <div className="booking-appointment-count" role="status"><span>{appointmentTarget}</span><div><strong>{appointmentTarget} prepaid visits included</strong><small>Choose the first visit now. It will be reserved after payment, and the remaining visits can be booked from your customer account.</small></div></div>}
        {selectedPackage && !selectedNativePackage && <div className="booking-appointment-count" role="status"><span>{appointmentTarget}</span><div><strong>All {appointmentTarget} appointments are booked together</strong><small>Choose the first appointment. Our booking system will reserve the complete recurring series at 30-day intervals and move weekends or unavailable dates to the next available weekday.</small></div></div>}
        <div className="booking-date-time">
          <div className="booking-calendar"><span className="booking-control-label">{selectedPackage ? "Select first appointment" : "Select date"}</span><Calendar mode="single" month={calendarMonth} onMonthChange={setCalendarMonth} selected={selectedDate} onSelect={date => { setSelectedDate(date); setSelectedTime(""); setError(""); }} disabled={isBookingDateDisabled} showOutsideDays={false} /></div>
          <div className="booking-time-panel"><span className="booking-control-label">Available times · Monday to Friday · UK time</span>{slotsBusy ? <p role="status">Checking available times…</p> : selectedDate ? displayedSlots.length ? <div className="booking-time-options">{displayedSlots.map(time => <button type="button" className={selectedTime === time ? "is-selected" : ""} aria-pressed={selectedTime === time} onClick={() => { setSelectedTime(time); setError(""); }} key={time}>{time.slice(0, 5)}</button>)}</div> : <p>No times are available on this date. Please choose another day.</p> : <div className="booking-time-empty"><CalendarDays aria-hidden="true" /><strong>{liveService ? "Choose an available date" : "Choose a service first"}</strong><p>{!availabilityBusy && liveService && !dates.length ? "No appointments are currently available online. Please call us." : selectedNativePackage ? "Choose the first prepaid visit. The remaining visits stay in your customer account until you are ready to book them." : selectedPackage ? `Choose the first appointment. Our booking system will reserve all ${appointmentTarget} recurring appointments together.` : "Dates and times come directly from our Monday-to-Friday booking calendar."}</p></div>}</div>
        </div>
        {selectedDate && <div className="booking-selected-slot"><p><strong>{formattedDate}</strong>{selectedTime ? ` at ${selectedTime.slice(0, 5)}` : " — now choose a time"}</p></div>}
      </fieldset>
      <fieldset disabled={bookingBusy || bookingUncertain}>
        <legend><span>{String(detailsStepNumber).padStart(2, "0")}</span> Your details</legend>
        <div className="booking-form-grid">
          <label className="booking-field booking-field--registration"><span>Vehicle registration</span><input name="vehicleRegistration" autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text" minLength={2} maxLength={12} placeholder="AB12 CDE" required /></label>
          <label className="booking-field"><span>First name</span><input name="firstName" autoComplete="given-name" maxLength={100} required /></label>
          <label className="booking-field"><span>Last name</span><input name="lastName" autoComplete="family-name" maxLength={100} required /></label>
          <label className="booking-field"><span>Email address</span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <label className="booking-field"><span>Mobile number</span><input name="mobile" type="tel" autoComplete="tel" maxLength={30} required /></label>
        </div>
        <BookingAddressFields postcode={postcode} city={city} onPostcodeChange={setPostcode} onCityChange={setCity} />
        {bookingTerms.policies.map(policy => <details className="booking-service-note" key={policy.title}><summary>{policy.title}</summary><p style={{ whiteSpace: "pre-wrap" }}>{policy.content}</p></details>)}
        <label className="booking-consent"><input type="checkbox" name="acceptedTerms" required /><span>I agree to any booking terms shown above and to my details being shared with our booking provider to process this booking.{bookingTerms.simplybook && <> I also accept the <a href="https://simplybook.me/en/terms-and-conditions" target="_blank" rel="noopener noreferrer">booking-platform terms</a>.</>}</span></label>
      </fieldset>
    </div>
    <aside className="booking-form-summary">
      <span className="section-kicker">Your booking</span><h3 className={selectedPackage ? "booking-summary-package-title" : undefined}><span>{selectedPackageName?.[0] || selectedService?.name || "Select a service"}</span>{selectedPackageName?.[1] && <small>— {selectedPackageName[1]}</small>}</h3>
      <dl className="booking-price-summary"><div><dt>Category</dt><dd>{activeType.label}</dd></div>{typeId === "bay" && <div><dt>Customer</dt><dd>{customerKind === "trade" ? "Trade" : "General public"}</dd></div>}{selectedService && <div><dt>Option</dt><dd>{selectedPackage ? selectedPackage.term : "Single service"}</dd></div>}{selectedNativePackage && <div><dt>Booking now</dt><dd>First of {appointmentTarget} visits</dd></div>}{selectedPackage && !selectedNativePackage && <div><dt>Booking now</dt><dd>All {appointmentTarget} appointments</dd></div>}{hasSizeChoices && <div><dt>Vehicle size</dt><dd>{sizeLabels[vehicleSize]}</dd></div>}{selectedPackage && displayedPricePerAppointment !== undefined && <div><dt>Average per visit</dt><dd>{bookingMoney(displayedPricePerAppointment, selectedNativePackage?.currency || currency)}</dd></div>}{depositPrice > 0 && !selectedNativePackage && <div><dt>Included damage deposit</dt><dd>{bookingMoney(depositPrice, currency)}</dd></div>}<div className="booking-price-row"><dt>{selectedNativePackage ? "Package total" : "Booking total"}</dt><dd>{price === undefined || needsProduct ? "—" : requiresPriceConfirmation ? "Please call" : bookingMoney(price, selectedNativePackage?.currency || currency)}</dd></div></dl>
      <button className="button button--lime" type="submit" disabled={bookingBusy || bookingUncertain || sessionBusy || catalogueBusy || !liveService || availabilityBusy || slotsBusy || !!availabilityError || needsProduct || requiresPriceConfirmation || !selectedTime}>{bookingBusy ? selectedNativePackage ? "Creating package order…" : selectedPackage ? `Booking all ${appointmentTarget} appointments…` : "Creating booking…" : selectedNativePackage ? "Buy package & book first visit" : selectedPackage ? `Book all ${appointmentTarget} appointments` : "Continue to booking"}</button>
      {error && <p className="booking-form-error booking-summary-error" role="alert">{error}</p>}
      {bookingUncertain && <p className="booking-form-error booking-summary-error" role="alert">Please call us before trying again. We need to check whether the booking was received.</p>}
      <ul><li><CarFront aria-hidden="true" /><span><strong>Norwich facility</strong>Unit 7 Consensus House, St Faiths Road, NR6 7BW</span></li><li><CalendarDays aria-hidden="true" /><span><strong>Live availability</strong>Select an available appointment from our live booking calendar.</span></li><li><MapPin aria-hidden="true" /><span><strong>Your details</strong>Sign in to your booking account or continue as a guest.</span></li><li><CheckCircle2 aria-hidden="true" /><span><strong>Secure checkout</strong>Payment options appear after your booking has been created.</span></li></ul>
      <a href="tel:03300536925">Prefer to call? 0330 053 6925</a>
      <p>Review your service, date and details before continuing. If payment is required, complete checkout to confirm your booking.</p>
    </aside>
  </form>;
}
