import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});
const { handleSimplyBook, readSession, sealSession } = await vite.ssrLoadModule("/lib/simplybook-server.ts");
const { buildWeekdayPackageDates, isWeekdayDateKey } = await vite.ssrLoadModule("/lib/booking-dates.ts");

after(async () => {
  await vite.close();
});

const config = { company: "package-test", restKey: "public-test-key", rpcKey: "rpc-test-key", secretKey: "secret-test-key", sessionSecret: "test-session-secret" };
const response = (data, status = 200) => Response.json(data, { status });
const londonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

test("books the complete recurring series from the selected first appointment", async () => {
  const appointments = [
    { date: "2026-10-01", time: "10:00:00" },
  ];
  const bookingPayloads = [];
  const timelineRequests = [];
  const apiFetch = async (input, init) => {
    const url = new URL(input);
    if (url.pathname === "/public/auth/token") return response({ token: "public-session" });
    if (url.pathname === "/public/plugins") return response({ data: [] });
    if (url.pathname === "/public/services/item/id/41") return response({ id: 41, name: "Exterior Valet 3 Month Package", price: 38, currency: "GBP", duration: 60, is_active: true, is_visible: true, recurring_settings: { days: 30, repeat_count: 3, type: "fixed", mode: "skip", price_per_session: true } });
    if (url.pathname === "/public/products/service") return response({ data: [{ qty: 0, product: { id: 4, name: "Exterior Valet - Small Car", price: 0, currency: "GBP", duration: 0 } }] });
    if (url.pathname === "/public/providers") return response({ data: [{ id: 3, name: "Auto Opulence" }] });
    if (url.pathname === "/public/clients/terms") return response({ enabled_simplybook_terms: false, enabled_user_terms: false, enabled_cancellation_terms: false, enabled_privacy_policy: false });
    if (url.pathname === "/public/timeline/slots") {
      const date = url.searchParams.get("date_from");
      timelineRequests.push(date);
      const appointment = appointments[0].date === date ? appointments[0] : undefined;
      return response(appointment ? [{ date, slots: [{ time: appointment.time, available_count: 1 }] }] : []);
    }
    if (url.pathname === "/public/invoice" && init.method === "POST") return response({ id: 99, number: "INV-99", amount: 38, currency: "GBP", status: "new" });
    if (url.pathname === "/public/booking/item") {
      bookingPayloads.push(JSON.parse(init.body));
      return response({ bookings: [
        { id: 501, code: "RECURRING-1", is_confirmed: true, start_datetime: "2026-10-01 10:00:00" },
        { id: 502, code: "RECURRING-2", is_confirmed: true, start_datetime: "2026-11-02 10:00:00" },
        { id: 503, code: "RECURRING-3", is_confirmed: true, start_datetime: "2026-12-01 10:00:00" },
      ] });
    }
    if (url.pathname === "/public/invoice/item/id/99") return response({ id: 99, number: "INV-99", amount: 38, currency: "GBP", status: "new" });
    throw new Error(`Unexpected package request: ${url.pathname}`);
  };

  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/book", {
    method: "POST",
    headers: { Origin: "https://example.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: 41,
      providerId: 3,
      vehicleRegistration: "AB12 CDE",
      appointments,
      acceptedTerms: true,
      clientData: { name: "Package Customer", email: "package@example.test", phone: "07123456789", address1: "1 Test Street", address2: "", city: "Norwich", zip: "NR1 1AA" },
      products: [{ productId: 4, qty: 1 }],
    }),
  }), config, apiFetch);

  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.data.appointmentCount, 3);
  assert.deepEqual(body.data.bookingCodes, ["RECURRING-1", "RECURRING-2", "RECURRING-3"]);
  assert.deepEqual(body.data.bookingDates, ["2026-10-01 10:00:00", "2026-11-02 10:00:00", "2026-12-01 10:00:00"]);
  assert.equal(bookingPayloads.length, 1);
  assert.equal(bookingPayloads[0].start_datetime, `${appointments[0].date} ${appointments[0].time}`);
  assert.equal(bookingPayloads[0].invoice_id, 99);
  assert.equal(bookingPayloads[0].service_id, 41);
  assert.equal(bookingPayloads[0].comment, "Vehicle registration: AB12 CDE");
  assert.equal("count" in bookingPayloads[0], false);
  assert.deepEqual(bookingPayloads[0].recurring_settings, { days: 30, repeat_count: 3, type: "fixed", mode: "book_and_move", price_per_session: true });
  assert.deepEqual(timelineRequests, [appointments[0].date]);
});

test("moves package dates to the nearest weekday", () => {
  assert.deepEqual(buildWeekdayPackageDates("2026-10-01", 4, 30), [
    "2026-10-01",
    "2026-10-30",
    "2026-11-30",
    "2026-12-30",
  ]);
  assert.deepEqual(buildWeekdayPackageDates("2026-10-02", 2, 30), ["2026-10-02", "2026-11-02"]);
  assert.equal(isWeekdayDateKey("2026-10-31"), false);
  assert.equal(isWeekdayDateKey("2026-11-01"), false);
  assert.equal(isWeekdayDateKey("2026-11-02"), true);
  assert.equal(isWeekdayDateKey("2026-02-31"), false);
});

test("does not return weekend appointment slots", async () => {
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/availability?serviceId=4&providerId=3&type=slots&date=2026-10-31"), config, async () => {
    throw new Error("Weekend availability should not call SimplyBook");
  });
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).data, []);
});

