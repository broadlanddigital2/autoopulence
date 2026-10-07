import { readFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  additionalToEmails?: string[];
  ccEmail?: string;
};

export type EnquiryMessage = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: string;
  message: string;
  sourceUrl: string;
  submittedAt: string;
};

type EmailMessage = {
  to: string | string[];
  cc?: string;
  replyTo?: string;
  subject: string;
  html: string;
  inlineImages?: InlineImage[];
  attachments?: EmailAttachment[];
};

export type InlineImage = {
  cid: string;
  filename: string;
  mimeType: "image/jpeg" | "image/png";
  base64: string;
};

export type EmailAttachment = {
  filename: string;
  mimeType: string;
  base64: string;
};

const enquiryEmailImageAssets = [
  { cid: "ao-logo", path: "/images/email/auto-opulence-logo.png", filename: "auto-opulence-logo.png", mimeType: "image/png" },
  { cid: "vehicle-valeting", path: "/images/email/vehicle-valeting.jpg", filename: "vehicle-valeting.jpg", mimeType: "image/jpeg" },
  { cid: "vehicle-washing", path: "/images/email/vehicle-washing.jpg", filename: "vehicle-washing.jpg", mimeType: "image/jpeg" },
  { cid: "machine-polishing", path: "/images/email/machine-polishing.jpg", filename: "machine-polishing.jpg", mimeType: "image/jpeg" },
  { cid: "ceramic-coating", path: "/images/email/ceramic-coating.jpg", filename: "ceramic-coating.jpg", mimeType: "image/jpeg" },
  { cid: "valet-bay-hire", path: "/images/email/valet-bay-hire.jpg", filename: "valet-bay-hire.jpg", mimeType: "image/jpeg" },
  { cid: "customer-results", path: "/images/email/customer-results.jpg", filename: "customer-results.jpg", mimeType: "image/jpeg" },
] as const;

const siteUrl = "https://autoopulence.co.uk";

function stripHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

export async function loadEnquiryEmailImages(): Promise<InlineImage[]> {
  return Promise.all(enquiryEmailImageAssets.map(async asset => {
    const file = await readFile(path.join(process.cwd(), "public", asset.path.replace(/^\//, "")));
    return {
      cid: asset.cid,
      filename: asset.filename,
      mimeType: asset.mimeType,
      base64: file.toString("base64"),
    };
  }));
}

function detailRow(label: string, value: string, link?: string) {
  const content = link
    ? `<a href="${escapeHtml(link)}" style="color:#142027;text-decoration:underline">${escapeHtml(value)}</a>`
    : escapeHtml(value);
  return `<tr><th scope="row" style="width:120px;padding:11px 16px 11px 0;border-bottom:1px solid #d9e4e8;text-align:left;vertical-align:top;font-size:14px;color:#53636b">${escapeHtml(label)}</th><td style="padding:11px 0;border-bottom:1px solid #d9e4e8;vertical-align:top;font-size:15px;color:#142027;white-space:pre-wrap;line-height:1.5">${content}</td></tr>`;
}

async function sendHtmlEmail(config: SmtpConfig, message: EmailMessage) {
  const recipients = (Array.isArray(message.to) ? message.to : [message.to])
    .map(stripHeader)
    .filter((recipient, index, all) => recipient && all.indexOf(recipient) === index);
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.username, pass: config.password },
  });
  await transport.sendMail({
    from: { name: stripHeader(config.fromName), address: stripHeader(config.fromEmail) },
    to: recipients,
    cc: message.cc ? stripHeader(message.cc) : undefined,
    replyTo: message.replyTo ? stripHeader(message.replyTo) : undefined,
    subject: stripHeader(message.subject),
    html: message.html,
    attachments: [
      ...(message.inlineImages || []).map(image => ({ filename: stripHeader(image.filename), content: Buffer.from(image.base64, "base64"), contentType: image.mimeType, cid: stripHeader(image.cid) })),
      ...(message.attachments || []).map(attachment => ({ filename: stripHeader(attachment.filename), content: Buffer.from(attachment.base64, "base64"), contentType: attachment.mimeType, disposition: "attachment" as const })),
    ],
  });
}

