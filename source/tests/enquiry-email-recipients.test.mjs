import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const requiredRecipient = "3ca8339d-bd85-443a-9662-3bbc287b15ff@webform.autoopulence.co.uk";

test("sends every website enquiry to the additional Auto Opulence recipient", async () => {
  const route = await readFile(new URL("../app/api/enquiry/route.ts", import.meta.url), "utf8");
  const smtp = await readFile(new URL("../lib/sendgrid-smtp.ts", import.meta.url), "utf8");

  assert.match(route, new RegExp(requiredRecipient.replaceAll(".", "\\.")));
  assert.match(smtp, /to: \[config\.toEmail, \.\.\.\(config\.additionalToEmails \|\| \[\]\)\]/);
  assert.match(smtp, /to: recipients/);
});
