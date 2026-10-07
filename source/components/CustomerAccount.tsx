"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  LogOut,
  Mail,
  PackageCheck,
  Phone,
  UserRound,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { isWeekdayDateKey } from "@/lib/booking-dates";
import {
  simplyBookRequest,
  type SimplyBookBooking,
  type SimplyBookClient,
  type SimplyBookCustomerDashboard,
  type SimplyBookPackageInstance,
  type SimplyBookProvider,
} from "@/lib/simplybook";

const emptyDashboard: SimplyBookCustomerDashboard = {
  packages: [],
  bookings: [],
};
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Your account could not be loaded.";
const readableDate = (value: string, withTime = false) => {
  if (!value) return "Not supplied";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/London",
  }).format(date);
};
const dateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

export function CustomerAccount() {
  const bookingRef = useRef<HTMLElement>(null);
  const [client, setClient] = useState<SimplyBookClient | null>();
  const [dashboard, setDashboard] =
    useState<SimplyBookCustomerDashboard>(emptyDashboard);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<number>();
  const [serviceId, setServiceId] = useState<number>();
  const [providerId, setProviderId] = useState<number>();
  const [providers, setProviders] = useState<SimplyBookProvider[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const activePackage = useMemo(
    () =>
      dashboard.packages.find((item) => item.instanceId === selectedInstanceId),
    [dashboard.packages, selectedInstanceId],
  );
  const activeService = activePackage?.services.find(
    (item) => item.serviceId === serviceId,
  );
  const activePeriodStart = activePackage?.periodStart || "";
  const activePeriodEnd = activePackage?.periodEnd || "";
  const selectedDate = useMemo(
    () => (date ? new Date(`${date}T12:00:00`) : undefined),
    [date],
  );

  function isPackageDateDisabled(candidate: Date) {
    const candidateKey = dateKey(candidate);
    if (!isWeekdayDateKey(candidateKey)) return true;
    return !dates.includes(candidateKey);
  }

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      setDashboard(
        await simplyBookRequest<SimplyBookCustomerDashboard>(
          "client/dashboard",
        ),
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    simplyBookRequest<SimplyBookClient | null>("client/session", {
      signal: controller.signal,
    })
      .then((value) => {
        if (controller.signal.aborted) return;
        if (!value) window.location.replace("/login?return=/account");
        else {
          setClient(value);
          void loadDashboard();
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      });
    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    const controller = new AbortController();
    setProviders([]);
    setProviderId(undefined);
    setDates([]);
    setDate("");
    setSlots([]);
    setTime("");
    if (!serviceId) return () => controller.abort();
    setAvailabilityBusy(true);
    setError("");
    simplyBookRequest<SimplyBookProvider[]>(
      `providers?serviceId=${serviceId}`,
      { signal: controller.signal },
    )
      .then(async (providers) => {
        if (!providers.length)
          throw new Error(
            "No team member is currently available for this package service.",
          );
        const selectedProvider = providers[0].id;
        setProviders(providers);
        setProviderId(selectedProvider);
        const availableDates = await simplyBookRequest<string[]>(
          `availability?serviceId=${serviceId}&providerId=${selectedProvider}&type=dates&months=12`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          const eligibleDates = availableDates.filter(
            (value) =>
              (!activePeriodStart || value >= activePeriodStart) &&
              (!activePeriodEnd || value <= activePeriodEnd),
          );
          setDates(eligibleDates);
          if (eligibleDates[0])
            setCalendarMonth(new Date(`${eligibleDates[0]}T12:00:00`));
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityBusy(false);
      });
    return () => controller.abort();
  }, [serviceId, activePeriodStart, activePeriodEnd]);

  useEffect(() => {
    const controller = new AbortController();
    setSlots([]);
    setTime("");
    if (!serviceId || !providerId || !date) return () => controller.abort();
    setAvailabilityBusy(true);
    setError("");
    simplyBookRequest<string[]>(
      `availability?serviceId=${serviceId}&providerId=${providerId}&type=slots&date=${date}`,
      { signal: controller.signal },
    )
      .then((value) => {
        if (!controller.signal.aborted) setSlots(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityBusy(false);
      });
    return () => controller.abort();
  }, [serviceId, providerId, date]);

  function choosePackage(item: SimplyBookPackageInstance) {
    if (!item.vehicleRegistration) {
      setError("The vehicle registration could not be verified for this package. Please call 0330 053 6925.");
      return;
    }
    setSelectedInstanceId(item.instanceId);
    setServiceId(item.services[0]?.serviceId);
    setStatus("");
    setError("");
    setAcceptedTerms(false);
    requestAnimationFrame(() =>
      bookingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }),
    );
  }

  async function bookVisit(event: FormEvent) {
    event.preventDefault();
    if (
      !activePackage ||
      !serviceId ||
      !providerId ||
      !date ||
      !time ||
      !activePackage.vehicleRegistration
    )
      return setError(
        "Choose a package service, date and time.",
      );
    if (!acceptedTerms)
      return setError("Please confirm the package booking terms.");
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const result = await simplyBookRequest<
        SimplyBookBooking & { remainingVisits: number }
      >("client/package-book", {
        method: "POST",
        body: JSON.stringify({
          packageInstanceId: activePackage.instanceId,
          serviceId,
          providerId,
          date,
          time,
          acceptedTerms,
        }),
      });
      setStatus(
        `Your prepaid visit is booked. Reference ${result.bookingCode}. ${result.remainingVisits} package visit${result.remainingVisits === 1 ? "" : "s"} remaining.`,
      );
      setSelectedInstanceId(undefined);
      setServiceId(undefined);
      setDate("");
      setTime("");
      setAcceptedTerms(false);
      await loadDashboard();
      requestAnimationFrame(() =>
        bookingRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await simplyBookRequest("client/logout", { method: "POST", body: "{}" });
      window.location.replace("/login");
    } catch (error) {
      setError(errorMessage(error));
      setBusy(false);
    }
  }

  if (client === undefined)
    return (
      <div className="customer-account-loading" role="status">
        Loading your customer account…
      </div>
    );
  if (!client)
    return (
      <div className="customer-account-loading">
        {error || "Opening customer login…"}
      </div>
    );

  return (
    <div className="customer-account-layout">
      <aside className="customer-account-nav">
        <div>
          <UserRound aria-hidden="true" />
          <span>
            <small>Signed in as</small>
            <strong>{client.name}</strong>
          </span>
        </div>
        <nav aria-label="Customer account">
          <a href="#overview">Overview</a>
          <a href="#packages">My packages</a>
          <a href="#appointments">Appointments</a>
          <a href="#details">Account details</a>
          <Link href="/#book">Book a service</Link>
        </nav>
        <button type="button" onClick={logout} disabled={busy}>
          <LogOut size={17} /> {busy ? "Please wait…" : "Logout"}
        </button>
      </aside>
      <main className="customer-account-content" id="overview">
        <p className="kicker">Customer dashboard</p>
        <h1>Welcome back, {client.name.split(" ")[0]}.</h1>
        <p>
          Review every appointment in your recurring service series and manage
          your upcoming vehicle-care bookings.
        </p>
        {error && (
          <p className="customer-auth-message is-error" role="alert">
            {error}
          </p>
        )}
        {status && (
          <p className="customer-auth-message is-success" role="status">
            <CheckCircle2 size={18} /> {status}
          </p>
        )}
        <section
          className="customer-package-section"
          id="packages"
          aria-labelledby="package-title"
        >
          <header>
            <div>
              <p className="kicker">Prepaid services</p>
              <h2 id="package-title">My packages.</h2>
            </div>
          </header>
          {loadingDashboard ? (
            <p role="status">Loading your package balances…</p>
          ) : dashboard.packages.length ? (
            <div className="customer-package-grid">
              {dashboard.packages.map((item) => {
                const progress =
                  item.totalVisits > 0
                    ? Math.min(
                        100,
                        Math.round((item.usedVisits / item.totalVisits) * 100),
                      )
                    : 0;
                return (
                  <article
                    key={item.instanceId}
                    className={item.canBeUsed ? "" : "is-unavailable"}
                  >
                    <div className="customer-package-card__top">
                      <PackageCheck aria-hidden="true" />
                      <span>{item.status}</span>
                    </div>
                    <h3>{item.name}</h3>
                    <p>Valid until {readableDate(item.periodEnd)}</p>
                    {item.vehicleRegistration && <span className="vehicle-registration-plate" aria-label={`Vehicle registration ${item.vehicleRegistration}`}>{item.vehicleRegistration}</span>}
                    <div className="customer-package-balance">
                      <strong>{item.remainingVisits}</strong>
                      <span>
                        visit{item.remainingVisits === 1 ? "" : "s"} remaining
                      </span>
                    </div>
                    <div
                      className="customer-package-progress"
                      aria-label={`${item.usedVisits} of ${item.totalVisits} package visits used`}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <small>
                      {item.usedVisits} used · {item.totalVisits} total
                    </small>
                    <ul>
                      {item.services.map((service) => (
                        <li key={service.serviceId}>
                          <CarFront size={15} />
                          <span>{service.name}</span>
                          <strong>{service.remaining} left</strong>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="button button--lime"
                      type="button"
                      disabled={!item.canBeUsed}
                      onClick={() => choosePackage(item)}
                    >
                      {item.canBeUsed ? (
                        <>
                          Book next visit <ArrowRight size={16} />
                        </>
                      ) : (
                        "No visits available"
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="customer-account-empty">
              <PackageCheck />
              <h3>No active packages found</h3>
              <p>
                When a prepaid package is active in your booking account, its remaining
                visits will appear here automatically.
              </p>
              <Link className="button button--lime" href="/#book">
                View services
              </Link>
            </div>
          )}
        </section>
        <section
          className="customer-package-booker"
          ref={bookingRef}
          tabIndex={-1}
          aria-labelledby="package-booking-title"
        >
          <header>
            <div>
              <p className="kicker">Use a prepaid visit</p>
              <h2 id="package-booking-title">
                Book your next package service.
              </h2>
            </div>
            <button
              className="button button--lime customer-package-book-now"
              type="button"
              disabled={
                loadingDashboard ||
                !dashboard.packages.some((item) => item.canBeUsed)
              }
              onClick={() => {
                const item =
                  activePackage ||
                  dashboard.packages.find(
                    (packageItem) => packageItem.canBeUsed,
                  );
                if (item) choosePackage(item);
              }}
            >
              Book now <ArrowRight size={16} />
            </button>
          </header>
          {activePackage ? (
            <form onSubmit={bookVisit}>
              <div className="customer-package-selected">
                <PackageCheck />
                <span>
                  <small>Selected package</small>
                  <strong>{activePackage.name}</strong>
                  <em>
                    {activePackage.remainingVisits} visit
                    {activePackage.remainingVisits === 1 ? "" : "s"} available
                  </em>
                </span>
              </div>
              <div className="customer-package-booking-grid">
                <label>
                  <span>Package service</span>
                  <select
                    value={serviceId || ""}
                    onChange={(event) =>
                      setServiceId(Number(event.target.value))
                    }
                    required
                  >
                    {activePackage.services.map((service) => (
                      <option key={service.serviceId} value={service.serviceId}>
                        {service.name} — {service.remaining} left
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Team member</span>
                  <select
                    value={providerId || ""}
                    onChange={(event) =>
                      setProviderId(Number(event.target.value))
                    }
                    disabled={availabilityBusy || !providers.length}
                    required
                  >
                    <option value="">Choose</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Vehicle registration</span>
                  <span className="vehicle-registration-plate customer-package-registration" aria-label={`Vehicle registration ${activePackage.vehicleRegistration || "not available"}`}>{activePackage.vehicleRegistration || "Not available"}</span>
                </label>
              </div>
              <div className="booking-date-time customer-package-date-time">
                <div className="booking-calendar">
                  <span className="booking-control-label">
                    Choose an available weekday
                  </span>
                  <Calendar
                    mode="single"
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selected={selectedDate}
                    onSelect={(value) => {
                      setDate(value ? dateKey(value) : "");
                      setTime("");
                      setError("");
                    }}
                    disabled={isPackageDateDisabled}
                    showOutsideDays={false}
                  />
                </div>
                <div className="booking-time-panel">
                  <span className="booking-control-label">
                    Available times · Monday to Friday · UK time
                  </span>
                  {availabilityBusy ? (
                    <p role="status">Checking available times…</p>
                  ) : selectedDate ? (
                    slots.length ? (
                      <div className="booking-time-options">
                        {slots.map((value) => (
                          <button
                            type="button"
                            className={time === value ? "is-selected" : ""}
                            aria-pressed={time === value}
                            onClick={() => {
                              setTime(value);
                              setError("");
                            }}
                            key={value}
                          >
                            {value.slice(0, 5)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="booking-time-empty">
                        <Clock3 aria-hidden="true" />
                        <strong>No times available</strong>
                        <p>
                          Choose another highlighted weekday to see its live
                          times.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="booking-time-empty">
                      <CalendarDays aria-hidden="true" />
                      <strong>Choose a date</strong>
                      <p>
                        Select a highlighted weekday on the calendar to see
                        available times.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {date && (
                <div className="booking-selected-slot" role="status">
                  <p>
                    <strong>{readableDate(date)}</strong>
                    {time
                      ? ` at ${time.slice(0, 5)} · UK time`
                      : " — now choose a time"}
                  </p>
                </div>
              )}
              {!availabilityBusy && serviceId && !dates.length && (
                <p className="customer-auth-message is-error">
                  No online dates are currently available within this package’s
                  valid period.
                </p>
              )}
              <label className="booking-consent">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  required
                />
                <span>
                  I confirm this booking will use one prepaid package credit and
                  that the usual cancellation terms apply.
                </span>
              </label>
              <div className="customer-package-actions">
                <button
                  className="button button--lime"
                  type="submit"
                  disabled={
                    busy || availabilityBusy || !activeService || !date || !time
                  }
                >
                  {busy ? "Booking visit…" : "Book prepaid visit"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInstanceId(undefined);
                    setServiceId(undefined);
                    setError("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="customer-account-empty customer-account-empty--compact">
              <CalendarDays />
              <h3>Select an active package above</h3>
              <p>
                Your live dates and times will appear here. Package visits can
                be booked up to 12 months ahead, Monday to Friday.
              </p>
            </div>
          )}
        </section>
        <section className="customer-appointments" id="appointments">
          <header>
            <p className="kicker">Live schedule</p>
            <h2>Upcoming appointments.</h2>
          </header>
          {loadingDashboard ? (
            <p role="status">Loading appointments…</p>
          ) : dashboard.bookings.length ? (
            <ol>
              {dashboard.bookings.map((booking) => (
                <li key={booking.id}>
                  <CalendarDays />
                  <span>
                    <strong>{booking.serviceName}</strong>
                    <small>
                      {readableDate(booking.start, true)} ·{" "}
                      {booking.providerName}
                    </small>
                    {booking.vehicleRegistration && <b className="vehicle-registration-plate" aria-label={`Vehicle registration ${booking.vehicleRegistration}`}>{booking.vehicleRegistration}</b>}
                  </span>
                  <em>{booking.confirmed ? "Confirmed" : "Pending"}</em>
                  <code>{booking.code}</code>
                </li>
              ))}
            </ol>
          ) : (
            <div className="customer-account-empty customer-account-empty--compact">
              <Clock3 />
              <h3>No upcoming appointments</h3>
              <p>Your next confirmed booking will appear here.</p>
            </div>
          )}
        </section>
        <section className="customer-account-details" id="details">
          <div>
            <p className="kicker">Account details</p>
            <h2>Your contact information.</h2>
          </div>
          <dl>
            <div>
              <dt>
                <UserRound /> Name
              </dt>
              <dd>{client.name}</dd>
            </div>
            <div>
              <dt>
                <Mail /> Email
              </dt>
              <dd>{client.email}</dd>
            </div>
            <div>
              <dt>
                <Phone /> Telephone
              </dt>
              <dd>{client.phone || "Not supplied"}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
