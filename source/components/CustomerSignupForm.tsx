"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, UserPlus } from "lucide-react";
import { simplyBookRequest, type SimplyBookClient } from "@/lib/simplybook";

export function CustomerSignupForm() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirm: "" });
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (name: keyof typeof form, value: string) => setForm(current => ({ ...current, [name]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (form.password !== form.confirm) { setError("Your passwords do not match."); return; }
    if (!accepted) { setError("Please accept the account terms to continue."); return; }
    setBusy(true);
    try {
      await simplyBookRequest<SimplyBookClient>("client/register", { method: "POST", body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), password: form.password, acceptedTerms: accepted }) });
      window.location.assign("/account");
    } catch (error) { setError(error instanceof Error ? error.message : "We could not create your account. Please try again."); setBusy(false); }
  }

  return <form className="customer-auth-form" onSubmit={submit} noValidate>
    <header><UserPlus aria-hidden="true" /><div><p className="kicker">Customer account</p><h1>Create your account.</h1><p>Keep your contact details connected to Auto Opulence and make future bookings quicker.</p></div></header>
    <div className="customer-auth-fields customer-auth-fields--two">
      <label><span>Full name</span><input value={form.name} onChange={event => update("name", event.target.value)} autoComplete="name" required /></label>
      <label><span>Mobile number</span><input type="tel" value={form.phone} onChange={event => update("phone", event.target.value)} autoComplete="tel" required /></label>
      <label className="customer-auth-wide"><span>Email address</span><input type="email" value={form.email} onChange={event => update("email", event.target.value)} autoComplete="email" required /></label>
      <label><span>Password</span><span className="customer-auth-input customer-auth-input--plain"><input type={showPassword ? "text" : "password"} value={form.password} onChange={event => update("password", event.target.value)} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>
      <label><span>Confirm password</span><input type={showPassword ? "text" : "password"} value={form.confirm} onChange={event => update("confirm", event.target.value)} autoComplete="new-password" required /></label>
    </div>
    <label className="customer-auth-consent"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>I agree to my details being used to create and manage my Auto Opulence booking account as explained in the <Link href="/privacy">Privacy Policy</Link>, and accept the <a href="https://simplybook.me/en/terms-and-conditions" target="_blank" rel="noopener noreferrer">booking-platform terms</a>.</span></label>
    {error && <p className="customer-auth-message is-error" role="alert">{error}</p>}
    <div className="customer-auth-actions"><button className="button" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"} <ArrowRight size={17} /></button></div>
    <footer><p>Already have an account?</p><Link href="/login">Login to your account <ArrowRight size={16} /></Link></footer>
  </form>;
}