test("creates signed-in bookings without resubmitting client data to the invoice", async () => {
  const sessionConfig = { company: "package-session-test", restKey: "public-test-key", sessionSecret: "test-session-secret" };
  const appointments = [
    { date: "2026-10-01", time: "10:00:00" },
  ];
  const cookie = await sealSession({ token: "signed-in-client", expires: Date.now() + 60_000, client: true }, sessionConfig);
  let invoicePayload;
  let bookingPayload;
  const apiFetch = async (input, init) => {
    const url = new URL(input);
    const token = init.headers["X-Token"];
    if (url.pathname === "/public/auth/token") return response({ token: "public-session" });
    if (url.pathname === "/public/plugins") return response({ data: [{ key: "client_login", is_active: "1", is_turned_on: "1" }] });
    if (url.pathname === "/public/services/item/id/41") return response({ id: 41, name: "Exterior Valet 3 Month Package", price: 38, currency: "GBP", duration: 60, is_active: true, is_visible: true, recurring_settings: { days: 30, repeat_count: 3, type: "fixed", mode: "skip", price_per_session: true } });
    if (url.pathname === "/public/products/service") return response({ data: [{ qty: 0, product: { id: 4, name: "Exterior Valet - Small Car", price: 0, currency: "GBP", duration: 0 } }] });
    if (url.pathname === "/public/providers") return response({ data: [{ id: 3, name: "Auto Opulence" }] });
    if (url.pathname === "/public/clients/terms") return response({ enabled_simplybook_terms: false, enabled_user_terms: false, enabled_cancellation_terms: false, enabled_privacy_policy: false });
    if (url.pathname === "/public/timeline/slots") return response([{ date: appointments[0].date, slots: [{ time: appointments[0].time, available_count: 1 }] }]);
    if (url.pathname === "/public/invoice" && token === "signed-in-client") { invoicePayload = JSON.parse(init.body); return response({ id: 100, number: "INV-100", amount: 38, currency: "GBP", status: "new" }); }
    if (url.pathname === "/public/booking/item") { bookingPayload = JSON.parse(init.body); return response({ bookings: [{ id: 601, code: "SIGNED-IN-1", is_confirmed: true }, { id: 602, code: "SIGNED-IN-2", is_confirmed: true }, { id: 603, code: "SIGNED-IN-3", is_confirmed: true }] }); }
    if (url.pathname === "/public/invoice/item/id/100") return response({ id: 100, number: "INV-100", amount: 38, currency: "GBP", status: "new" });
    throw new Error(`Unexpected signed-in request: ${url.pathname}`);
  };

  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/book", {
    method: "POST",
    headers: { Origin: "https://example.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", Cookie: `ao_simplybook_session=${cookie}` },
    body: JSON.stringify({
      serviceId: 41,
      providerId: 3,
      vehicleRegistration: "AB12 CDE",
      appointments,
      acceptedTerms: true,
      clientData: { name: "Package Customer", email: "package@example.test", phone: "07123456789", address1: "1 Test Street", address2: "", city: "Norwich", zip: "NR1 1AA" },
      products: [{ productId: 4, qty: 1 }],
    }),
  }), sessionConfig, apiFetch);

  assert.equal(result.status, 200);
  assert.deepEqual(invoicePayload, { terms: { simplybook_terms: false, user_terms: false, cancellation_terms: false, privacy_policy: false, promotion_letters: false } });
  assert.equal("client" in bookingPayload, false);
  assert.equal(bookingPayload.comment, "Vehicle registration: AB12 CDE");
  assert.equal(bookingPayload.recurring_settings.mode, "book_and_move");
  assert.deepEqual((await result.json()).data.bookingCodes, ["SIGNED-IN-1", "SIGNED-IN-2", "SIGNED-IN-3"]);
});

