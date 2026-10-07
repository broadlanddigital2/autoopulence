// Replaces nodemailer in the Worker. Workers can't open SMTP connections, so mail goes through SendGrid's
// HTTPS API instead, authenticated with the same key the site uses as its SendGrid SMTP password (SMTP_PASSWORD).
type Address = string | { name?: string; address: string };
type Attachment = { filename?: string; content: Uint8Array | string; contentType?: string; cid?: string; disposition?: string };
type Mail = { from: Address; to: Address | Address[]; cc?: Address | Address[]; replyTo?: Address; subject: string; html?: string; text?: string; attachments?: Attachment[] };

function parse(a: Address) {
  if (typeof a !== "string") return { email: a.address.trim(), ...(a.name ? { name: a.name } : {}) };
  const m = a.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { email: m[2].trim(), ...(m[1] ? { name: m[1].replace(/^"|"$/g, "") } : {}) } : { email: a.trim() };
}
const many = (v?: Address | Address[]) => (v == null ? [] : Array.isArray(v) ? v : [v]).filter(Boolean).map(parse);
const base64 = (c: Uint8Array | string) => typeof c === "string" ? btoa(c) : Buffer.from(c).toString("base64");

export function createTransport(options: { auth?: { pass?: string } }) {
  const key = options.auth?.pass || "";
  return {
    async sendMail(mail: Mail) {
      const to = many(mail.to);
      const toEmails = new Set(to.map((x) => x.email.toLowerCase()));
      const cc = many(mail.cc).filter((x) => !toEmails.has(x.email.toLowerCase())); // SendGrid rejects duplicates
      const body = {
        personalizations: [{ to, ...(cc.length ? { cc } : {}) }],
        from: parse(mail.from),
        ...(mail.replyTo ? { reply_to: parse(mail.replyTo) } : {}),
        subject: mail.subject,
        content: [...(mail.text ? [{ type: "text/plain", value: mail.text }] : []), ...(mail.html ? [{ type: "text/html", value: mail.html }] : [])],
        ...(mail.attachments?.length ? { attachments: mail.attachments.map((a) => ({
          content: base64(a.content), filename: a.filename || "attachment", ...(a.contentType ? { type: a.contentType } : {}),
          ...(a.cid ? { disposition: "inline", content_id: a.cid } : { disposition: "attachment" }),
        })) } : {}),
      };
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`SendGrid ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return { messageId: res.headers.get("x-message-id") || "" };
    },
  };
}
export default { createTransport };