function internalEnquiryHtml(enquiry: EnquiryMessage, attachments: EmailAttachment[]) {
  const safeEmail = stripHeader(enquiry.email);
  const attachmentSummary = attachments.length ? detailRow("Attachments", attachments.map(item => item.filename).join("\n")) : "";
  return `<!doctype html><html lang="en"><body style="margin:0;background:#eef5f8;font-family:Arial,sans-serif;color:#142027"><div style="max-width:680px;margin:0 auto;padding:32px"><div style="background:#11181c;color:#fff;padding:28px"><div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#67d3ff">Auto Opulence website</div><h1 style="margin:10px 0 0;font-size:28px">New service enquiry</h1></div><div style="background:#fff;padding:28px;border:1px solid #d9e4e8"><table role="presentation" style="width:100%;border-collapse:collapse"><tbody>${detailRow("First name", enquiry.firstName)}${detailRow("Last name", enquiry.lastName)}${detailRow("Email", safeEmail, `mailto:${safeEmail}`)}${detailRow("Phone", enquiry.phone, `tel:${enquiry.phone}`)}${detailRow("Service", enquiry.service)}${detailRow("Submitted", enquiry.submittedAt)}${detailRow("Page submitted from", enquiry.sourceUrl, enquiry.sourceUrl.startsWith("http") ? enquiry.sourceUrl : undefined)}${attachmentSummary}</tbody></table><div style="margin-top:24px"><strong>Vehicle and enquiry</strong><p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(enquiry.message)}</p></div></div></div></body></html>`;
}

function customerConfirmationHtml(enquiry: EnquiryMessage) {
  const services = [
    ["Vehicle valeting", "Interior, exterior and deep-clean packages", `${siteUrl}/category/vehicle-valeting`, "cid:vehicle-valeting", "Professionally valeted car at Auto Opulence in Norwich"],
    ["Vehicle washing", "Hand washes and decontamination treatments", `${siteUrl}/category/vehicle-washing`, "cid:vehicle-washing", "Vehicle receiving a professional hand wash"],
    ["Machine polishing", "Gloss enhancement and multi-stage paint correction", `${siteUrl}/category/vehicle-polishing`, "cid:machine-polishing", "Vehicle paintwork being professionally machine polished"],
    ["Ceramic coating", "Long-term paint, wheel and soft-top protection", `${siteUrl}/service/new-car-7-year-ceramic-coating`, "cid:ceramic-coating", "Ceramic coated vehicle with a high-gloss finish"],
    ["Valet bay hire", "Indoor, climate-controlled space for public and trade", `${siteUrl}/category/valet-bay-hire`, "cid:valet-bay-hire", "Indoor Auto Opulence valet bay available for hire"],
    ["Customer results", "See recent valeting, polishing and coating projects", `${siteUrl}/case-studies`, "cid:customer-results", "Range Rover ceramic coating case study"],
  ];
  const serviceCards = services.map(([title, description, url, image, alt]) => `<div style="margin:0 0 16px;overflow:hidden;border:1px solid #d9e4e8;background:#fff"><a href="${url}" style="display:block;color:#142027;text-decoration:none"><img src="${image}" width="620" height="190" alt="${alt}" style="display:block;width:100%;max-width:620px;height:auto;border:0"><span style="display:block;padding:18px 24px 20px;border-top:4px solid #67d3ff"><strong style="display:block;font-size:17px;line-height:1.3">${title}</strong><span style="display:block;margin-top:6px;color:#53636b;font-size:14px;line-height:1.5">${description}</span><span style="display:block;margin-top:10px;color:#087eac;font-size:13px;font-weight:bold">View service →</span></span></a></div>`).join("");
  return `<!doctype html><html lang="en"><body style="margin:0;background:#eef5f8;font-family:Arial,sans-serif;color:#142027"><div style="display:none;max-height:0;overflow:hidden">We have received your Auto Opulence enquiry and aim to respond within 24 hours.</div><table role="presentation" style="width:100%;border-collapse:collapse;background:#eef5f8"><tbody><tr><td align="center" style="padding:32px 16px"><table role="presentation" style="width:100%;max-width:680px;border-collapse:collapse"><tbody><tr><td style="padding:28px 36px;background:#11181c;color:#fff"><a href="${siteUrl}" style="display:block;width:220px;max-width:100%;margin-bottom:20px;text-decoration:none"><img src="cid:ao-logo" width="220" height="71" alt="Auto Opulence Detailing Excellence" style="display:block;width:220px;max-width:100%;height:auto;border:0"></a><h1 style="margin:0;font-size:28px;line-height:1.2">Confirmation of enquiry received</h1></td></tr><tr><td style="padding:30px 36px;background:#fff;border:1px solid #d9e4e8"><p style="margin:0 0 12px;font-size:18px;line-height:1.5"><strong>Thank you for your enquiry, ${escapeHtml(enquiry.firstName)}.</strong></p><p style="margin:0 0 26px;line-height:1.6;color:#53636b">We aim to respond to all enquiries within 24 hours.</p><h2 style="margin:0 0 10px;font-size:20px">Your enquiry details</h2><table role="presentation" style="width:100%;border-collapse:collapse"><tbody>${detailRow("First name", enquiry.firstName)}${detailRow("Last name", enquiry.lastName)}${detailRow("Email", enquiry.email)}${detailRow("Phone", enquiry.phone)}${detailRow("Service", enquiry.service)}${detailRow("Submitted", enquiry.submittedAt)}${detailRow("Page submitted from", enquiry.sourceUrl, enquiry.sourceUrl.startsWith("http") ? enquiry.sourceUrl : undefined)}${detailRow("Vehicle and enquiry", enquiry.message)}</tbody></table><p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#53636b">If you need to add anything, reply to this email or call <a href="tel:03300536925" style="color:#142027">0330 053 6925</a>.</p></td></tr><tr><td style="padding:30px 36px;background:#f8fbfc;border:1px solid #d9e4e8;border-top:0"><h2 style="margin:0 0 8px;font-size:20px">Explore more from Auto Opulence</h2><p style="margin:0 0 18px;color:#53636b;line-height:1.5">From routine care to long-term protection and indoor bay hire, discover more ways to look after your vehicle.</p>${serviceCards}<p style="margin:22px 0 0;text-align:center"><a href="${siteUrl}/#book" style="display:inline-block;padding:13px 22px;border-radius:4px;background:#67d3ff;color:#11181c;font-weight:bold;text-decoration:none">Book a service</a></p></td></tr><tr><td style="padding:26px 36px;background:#11181c;text-align:left;color:#bac7cc;font-size:13px;line-height:1.7"><strong style="display:block;margin-bottom:4px;color:#fff;font-size:15px">Auto Opulence</strong>Unit 7 Consensus House, St Faiths Road<br>Norwich, Norfolk, NR6 7BW<br><a href="tel:03300536925" style="color:#67d3ff;text-decoration:none">0330 053 6925</a> · <a href="mailto:valeting@autoopulence.co.uk" style="color:#67d3ff;text-decoration:none">valeting@autoopulence.co.uk</a><br><a href="${siteUrl}" style="color:#fff">autoopulence.co.uk</a></td></tr></tbody></table></td></tr></tbody></table></body></html>`;
}

