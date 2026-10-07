import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("enquiry forms collect split names, optional uploads and a signed security answer", async () => {
  const [form, route, captcha, smtp] = await Promise.all([
    source("components/enquiry-form.tsx"),
    source("app/api/enquiry/route.ts"),
    source("lib/enquiry-captcha.ts"),
    source("lib/sendgrid-smtp.ts"),
  ]);

  assert.match(form, /name="firstName"/);
  assert.match(form, /name="lastName"/);
  assert.match(form, /type="file" multiple/);
  assert.match(form, /name="captchaAnswer"/);
  assert.match(route, /request\.formData\(\)/);
  assert.match(route, /verifyCaptchaChallenge/);
  assert.match(route, /15 \* 1024 \* 1024/);
  assert.match(captcha, /HMAC/);
  assert.match(captcha, /maximumChallengeAge/);
  assert.match(smtp, /attachments: EmailAttachment\[\]/);
});

test("bookings return from Stripe to this website's payment page", async () => {
  const [vehicleCare, form] = await Promise.all([source("lib/vehicle-care.ts"), source("components/ServiceBookingForm.tsx")]);
  assert.match(vehicleCare, /bookingPaymentCompletePath = "\/booking\/payment-complete"/);
  assert.match(form, /success_url: `\$\{origin\}\$\{bookingPaymentCompletePath\}\?session_id=\{CHECKOUT_SESSION_ID\}`/);
});
