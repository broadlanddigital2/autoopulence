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

test("booking pages use the CRM booking widget", async () => {
  const widget = await source("components/crm-booking.tsx");
  assert.match(widget, /data-crm-booking=\{mode\}/);
  assert.match(widget, /data-payment-url="\/booking\/payment-complete"/);
});