test("shows remaining package credits and upcoming bookings in the customer dashboard", async () => {
  const cookie = await sealSession({ token: "client-token", expires: Date.now() + 60_000, client: true }, config);
  const apiFetch = async input => {
    const url = new URL(input);
    if (url.pathname === "/public/packages/instances") return response({ data: [{
      id: 71, package_id: 9, period_start: "2026-10-01", period_end: "2027-10-01", status: "paid", can_be_used: "0", is_used: "0", count_used_package_instance: 2,
      package: { id: 9, name: "Exterior Valet — 3 Month Package", package_limit: 3 },
      services: [{ id: 1, service_id: 4, qty: 2, name: "Premium Exterior Car Valet", is_visible: "1" }],
    }] });
    if (url.pathname === "/public/booking") return response({ bookings: [
      { booking_id: 55, booking_code: "NEXT-55", is_confirmed: "0", approve_status: "approved", date_start: "2026-10-02 10:00:00", date_end: "2026-10-02 11:00:00", event_id: 4, unit_id: 3, event: "Premium Exterior Car Valet", unit: "Auto Opulence", comment: "Vehicle registration: AB12 CDE" },
      { booking_id: 58, booking_code: "STATUS-58", is_confirmed: "0", approve_status: "pending", status: "confirmed", date_start: "2026-10-05 10:00:00", event_id: 4 },
      { booking_id: 59, booking_code: "PAID-59", is_confirmed: "0", status: "pending", invoice_status: "paid", date_start: "2026-10-06 10:00:00", event_id: 4 },
      { booking_id: 60, booking_code: "RECEIVED-60", is_confirmed: "0", status: "pending", invoice_payment_received: "1", date_start: "2026-10-07 10:00:00", event_id: 4 },
      { booking_id: 61, booking_code: "PENDING-61", is_confirmed: "0", status: "pending", invoice_status: "new", date_start: "2026-10-08 10:00:00", event_id: 4 },
      { booking_id: 62, booking_code: "SERIES-62", is_confirmed: "0", status: "pending", invoice_id: 700, date_start: "2026-10-09 10:00:00", event_id: 4 },
      { booking_id: 63, booking_code: "SERIES-63", is_confirmed: "0", status: "pending", invoice_id: 700, date_start: "2026-10-10 10:00:00", event_id: 4 },
      { booking_id: 64, booking_code: "SERIES-64", is_confirmed: "1", status: "confirmed", invoice_id: 700, invoice_status: "paid", date_start: "2026-10-11 10:00:00", event_id: 4 },
      { booking_id: 56, booking_code: "TIMEOUT-56", is_confirmed: "0", status: "nopayment_cancel", date_start: "2026-10-03 10:00:00", event_id: 4 },
      { booking_id: 57, booking_code: "FAILED-57", is_confirmed: "0", payment_status: "failed", date_start: "2026-10-04 10:00:00", event_id: 4 },
    ] });
    throw new Error(`Unexpected dashboard request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/dashboard", { headers: { Cookie: `ao_simplybook_session=${cookie}` } }), config, apiFetch);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.data.packages[0].remainingVisits, 2);
  assert.equal(body.data.packages[0].totalVisits, 3);
  assert.equal(body.data.packages[0].canBeUsed, true);
  assert.equal(body.data.packages[0].vehicleRegistration, "AB12 CDE");
  assert.equal(body.data.bookings[0].code, "NEXT-55");
  assert.equal(body.data.bookings[0].serviceName, "Premium Exterior Car Valet");
  assert.equal(body.data.bookings[0].confirmed, true);
  assert.equal(body.data.bookings[0].vehicleRegistration, "AB12 CDE");
  assert.deepEqual(body.data.bookings.map(item => [item.code, item.confirmed]), [
    ["NEXT-55", true],
    ["STATUS-58", true],
    ["PAID-59", true],
    ["RECEIVED-60", true],
    ["SERIES-62", true],
    ["SERIES-63", true],
    ["SERIES-64", true],
  ]);
});

test("shows a package-funded appointment as confirmed when its package credit is consumed", async () => {
  const cookie = await sealSession({ token: "client-token", expires: Date.now() + 60_000, client: true }, config);
  const apiFetch = async input => {
    const url = new URL(input);
    if (url.pathname === "/public/packages/instances") return response({ data: [{
      id: 71, package_id: 9, period_start: "2026-10-01", period_end: "2027-10-01", status: "paid", can_be_used: "1", is_used: "0",
      package: { id: 9, name: "Exterior Valet — 3 Month Package", package_limit: 3 },
      services: [{ id: 1, service_id: 4, qty: 2, name: "Premium Exterior Car Valet", is_visible: "1" }],
    }] });
    if (url.pathname === "/public/booking") return response({ bookings: [{
      booking_id: 55, booking_code: "PACKAGE-55", is_confirmed: "0", status: "pending", invoice_status: "new",
      date_start: "2026-10-02 10:00:00", event: { id: 4, name: "Premium Exterior Car Valet" }, unit: { id: 3, name: "Auto Opulence" },
    }] });
    throw new Error(`Unexpected package-confirmation request: ${url.pathname}`);
  };

  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/dashboard", { headers: { Cookie: `ao_simplybook_session=${cookie}` } }), config, apiFetch);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.data.packages[0].usedVisits, 1);
  assert.equal(body.data.bookings[0].code, "PACKAGE-55");
  assert.equal(body.data.bookings[0].confirmed, true);
});

test("recovers upcoming appointments with the client REST upcoming filter", async () => {
  const cookie = await sealSession({ token: "client-token", expires: Date.now() + 60_000, client: true }, config);
  const apiFetch = async input => {
    const url = new URL(input);
    if (url.pathname === "/public/packages/instances") return response({ data: [] });
    if (url.pathname === "/public/booking" && url.searchParams.get("filter[upcoming_only]") === "1") return response({ bookings: [{ id: 89, code: "UPCOMING-89", is_confirmed: true, start_datetime: "2026-10-13 09:00:00", event_id: 4, event_name: "Premium Exterior Car Valet", unit_name: "Auto Opulence" }] });
    if (url.pathname === "/public/booking") return response({ bookings: [{ id: 77, code: "CANCELLED-77", status: "nopayment_cancel", start_datetime: "2026-10-11 09:00:00" }] });
    throw new Error(`Unexpected filtered-dashboard request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/dashboard", { headers: { Cookie: `ao_simplybook_session=${cookie}` } }), config, apiFetch);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.data.bookings.length, 1);
  assert.equal(body.data.bookings[0].code, "UPCOMING-89");
  assert.equal(body.data.bookings[0].confirmed, true);
});

test("recovers upcoming appointments when the REST list only contains cancelled records", async () => {
  const cookie = await sealSession({ token: "client-token", expires: Date.now() + 60_000, client: true, clientIdentity: { id: 44, hash: "client-hash-44" } }, config);
  let clientBookingRequest;
  const apiFetch = async (input, init = {}) => {
    const url = new URL(input);
    if (url.hostname === "user-api-v2.simplybook.it" && url.pathname === "/public/packages/instances") return response({ data: [] });
    if (url.hostname === "user-api-v2.simplybook.it" && url.pathname === "/public/booking") return response({ bookings: [{ id: 77, code: "CANCELLED-77", status: "nopayment_cancel", start_datetime: "2026-10-11 09:00:00" }] });
    if (url.hostname === "user-api.simplybook.me" && url.pathname === "/login") return response({ jsonrpc: "2.0", result: "rpc-token", id: 1 });
    if (url.hostname === "user-api.simplybook.me" && url.pathname === "/") {
      clientBookingRequest = JSON.parse(init.body);
      return response({ jsonrpc: "2.0", result: [{ id: 88, code: "RECOVERED-88", is_confirmed: true, start_datetime: "2026-10-12 09:00:00", event_id: 4, event_name: "Premium Exterior Car Valet", unit_name: "Auto Opulence" }], id: 1 });
    }
    throw new Error(`Unexpected recovered-dashboard request: ${url.hostname}${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/dashboard", { headers: { Cookie: `ao_simplybook_session=${cookie}` } }), config, apiFetch);
  assert.equal(result.status, 200);
  assert.equal(clientBookingRequest.method, "getClientBookings");
  assert.equal(clientBookingRequest.params[0], 44);
  assert.match(clientBookingRequest.params[1], /^[a-f0-9]{32}$/);
  assert.deepEqual(clientBookingRequest.params[2], { upcoming_only: true, confirmed_only: false });
  const body = await result.json();
  assert.equal(body.data.bookings.length, 1);
  assert.equal(body.data.bookings[0].code, "RECOVERED-88");
  assert.equal(body.data.bookings[0].confirmed, true);
});

test("removes cancelled, failed and unpaid packages from the customer dashboard", async () => {
  const cookie = await sealSession({ token: "client-token", expires: Date.now() + 60_000, client: true }, config);
  const apiFetch = async input => {
    const url = new URL(input);
    if (url.pathname === "/public/packages/instances") return response({ data: [
      { id: 71, package_id: 9, status: "paid", period_start: "2026-10-01", period_end: "2027-10-01", is_used: "0", services: [{ service_id: 4, qty: 2, is_visible: "1" }], package: { id: 9, name: "Active package", package_limit: 3 } },
      { id: 72, package_id: 9, status: "cancelled", period_start: "2026-10-01", period_end: "2027-10-01", is_used: "0", services: [{ service_id: 4, qty: 3, is_visible: "1" }], package: { id: 9, name: "Cancelled package", package_limit: 3 } },
      { id: 73, package_id: 9, status: "failed", period_start: "2026-10-01", period_end: "2027-10-01", is_used: "0", services: [{ service_id: 4, qty: 3, is_visible: "1" }], package: { id: 9, name: "Failed package", package_limit: 3 } },
      { id: 74, package_id: 9, status: "new", period_start: "2026-10-01", period_end: "2027-10-01", is_used: "0", services: [{ service_id: 4, qty: 3, is_visible: "1" }], package: { id: 9, name: "Unpaid package", package_limit: 3 } },
    ] });
    if (url.pathname === "/public/booking") return response({ bookings: [] });
    throw new Error(`Unexpected dashboard cleanup request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/dashboard", { headers: { Cookie: `ao_simplybook_session=${cookie}` } }), config, apiFetch);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.deepEqual(body.data.packages.map(item => item.instanceId), [71]);
});

test("hides an orphaned pending booking after its package is removed", async () => {
  const sessionConfig = { company: "package-session-test", restKey: "public-test-key", sessionSecret: "test-session-secret" };
  const cookie = await sealSession({ token: "client-token", expires: Date.now() + 60_000, client: true }, sessionConfig);
  const apiFetch = async input => {
    const url = new URL(input);
    if (url.pathname === "/public/packages/instances") return response({ data: [] });
    if (url.pathname === "/public/booking") return response({ bookings: [{
      booking_id: 61, booking_code: "ORPHAN-61", is_confirmed: "0", status: "pending", invoice_status: "new",
      date_start: "2026-10-08 10:00:00", event_id: 4,
    }] });
    throw new Error(`Unexpected orphaned-booking request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/dashboard", { headers: { Cookie: `ao_simplybook_session=${cookie}` } }), sessionConfig, apiFetch);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.deepEqual(body.data.packages, []);
  assert.deepEqual(body.data.bookings, []);
});

test("shows a newly confirmed first package visit while SimplyBook synchronises", async () => {
  const cookie = await sealSession({
    token: "client-token", expires: Date.now() + 60_000, client: true,
    bookingCode: "FIRST-88", bookingDates: ["2026-10-05 09:00:00"],
    purchase: { packageId: 9, packageName: "Exterior package", startDate: "2026-10-01", firstAppointmentStatus: "booked", firstAppointmentConfirmedAt: Date.now(), pendingAppointment: { serviceId: 4, providerId: 3, date: "2026-10-05", time: "09:00:00", vehicleRegistration: "AB12 CDE" } },
    receipt: { serviceName: "Premium Exterior Car Valet", date: "2026-10-05", time: "09:00:00", appointmentCount: 1, vehicleRegistration: "AB12 CDE", customerName: "Package Customer", customerEmail: "package@example.test", customerPhone: "07123456789" },
  }, config);
  const apiFetch = async input => {
    const url = new URL(input);
    if (url.pathname === "/public/packages/instances") return response({ data: [] });
    if (url.pathname === "/public/booking") return response({ bookings: [] });
    throw new Error(`Unexpected first-visit dashboard request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/dashboard", { headers: { Cookie: `ao_simplybook_session=${cookie}` } }), config, apiFetch);
  const body = await result.json();
  assert.equal(body.data.bookings.length, 1);
  assert.equal(body.data.bookings[0].code, "FIRST-88");
  assert.equal(body.data.bookings[0].confirmed, true);
  assert.equal(body.data.bookings[0].vehicleRegistration, "AB12 CDE");
});

test("does not restore a session booking that SimplyBook marks cancelled", async () => {
  const cookie = await sealSession({
    token: "client-token", expires: Date.now() + 60_000, client: true,
    bookingCode: "FIRST-88", bookingDates: ["2026-10-05 09:00:00"],
    purchase: { packageId: 9, packageName: "Exterior package", startDate: "2026-10-01", firstAppointmentStatus: "booked", firstAppointmentConfirmedAt: Date.now() },
    receipt: { serviceName: "Premium Exterior Car Valet", date: "2026-10-05", time: "09:00:00", appointmentCount: 1, vehicleRegistration: "AB12 CDE", customerName: "Package Customer", customerEmail: "package@example.test", customerPhone: "07123456789" },
  }, config);
  const apiFetch = async input => {
    const url = new URL(input);
    if (url.pathname === "/public/packages/instances") return response({ data: [] });
    if (url.pathname === "/public/booking") return response({ bookings: [{ id: 88, code: "FIRST-88", status: "nopayment_cancel", date_start: "2026-10-05 09:00:00" }] });
    throw new Error(`Unexpected cancelled first-visit request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/dashboard", { headers: { Cookie: `ao_simplybook_session=${cookie}` } }), config, apiFetch);
  assert.deepEqual((await result.json()).data.bookings, []);
});

test("uses one package credit when a signed-in customer books the next visit", async () => {
  const cookie = await sealSession({ token: "client-token", expires: Date.now() + 60_000, client: true }, config);
  let appliedPackage;
  let confirmedBooking;
  let sentEmail;
  const apiFetch = async (input, init) => {
    const url = new URL(input);
    if (url.hostname === "user-api.simplybook.me" && url.pathname === "/login") return response({ jsonrpc: "2.0", result: "rpc-token", id: 1 });
    if (url.hostname === "user-api.simplybook.me" && url.pathname === "/") {
      const request = JSON.parse(init.body);
      confirmedBooking = request;
      return response({ jsonrpc: "2.0", result: true, id: 1 });
    }
    if (url.pathname === "/public/packages/instances") return response({ data: [{ id: 71, package_id: 9, period_start: "2026-10-01", period_end: "2027-10-01", status: "paid", can_be_used: "0", is_used: "0", services: [{ id: 1, service_id: 4, qty: 2, name: "Premium Exterior Car Valet", is_visible: "1" }], package: { id: 9, name: "Exterior package" } }] });
    if (url.pathname === "/public/booking" && init.method === "GET") return response({ bookings: [{ id: 700, service_id: 4, date_start: "2026-10-01 10:00:00", comment: "Vehicle registration: AB12 CDE" }] });
    if (url.pathname === "/public/clients") return response({ name: "Package Customer", email: "package@example.test", phone: "07123456789" });
    if (url.pathname === "/public/auth/token") return response({ token: "public-token" });
    if (url.pathname === "/public/services/item/id/4") return response({ id: 4, name: "Premium Exterior Car Valet", price: 40, currency: "GBP", duration: 60, is_active: true, is_visible: true });
    if (url.pathname === "/public/providers") return response({ data: [{ id: 3, name: "Auto Opulence" }] });
    if (url.pathname === "/public/clients/terms") return response({ enabled_simplybook_terms: false, enabled_user_terms: false, enabled_cancellation_terms: false, enabled_privacy_policy: false });
    // SimplyBook can return HH:MM even when the submitted booking uses
    // HH:MM:SS. Both representations are the same live slot.
    if (url.pathname === "/public/timeline/slots") return response([{ date: "2026-10-02", slots: [{ time: "10:00", available_count: 1 }] }]);
    if (url.pathname === "/public/invoice" && init.method === "POST") return response({ id: 101, number: "INV-101", amount: 0, rest_amount: 0, currency: "GBP", status: "new" });
    if (url.pathname === "/public/booking/item") return response({ require_confirm: true, bookings: [{ id: 701, code: "CREDIT-1", hash: "booking-hash-701", is_confirmed: false }] });
    if (url.pathname === "/public/invoice/package/id/101") { appliedPackage = JSON.parse(init.body); return response({ id: 101, amount: 0, rest_amount: 0, status: "paid" }); }
    if (url.pathname === "/public/invoice/item/id/101") return response({ id: 101, number: "INV-101", amount: 40, rest_amount: 0, currency: "GBP", status: "new" });
    throw new Error(`Unexpected package-credit request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/package-book", {
    method: "POST", headers: { Origin: "https://example.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", Cookie: `ao_simplybook_session=${cookie}` },
    body: JSON.stringify({ packageInstanceId: 71, serviceId: 4, providerId: 3, date: "2026-10-02", time: "10:00", vehicleRegistration: "AB12 CDE", acceptedTerms: true }),
  }), { ...config, sendBookingEmail: async details => { sentEmail = details; } }, apiFetch);
  assert.equal(result.status, 200);
  assert.deepEqual(appliedPackage, { package_instance_id: 71 });
  const body = await result.json();
  assert.equal(body.data.bookingCode, "CREDIT-1");
  assert.equal(body.data.remainingVisits, 1);
  assert.equal(body.data.paymentRequired, false);
  assert.equal(confirmedBooking.method, "confirmBookingPayment");
  assert.deepEqual(confirmedBooking.params.slice(0, 2), [701, "Package"]);
  assert.match(confirmedBooking.params[2], /^[a-f0-9]{32}$/);
  assert.equal(sentEmail.bookingCode, "CREDIT-1");
  assert.equal(sentEmail.vehicleRegistration, "AB12 CDE");
});

test("releases a provisional slot when package credit cannot be applied", async () => {
  const cookie = await sealSession({ token: "client-token", expires: Date.now() + 60_000, client: true }, config);
  const cancelled = [];
  const apiFetch = async (input, init = {}) => {
    const url = new URL(input);
    if (url.pathname === "/public/packages/instances") return response({ data: [{ id: 71, package_id: 9, period_start: "2026-10-01", period_end: "2027-10-01", status: "paid", is_used: "0", services: [{ service_id: 4, qty: 2, is_visible: "1" }], package: { id: 9, name: "Exterior package" } }] });
    if (url.pathname === "/public/booking" && init.method === "GET") return response({ bookings: [{ id: 700, service_id: 4, date_start: "2026-10-01 10:00:00", comment: "Vehicle registration: AB12 CDE" }] });
    if (url.pathname === "/public/clients") return response({ name: "Package Customer", email: "package@example.test", phone: "07123456789" });
    if (url.pathname === "/public/auth/token") return response({ token: "public-token" });
    if (url.pathname === "/public/services/item/id/4") return response({ id: 4, name: "Premium Exterior Car Valet", duration: 60, is_active: true, is_visible: true });
    if (url.pathname === "/public/providers") return response({ data: [{ id: 3, name: "Auto Opulence" }] });
    if (url.pathname === "/public/clients/terms") return response({ enabled_simplybook_terms: false, enabled_user_terms: false, enabled_cancellation_terms: false, enabled_privacy_policy: false });
    if (url.pathname === "/public/timeline/slots") return response([{ date: "2026-10-02", slots: [{ time: "10:00:00", available_count: 1 }] }]);
    if (url.pathname === "/public/invoice") return response({ id: 101, number: "INV-101", status: "new" });
    if (url.pathname === "/public/booking/item" && init.method === "POST") return response({ bookings: [{ id: 701, code: "PROVISIONAL-1", is_confirmed: true }] });
    if (url.pathname === "/public/invoice/package/id/101") return response({ error: "Package is no longer valid" }, 409);
    if (url.pathname === "/public/booking/item/id/701" && init.method === "DELETE") { cancelled.push(701); return new Response(null, { status: 204 }); }
    throw new Error(`Unexpected package cleanup request: ${init.method} ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/package-book", {
    method: "POST", headers: { Origin: "https://example.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", Cookie: `ao_simplybook_session=${cookie}` },
    body: JSON.stringify({ packageInstanceId: 71, serviceId: 4, providerId: 3, date: "2026-10-02", time: "10:00", vehicleRegistration: "AB12 CDE", acceptedTerms: true }),
  }), config, apiFetch);
  assert.equal(result.status, 409);
  assert.deepEqual(cancelled, [701]);
});

test("creates a native package purchase invoice for a signed-in customer", async () => {
  const purchaseConfig = { company: "package-purchase-test", restKey: "public-test-key", sessionSecret: "test-session-secret" };
  const cookie = await sealSession({ token: "signed-in-client", expires: Date.now() + 60_000, client: true }, purchaseConfig);
  let packagePayload;
  let invoicePayload;
  const packageRecord = { id: 2, name: "Exterior Valet - 3 Month Package", price: 263, currency: "GBP", duration: 1, duration_type: "year", package_limit: 3, can_be_purchased: true, is_active: true, is_visible: true, services: [{ id: 13, service_id: 4, qty: 3, name: "Exterior Car Valet", is_visible: true }], paid_attributes: [{ id: 22, product_id: 4, qty: 3, name: "Exterior Valet - Small Car", is_visible: true }] };
  const apiFetch = async (input, init) => {
    const url = new URL(input);
    if (url.pathname === "/public/auth/token") return response({ token: "public-token" });
    if (url.pathname === "/public/packages") return response({ data: [packageRecord] });
    if (url.pathname === "/public/clients/terms") return response({ enabled_simplybook_terms: false, enabled_user_terms: false, enabled_cancellation_terms: false, enabled_privacy_policy: false });
    if (url.pathname === "/public/invoice" && init.method === "POST") { invoicePayload = JSON.parse(init.body); return response({ id: 200, number: "INV-200", amount: 0, currency: "GBP", status: "new" }); }
    if (url.pathname === "/public/invoice/add-package/id/200") { packagePayload = JSON.parse(init.body); return response({ id: 200, number: "INV-200", amount: 263, currency: "GBP", status: "new" }); }
    if (url.pathname === "/public/invoice/item/id/200") return response({ id: 200, number: "INV-200", amount: 263, currency: "GBP", status: "new" });
    throw new Error(`Unexpected package-purchase request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/package/purchase", {
    method: "POST", headers: { Origin: "https://example.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", Cookie: `ao_simplybook_session=${cookie}` },
    body: JSON.stringify({ packageId: 2, startDate: "2026-10-01" }),
  }), purchaseConfig, apiFetch);
  assert.equal(result.status, 200);
  assert.deepEqual(invoicePayload, { terms: { simplybook_terms: false, user_terms: false, cancellation_terms: false, privacy_policy: false, promotion_letters: false } });
  assert.deepEqual(packagePayload, { package_id: 2, start_date: londonToday() });
  const body = await result.json();
  assert.equal(body.data.orderType, "package");
  assert.equal(body.data.packageName, packageRecord.name);
  assert.equal(body.data.invoiceAmount, 263);
  assert.match(result.headers.get("set-cookie") || "", /Path=\/;/);
});

test("books the selected first visit after a native package payment", async () => {
  const purchaseConfig = { company: "package-payment-test", restKey: "public-test-key", sessionSecret: "test-session-secret" };
  const cookie = await sealSession({
    token: "signed-in-client", expires: Date.now() + 60_000, client: true, invoiceId: 200,
    purchase: {
      packageId: 2, packageName: "Exterior Valet - 3 Month Package", startDate: "2026-10-01", firstAppointmentStatus: "pending",
      pendingAppointment: { serviceId: 4, providerId: 3, date: "2026-10-01", time: "10:00:00", productId: 4, vehicleRegistration: "AB12 CDE" },
    },
  }, purchaseConfig);
  let appliedPackage;
  let firstVisitPayload;
  const apiFetch = async (input, init = {}) => {
    const url = new URL(input);
    if (url.pathname === "/public/invoice/item/id/200") return response({ id: 200, number: "INV-200", amount: 263, rest_amount: 0, currency: "GBP", status: "paid", payment_received: true });
    if (url.pathname === "/public/packages/instances") return response({ data: [{ id: 72, package_id: 2, period_start: "2026-10-01", period_end: "2027-10-01", status: "paid", can_be_used: "0", is_used: "0", services: [{ id: 13, service_id: 4, qty: 3, name: "Exterior Car Valet", is_visible: "1" }], package: { id: 2, name: "Exterior Valet - 3 Month Package", package_limit: 3 } }] });
    if (url.pathname === "/public/auth/token") return response({ token: "public-token" });
    if (url.pathname === "/public/services/item/id/4") return response({ id: 4, name: "Premium Exterior Car Valet", price: 40, currency: "GBP", duration: 60, is_active: true, is_visible: true });
    if (url.pathname === "/public/clients") return response({ name: "Package Customer", email: "package@example.test", phone: "07123456789" });
    if (url.pathname === "/public/clients/terms") return response({ enabled_simplybook_terms: false, enabled_user_terms: false, enabled_cancellation_terms: false, enabled_privacy_policy: false });
    if (url.pathname === "/public/timeline/slots") return response([{ date: "2026-10-01", slots: [{ time: "10:00:00", available_count: 1 }] }]);
    if (url.pathname === "/public/invoice" && init.method === "POST") return response({ id: 201, number: "INV-201", amount: 40, currency: "GBP", status: "new" });
    if (url.pathname === "/public/booking/item") { firstVisitPayload = JSON.parse(init.body); return response({ bookings: [{ id: 702, code: "PACKAGE-FIRST-1", is_confirmed: true }] }); }
    if (url.pathname === "/public/invoice/package/id/201") { appliedPackage = JSON.parse(init.body); return response({ id: 201, number: "INV-201", amount: 0, rest_amount: 0, currency: "GBP", status: "paid" }); }
    if (url.pathname === "/public/invoice/item/id/201") return response({ id: 201, number: "INV-201", amount: 0, rest_amount: 0, currency: "GBP", status: "paid" });
    throw new Error(`Unexpected package payment request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/payment/summary", {
    headers: { Cookie: `ao_simplybook_session=${cookie}` },
  }), purchaseConfig, apiFetch);
  assert.equal(result.status, 200);
  assert.deepEqual(appliedPackage, { package_instance_id: 72 });
  assert.deepEqual(firstVisitPayload.products, []);
  const body = await result.json();
  assert.equal(body.data.paid, true);
  assert.equal(body.data.booking.firstAppointmentStatus, "booked");
  assert.equal(body.data.booking.bookingCode, "PACKAGE-FIRST-1");
  assert.equal(body.data.details.serviceName, "Premium Exterior Car Valet");
});

test("cancels an unpaid package order and clears it from the client session", async () => {
  const cancelConfig = { company: "package-cancel-test", restKey: "public-test-key", sessionSecret: "test-session-secret" };
  const cookie = await sealSession({
    token: "signed-in-client", expires: Date.now() + 60_000, client: true, invoiceId: 205,
    purchase: { packageId: 2, packageName: "Exterior Valet - 3 Month Package", startDate: "2026-10-01" },
  }, cancelConfig);
  let deleted = false;
  const apiFetch = async (input, init = {}) => {
    const url = new URL(input);
    if (url.pathname === "/public/invoice/item/id/205" && init.method === "DELETE") { deleted = true; return new Response(null, { status: 204 }); }
    throw new Error(`Unexpected package-cancel request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/payment/cancel", {
    method: "POST",
    headers: { Origin: "https://example.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", Cookie: `ao_simplybook_session=${cookie}` },
    body: JSON.stringify({ invoiceId: 205 }),
  }), cancelConfig, apiFetch);
  assert.equal(result.status, 200);
  assert.equal(deleted, true);
  assert.equal((await result.json()).data.cancelled, true);
  const updatedCookie = result.headers.getSetCookie().find(value => value.startsWith("ao_simplybook_session=") && !value.startsWith("ao_simplybook_session=;"));
  const session = await readSession(new Request("https://example.test", { headers: { Cookie: updatedCookie.split(";")[0] } }), cancelConfig);
  assert.equal(session.client, true);
  assert.equal(session.invoiceId, undefined);
  assert.equal(session.purchase, undefined);
});

test("clears an unpaid package order when provider invoice deletion fails", async () => {
  const cancelConfig = { company: "package-cancel-outage-test", restKey: "public-test-key", sessionSecret: "test-session-secret" };
  const cookie = await sealSession({
    token: "signed-in-client", expires: Date.now() + 60_000, client: true, invoiceId: 206,
    purchase: { packageId: 2, packageName: "Exterior Valet - 3 Month Package", startDate: "2026-10-01" },
  }, cancelConfig);
  const apiFetch = async (input, init = {}) => {
    const url = new URL(input);
    if (url.pathname === "/public/invoice/item/id/206" && init.method === "DELETE") {
      return response({ message: "Provider failed to delete pending invoice" }, 500);
    }
    throw new Error(`Unexpected package-cancel request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/payment/cancel", {
    method: "POST",
    headers: { Origin: "https://example.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", Cookie: `ao_simplybook_session=${cookie}` },
    body: JSON.stringify({ invoiceId: 206 }),
  }), cancelConfig, apiFetch);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.data.cancelled, true);
  assert.equal(body.data.pendingProviderCleanup, true);
  const updatedCookie = result.headers.getSetCookie().find(value => value.startsWith("ao_simplybook_session=") && !value.startsWith("ao_simplybook_session=;"));
  const session = await readSession(new Request("https://example.test", { headers: { Cookie: updatedCookie.split(";")[0] } }), cancelConfig);
  assert.equal(session.client, true);
  assert.equal(session.invoiceId, undefined);
  assert.equal(session.purchase, undefined);
});

test("offers Stripe only and rejects delayed unpaid checkout", async () => {
  const paymentConfig = { company: "stripe-only-test", restKey: "public-test-key", sessionSecret: "test-session-secret" };
  const cookie = await sealSession({ token: "payment-client", expires: Date.now() + 60_000, client: true, invoiceId: 300, bookingCode: "PAY-300" }, paymentConfig);
  let paymentStarted = false;
  const apiFetch = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/public/payment-processor") return response({ data: [{ name: "delay", is_active: true }, { name: "stripe", is_active: true }] });
    if (url.pathname === "/public/payment-processor/pay") { paymentStarted = true; return response({}); }
    throw new Error(`Unexpected payment request: ${url.pathname}`);
  };
  const headers = { Cookie: `ao_simplybook_session=${cookie}` };
  const methodsResult = await handleSimplyBook(new Request("https://example.test/api/simplybook/payment/methods", { headers }), paymentConfig, apiFetch);
  assert.deepEqual((await methodsResult.json()).data.availableMethods, ["stripe"]);

  const delayedResult = await handleSimplyBook(new Request("https://example.test/api/simplybook/payment/pay", {
    method: "POST",
    headers: { ...headers, Origin: "https://example.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceId: 300, system: "delay" }),
  }), paymentConfig, apiFetch);
  assert.equal(delayedResult.status, 400);
  assert.equal(paymentStarted, false);
});

test("does not treat a zero-balance unpaid invoice as paid", async () => {
  const paymentConfig = { company: "strict-payment-test", restKey: "public-test-key", sessionSecret: "test-session-secret" };
  const cookie = await sealSession({ token: "payment-client", expires: Date.now() + 60_000, client: true, invoiceId: 301, bookingCode: "PAY-301" }, paymentConfig);
  const apiFetch = async input => {
    const url = new URL(input);
    if (url.pathname === "/public/invoice/item/id/301") return response({ id: 301, number: "INV-301", amount: 0, rest_amount: 0, currency: "GBP", status: "new", payment_received: false });
    throw new Error(`Unexpected invoice request: ${url.pathname}`);
  };
  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/payment/invoice-status?invoiceId=301", {
    headers: { Cookie: `ao_simplybook_session=${cookie}` },
  }), paymentConfig, apiFetch);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).data.paid, false);
});

test("replaces an expired cookie session before client login", async () => {
  const sessionConfig = { company: "login-session-test", restKey: "public-test-key", sessionSecret: "test-session-secret" };
  const cookie = await sealSession({ token: "expired-client", expires: Date.now() + 60_000, client: true }, sessionConfig);
  const loginTokens = [];
  const apiFetch = async (input, init) => {
    const url = new URL(input);
    const token = init.headers["X-Token"];
    if (url.pathname === "/public/auth/token") return response({ token: "fresh-public" });
    if (url.pathname === "/public/clients/login") {
      loginTokens.push(token);
      assert.equal(token, "fresh-public");
      return response({ token: "fresh-client" });
    }
    if (url.pathname === "/public/clients") {
      assert.equal(token, "fresh-client");
      return response({ id: 7, name: "Returning Customer", email: "customer@example.test" });
    }
    throw new Error(`Unexpected login request: ${url.pathname}`);
  };

  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/login", {
    method: "POST",
    headers: { Origin: "https://example.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", Cookie: `ao_simplybook_session=${cookie}` },
    body: JSON.stringify({ email: "customer@example.test", password: "valid-password" }),
  }), sessionConfig, apiFetch);

  assert.equal(result.status, 200);
  assert.deepEqual(loginTokens, ["fresh-public"]);
  assert.equal((await result.json()).data.email, "customer@example.test");
});

test("stores the signed client identity at login for authoritative booking recovery", async () => {
  const identityConfig = { company: "login-identity-test", restKey: "public-test-key", rpcKey: "rpc-test-key", secretKey: "secret-test-key", sessionSecret: "test-session-secret" };
  let identityRequest;
  const apiFetch = async (input, init = {}) => {
    const url = new URL(input);
    if (url.hostname === "user-api-v2.simplybook.it" && url.pathname === "/public/auth/token") return response({ token: "fresh-public" });
    if (url.hostname === "user-api-v2.simplybook.it" && url.pathname === "/public/clients/login") return response({ token: "fresh-client" });
    if (url.hostname === "user-api-v2.simplybook.it" && url.pathname === "/public/clients") return response({ id: 17, name: "Returning Customer", email: "customer@example.test" });
    if (url.hostname === "user-api.simplybook.me" && url.pathname === "/login") return response({ jsonrpc: "2.0", result: "rpc-token", id: 1 });
    if (url.hostname === "user-api.simplybook.me" && url.pathname === "/") {
      identityRequest = JSON.parse(init.body);
      return response({ jsonrpc: "2.0", result: { id: 17, hash: "signed-client-hash" }, id: 1 });
    }
    throw new Error(`Unexpected identity request: ${url.hostname}${url.pathname}`);
  };

  const result = await handleSimplyBook(new Request("https://example.test/api/simplybook/client/login", {
    method: "POST",
    headers: { Origin: "https://example.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" },
    body: JSON.stringify({ email: "customer@example.test", password: "valid-password" }),
  }), identityConfig, apiFetch);

  assert.equal(result.status, 200);
  assert.equal(identityRequest.method, "getClientInfoByLoginPassword");
  assert.deepEqual(identityRequest.params, ["customer@example.test", "valid-password"]);
  const rootCookie = result.headers.get("set-cookie").match(/ao_simplybook_session=([^;,]+); Path=\/;/)?.[1];
  assert.ok(rootCookie);
  const stored = await readSession(new Request("https://example.test/account", { headers: { Cookie: `ao_simplybook_session=${rootCookie}` } }), identityConfig);
  assert.deepEqual(stored.clientIdentity, { id: 17, hash: "signed-client-hash" });
  assert.equal("password" in stored, false);
});

test("recovers the valid root session when a legacy path cookie is also present", async () => {
  const sessionConfig = { company: "cookie-migration-test", restKey: "public-test-key", sessionSecret: "test-session-secret" };
  const valid = await sealSession({ token: "current-client", expires: Date.now() + 60_000, client: true }, sessionConfig);
  const session = await readSession(new Request("https://example.test/api/simplybook/client/dashboard", {
    headers: { Cookie: `ao_simplybook_session=invalid; ao_simplybook_session=${valid}` },
  }), sessionConfig);
  assert.equal(session?.token, "current-client");
  assert.equal(session?.client, true);
});
