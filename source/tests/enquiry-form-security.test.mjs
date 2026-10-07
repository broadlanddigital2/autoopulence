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

test("payment callbacks use the public Auto Opulence URL", async () => {
  const [paymentReturn, server] = await Promise.all([
    source("lib/simplybook-payment-return.ts"),
    source("lib/simplybook-server.ts"),
  ]);

  assert.match(paymentReturn, /new URL\("\/booking\/payment-complete", siteUrl\)/);
  assert.match(server, /new URL\("\/booking\/payment-complete\/", siteUrl\)/);
});