export async function sendEnquiryEmails(config: SmtpConfig, enquiry: EnquiryMessage, inlineImages: InlineImage[], attachments: EmailAttachment[] = []) {
  const safeName = stripHeader(`${enquiry.firstName} ${enquiry.lastName}`);
  const safeEmail = stripHeader(enquiry.email);
  await sendHtmlEmail(config, {
    to: [config.toEmail, ...(config.additionalToEmails || [])],
    cc: config.ccEmail,
    replyTo: `${safeName} <${safeEmail}>`,
    subject: `New ${enquiry.service} enquiry from ${safeName}`,
    html: internalEnquiryHtml(enquiry, attachments),
    attachments,
  });
  await sendHtmlEmail(config, {
    to: safeEmail,
    replyTo: config.fromEmail,
    subject: "Confirmation of enquiry received | Auto Opulence",
    html: customerConfirmationHtml(enquiry),
    inlineImages,
  });
}

export type PackageBookingEmail = {
  serviceName: string;
  date: string;
  time: string;
  vehicleRegistration: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingCode: string;
  packageName?: string;
};

export async function sendPackageBookingConfirmationEmail(config: SmtpConfig, booking: PackageBookingEmail) {
  const accountUrl = `${siteUrl}/account`;
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#eef5f8;font-family:Arial,sans-serif;color:#142027"><div style="max-width:680px;margin:0 auto;padding:32px"><div style="padding:28px 34px;background:#11181c;color:#fff;border-top:6px solid #67d3ff"><div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#67d3ff">Auto Opulence</div><h1 style="margin:10px 0 0;font-size:28px">Your package visit is booked</h1></div><div style="padding:30px 34px;background:#fff;border:1px solid #d9e4e8"><p style="margin:0 0 22px;font-size:17px">Hello ${escapeHtml(booking.customerName)}, your next prepaid visit has been confirmed.</p><table role="presentation" style="width:100%;border-collapse:collapse"><tbody>${detailRow("Package", booking.packageName || "Vehicle-care package")}${detailRow("Service", booking.serviceName)}${detailRow("Date", booking.date)}${detailRow("Time", booking.time.slice(0, 5))}${detailRow("Registration", booking.vehicleRegistration)}${detailRow("Reference", booking.bookingCode)}</tbody></table><p style="margin:26px 0 0"><a href="${accountUrl}" style="display:inline-block;padding:13px 22px;background:#67d3ff;color:#11181c;font-weight:bold;text-decoration:none">View customer account</a></p></div><div style="padding:24px 34px;background:#11181c;color:#bac7cc;font-size:13px;line-height:1.7">Auto Opulence · Unit 7 Consensus House, St Faiths Road, Norwich, NR6 7BW<br><a href="tel:03300536925" style="color:#67d3ff">0330 053 6925</a> · <a href="mailto:valeting@autoopulence.co.uk" style="color:#67d3ff">valeting@autoopulence.co.uk</a></div></div></body></html>`;
  await sendHtmlEmail(config, {
    to: stripHeader(booking.customerEmail),
    replyTo: config.fromEmail,
    subject: `Package visit confirmed — ${stripHeader(booking.bookingCode)} | Auto Opulence`,
    html,
  });
}
