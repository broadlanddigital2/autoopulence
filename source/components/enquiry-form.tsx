"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Check, FileUp, RefreshCw, Send, ShieldCheck, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categories } from "@/lib/services";

type EnquiryFormProps = {
  initialService?: string;
  businessSector?: string;
  title?: string;
  intro?: string;
};

type CaptchaChallenge = { question: string; token: string };
const allowedFileTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maximumFiles = 5;
const maximumFileSize = 5 * 1024 * 1024;
const maximumTotalSize = 15 * 1024 * 1024;

export function EnquiryForm({ initialService = "", businessSector = "", title = "How can we help?", intro = "Tell us about your vehicle and the service you are considering. We can help you choose the right treatment or bay-hire option." }: EnquiryFormProps = {}) {
  type RequiredField = "firstName" | "lastName" | "phone" | "email" | "service" | "message" | "captcha" | "consent" | "files";
  const [service, setService] = useState(initialService);
  const [files, setFiles] = useState<File[]>([]);
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState<Partial<Record<RequiredField, string>>>({});
  const successRef = useRef<HTMLElement>(null);
  const uploadId = useId();

  async function refreshCaptcha() {
    setCaptchaLoading(true);
    setCaptcha(null);
    try {
      const response = await fetch("/api/enquiry/captcha", { cache: "no-store" });
      const result = await response.json() as CaptchaChallenge & { error?: string };
      if (!response.ok || !result.question || !result.token) throw new Error();
      setCaptcha({ question: result.question, token: result.token });
    } catch {
      setError("The security check could not load. Please refresh it or call 0330 053 6925.");
    } finally {
      setCaptchaLoading(false);
    }
  }

  useEffect(() => { void refreshCaptcha(); }, []);
  useEffect(() => {
    if (!sent) return;
    requestAnimationFrame(() => {
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      successRef.current?.focus({ preventScroll: true });
    });
  }, [sent]);

  function clearValidation(field: RequiredField) {
    setValidation(current => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    const invalidType = selected.find(file => !allowedFileTypes.has(file.type));
    const oversized = selected.find(file => file.size > maximumFileSize);
    const totalSize = selected.reduce((sum, file) => sum + file.size, 0);
    let message = "";
    if (selected.length > maximumFiles) message = `Choose no more than ${maximumFiles} files.`;
    else if (invalidType) message = "Files must be JPG, PNG, WebP or PDF.";
    else if (oversized) message = "Each file must be 5MB or smaller.";
    else if (totalSize > maximumTotalSize) message = "The combined upload must be 15MB or smaller.";
    if (message) {
      setFiles([]);
      setValidation(current => ({ ...current, files: message }));
      event.target.value = "";
      return;
    }
    setFiles(selected);
    clearValidation("files");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const firstName = String(data.get("firstName") || "").trim();
    const lastName = String(data.get("lastName") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    const captchaAnswer = String(data.get("captchaAnswer") || "").trim();
    const nextValidation: Partial<Record<RequiredField, string>> = {};
    if (!firstName) nextValidation.firstName = "Please enter your first name.";
    if (!lastName) nextValidation.lastName = "Please enter your last name.";
    if (!phone) nextValidation.phone = "Please enter your phone number.";
    if (!email) nextValidation.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextValidation.email = "Please enter a valid email address.";
    if (!service) nextValidation.service = "Please select the service you are interested in.";
    if (!message) nextValidation.message = "Please tell us about your vehicle and enquiry.";
    if (!captcha || !captchaAnswer) nextValidation.captcha = "Please complete the security check.";
    if (data.get("consent") !== "on") nextValidation.consent = "Please confirm that we may use your details to respond.";
    setValidation(nextValidation);
    setError("");
    if (Object.keys(nextValidation).length) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    files.forEach(file => data.append("files", file));
    data.set("sourceUrl", window.location.href);
    setSending(true);
    try {
      const response = await fetch("/api/enquiry", { method: "POST", body: data });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "We could not send your enquiry.");
      form.reset();
      setFiles([]);
      setService(initialService);
      setValidation({});
      setSent(true);
      window.location.assign("/enquiry-complete");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send your enquiry. Please try again.");
      void refreshCaptcha();
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <section ref={successRef} className="enquiry-success" role="status" aria-labelledby="enquiry-success-title" tabIndex={-1}><span><Check /></span><h2 id="enquiry-success-title">Thank you for your enquiry</h2><p>We’ve emailed you a confirmation and aim to respond to all enquiries within 24 hours.</p><button type="button" className="button" onClick={() => setSent(false)}>Send another enquiry</button></section>;
  }

  return <form className="enquiry-form" onSubmit={submit} aria-labelledby="enquiry-form-title" encType="multipart/form-data" noValidate>
    <header className="form-heading"><div className="enquiry-form-logo"><img src="/auto-opulence-logo.svg" alt="Auto Opulence Detailing Excellence" width="220" height="71" /></div><p className="kicker">Send an enquiry</p><h2 id="enquiry-form-title">{title}</h2><p>{intro}</p></header>
    <label className="enquiry-trap" aria-hidden="true">Company<input type="text" name="company" tabIndex={-1} autoComplete="off" /></label>
    {businessSector && <input type="hidden" name="businessSector" value={businessSector} />}
    <fieldset className="form-row" aria-label="Your name">
      <label><span>First name <b className="required-mark" aria-hidden="true">*</b></span><input type="text" name="firstName" autoComplete="given-name" required placeholder="First name" aria-invalid={Boolean(validation.firstName)} aria-describedby={validation.firstName ? "first-name-error" : undefined} onChange={() => clearValidation("firstName")} />{validation.firstName && <small className="field-error" id="first-name-error">{validation.firstName}</small>}</label>
      <label><span>Last name <b className="required-mark" aria-hidden="true">*</b></span><input type="text" name="lastName" autoComplete="family-name" required placeholder="Last name" aria-invalid={Boolean(validation.lastName)} aria-describedby={validation.lastName ? "last-name-error" : undefined} onChange={() => clearValidation("lastName")} />{validation.lastName && <small className="field-error" id="last-name-error">{validation.lastName}</small>}</label>
    </fieldset>
    <fieldset className="form-row" aria-label="Your contact details">
      <label><span>Phone <b className="required-mark" aria-hidden="true">*</b></span><input type="tel" name="phone" autoComplete="tel" required placeholder="Your phone number" aria-invalid={Boolean(validation.phone)} aria-describedby={validation.phone ? "phone-error" : undefined} onChange={() => clearValidation("phone")} />{validation.phone && <small className="field-error" id="phone-error">{validation.phone}</small>}</label>
      <label><span>Email <b className="required-mark" aria-hidden="true">*</b></span><input type="email" name="email" autoComplete="email" required placeholder="Your email address" aria-invalid={Boolean(validation.email)} aria-describedby={validation.email ? "email-error" : undefined} onChange={() => clearValidation("email")} />{validation.email && <small className="field-error" id="email-error">{validation.email}</small>}</label>
    </fieldset>
    <label><span>Service <b className="required-mark" aria-hidden="true">*</b></span><input type="hidden" name="service" value={service} /><Select value={service} onValueChange={(value) => { setService(value); clearValidation("service"); }} required><SelectTrigger className="enquiry-select" aria-label="Service of interest" aria-invalid={Boolean(validation.service)} aria-describedby={validation.service ? "service-error" : undefined}><SelectValue placeholder="Select a service sector" /></SelectTrigger><SelectContent>{categories.map(category => <SelectItem key={category.slug} value={category.slug}>{category.title}</SelectItem>)}</SelectContent></Select>{validation.service && <small className="field-error" id="service-error">{validation.service}</small>}</label>
    <label><span>Vehicle and enquiry <b className="required-mark" aria-hidden="true">*</b></span><textarea name="message" required rows={6} placeholder="Tell us your vehicle type, its condition and what you would like help with" aria-invalid={Boolean(validation.message)} aria-describedby={validation.message ? "message-error" : undefined} onChange={() => clearValidation("message")} />{validation.message && <small className="field-error" id="message-error">{validation.message}</small>}</label>
    <div className="enquiry-upload-field">
      <span className="enquiry-field-label">Photos or documents <small>Optional</small></span>
      <label className={`enquiry-upload ${validation.files ? "is-invalid" : ""}`} htmlFor={uploadId}><FileUp aria-hidden="true" /><strong>{files.length ? "Choose different files" : "Upload photos or documents"}</strong><span>JPG, PNG, WebP or PDF · up to 5 files · 5MB each</span></label>
      <input id={uploadId} className="enquiry-file-input" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={selectFiles} />
      {validation.files && <small className="field-error">{validation.files}</small>}
      {files.length > 0 && <ul className="enquiry-file-list" aria-label="Selected files">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}`}><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)}MB</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(current => current.filter((_, itemIndex) => itemIndex !== index))}><X aria-hidden="true" /></button></li>)}</ul>}
    </div>
    <div className={`enquiry-captcha ${validation.captcha ? "is-invalid" : ""}`}>
      <div><ShieldCheck aria-hidden="true" /><span><strong>Security check</strong><small>Helps us prevent automated enquiries.</small></span></div>
      <div className="enquiry-captcha-answer">
        <label htmlFor={`${uploadId}-captcha`}>{captchaLoading ? "Loading question…" : captcha?.question || "Question unavailable"}</label>
        <input id={`${uploadId}-captcha`} type="text" name="captchaAnswer" inputMode="numeric" autoComplete="off" aria-invalid={Boolean(validation.captcha)} aria-describedby={validation.captcha ? `${uploadId}-captcha-error` : undefined} onChange={() => clearValidation("captcha")} disabled={!captcha || captchaLoading} />
        <input type="hidden" name="captchaToken" value={captcha?.token || ""} />
        <button type="button" onClick={() => void refreshCaptcha()} aria-label="Load a new security question" disabled={captchaLoading}><RefreshCw aria-hidden="true" /></button>
      </div>
      {validation.captcha && <small className="field-error" id={`${uploadId}-captcha-error`}>{validation.captcha}</small>}
    </div>
    <div><label className={`consent ${validation.consent ? "is-invalid" : ""}`}><input type="checkbox" name="consent" required aria-invalid={Boolean(validation.consent)} aria-describedby={validation.consent ? "consent-error" : undefined} onChange={() => clearValidation("consent")} /><span>I agree that Auto Opulence may use these details and uploaded files to respond to my enquiry as explained in the <Link href="/privacy">Privacy Policy</Link>. <b className="required-mark" aria-hidden="true">*</b></span></label>{validation.consent && <small className="field-error" id="consent-error">{validation.consent}</small>}</div>
    {error && <p className="enquiry-error" role="alert">{error}</p>}
    <button type="submit" className="button enquiry-submit" disabled={sending || captchaLoading || !captcha}>{sending ? "Sending…" : <>Send enquiry <Send size={17} /></>}</button>
  </form>;
}
