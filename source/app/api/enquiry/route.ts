import { verifyCaptchaChallenge } from "@/lib/enquiry-captcha";
import { runtimeEnv } from "@/lib/runtime-env";
import { loadEnquiryEmailImages, sendEnquiryEmails, type EmailAttachment } from "@/lib/sendgrid-smtp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const serviceLabels: Record<string, string> = {
  "vehicle-valeting": "Vehicle Valeting",
  "vehicle-washing": "Vehicle Washing",
  "vehicle-polishing": "Vehicle Polishing & Ceramic Coating",
  "valet-bay-hire": "Valet Bay Hire",
};
const allowedFileTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const text = (value: FormDataEntryValue | null, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

// Adds the Google click ID / UTM tags the visitor arrived with to the page address in the enquiry email. They come from
// the "ins_ad" cookie the Insights tracker sets after analytics consent. The CRM reads the address into the lead, and
// reports leads that became enquiries and sales back to Google Ads.
function withAdClick(pageUrl: string, request: Request) {
  const raw = (request.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith("ins_ad="))?.slice(7) || "";
  if (!raw || !/^https?:\/\//.test(pageUrl)) return pageUrl;
  try {
    const url = new URL(pageUrl);
    for (const [k, v] of new URLSearchParams(decodeURIComponent(raw)))
      if (/^(gclid|gbraid|wbraid|utm_(source|medium|campaign|term|content))$/.test(k) && !url.searchParams.has(k)) url.searchParams.set(k, v.slice(0, 300));
    return url.toString().slice(0, 2048);
  } catch { return pageUrl; }
}

export async function POST(request: Request) {
  try {
    const body = await request.formData();
    if (text(body.get("company"), 100)) return Response.json({ ok: true });

    const firstName = text(body.get("firstName"), 80);
    const lastName = text(body.get("lastName"), 80);
    const phone = text(body.get("phone"), 40);
    const email = text(body.get("email"), 254).toLowerCase();
    const selectedService = serviceLabels[text(body.get("service"), 80)] || "General vehicle-care enquiry";
    const businessSector = text(body.get("businessSector"), 120);
    const service = businessSector ? `${selectedService} — ${businessSector}` : selectedService;
    const message = text(body.get("message"), 4000);
    const sourceUrl = withAdClick(text(body.get("sourceUrl"), 2048) || text(request.headers.get("referer"), 2048) || "Not available", request);
    const submittedAt = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: "Europe/London",
    }).format(new Date());
    if (!firstName || !lastName || !phone || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Please complete your first name, last name, phone number, email address, service and enquiry." }, { status: 400 });
    }

    const captchaSecret = runtimeEnv("ENQUIRY_CAPTCHA_SECRET") || runtimeEnv("SMTP_PASSWORD");
    const captchaValid = captchaSecret && await verifyCaptchaChallenge(text(body.get("captchaToken"), 2000), text(body.get("captchaAnswer"), 20), captchaSecret);
    if (!captchaValid) return Response.json({ error: "The security answer was incorrect or expired. Please try the new question." }, { status: 400 });

    const files = body.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length > 5) return Response.json({ error: "Choose no more than 5 files." }, { status: 413 });
    if (files.some(file => !allowedFileTypes.has(file.type))) return Response.json({ error: "Files must be JPG, PNG, WebP or PDF." }, { status: 415 });
    if (files.some(file => file.size > 5 * 1024 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 15 * 1024 * 1024) {
      return Response.json({ error: "Each file must be 5MB or smaller and the combined upload must be 15MB or smaller." }, { status: 413 });
    }
    const attachments: EmailAttachment[] = await Promise.all(files.map(async file => ({
      filename: file.name.slice(0, 180),
      mimeType: file.type,
      base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    })));

    const config = {
      host: runtimeEnv("SMTP_SERVER", "smtp.sendgrid.net"),
      port: Number(runtimeEnv("SMTP_PORT", "587")),
      username: runtimeEnv("SMTP_USERNAME", "apikey"),
      password: runtimeEnv("SMTP_PASSWORD"),
      fromEmail: runtimeEnv("SMTP_FROM_EMAIL", "valeting@autoopulence.co.uk"),
      fromName: runtimeEnv("SMTP_FROM_NAME", "Auto Opulence Website"),
      toEmail: runtimeEnv("SMTP_TO_EMAIL", "01a0bfe8-a701-4f15-8f2d-37ca4fc4bd1c@webform.boxly.ai"),
      additionalToEmails: ["3ca8339d-bd85-443a-9662-3bbc287b15ff@webform.autoopulence.co.uk"],
      ccEmail: runtimeEnv("SMTP_CC_EMAIL", "chris@racecargraphics.uk"),
    };
    if (!config.password) return Response.json({ error: "Email delivery is temporarily unavailable. Please call 0330 053 6925." }, { status: 503 });
    // CRM monitoring (hourly form check): with the monitor token, everything above has been checked; ask the CRM to
    // check the web form key too, then stop before any email is sent. Without a valid token nothing is sent either.
    if (text(body.get("monitor"), 5) === "1") {
      const crm = await fetch("https://dipjypzrfigkzuarlsov.supabase.co/functions/v1/inbound-webform-email", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_key: "3ca8339d-bd85-443a-9662-3bbc287b15ff", subject: service, details: message, email, name: firstName + " " + lastName, page_url: sourceUrl, monitor: true, monitor_token: text(body.get("monitorToken"), 200) }) });
      const result = await crm.json().catch(() => ({}));
      return Response.json(crm.ok && result.monitor ? { ok: true, monitor: true, captcha: true, smtp_configured: true, crm: result } : { error: result.error || "CRM check failed (" + crm.status + ")" }, { status: crm.ok ? 200 : crm.status });
    }

    const inlineImages = await loadEnquiryEmailImages();
    await sendEnquiryEmails(config, { firstName, lastName, phone, email, service, message, sourceUrl, submittedAt }, inlineImages, attachments);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Enquiry delivery failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "We could not send your enquiry. Please try again or call 0330 053 6925." }, { status: 502 });
  }
}
