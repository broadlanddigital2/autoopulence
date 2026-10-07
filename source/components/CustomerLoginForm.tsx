"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { simplyBookRequest, type SimplyBookClient } from "@/lib/simplybook";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "We could not sign you in. Please try again.";

export function CustomerLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    simplyBookRequest<SimplyBookClient | null>("client/session", { signal: controller.signal })
      .then(client => { if (client && !controller.signal.aborted) window.location.replace("/account"); })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setResetSent(false);
    try {
      await simplyBookRequest<SimplyBookClient>("client/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
      const requested = new URLSearchParams(window.location.search).get("return");
      window.location.assign(requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/account");
    } catch (error) { setError(errorMessage(error)); setBusy(false); }
  }

  async function remindPassword() {
    if (!email.trim()) { setError("Enter your email address first, then choose forgotten password."); return; }
    setBusy(true); setError("");
    try {
      await simplyBookRequest("client/remind-password", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setResetSent(true);
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return <form className="customer-auth-form" onSubmit={submit} noValidate>
    <header><LockKeyhole aria-hidden="true" /><div><p className="kicker">Customer account</p><h1>Login to Auto Opulence.</h1><p>Use the account connected to your bookings to manage your details and book your next visit.</p></div></header>
    <div className="customer-auth-fields">
      <label><span>Email address</span><span className="customer-auth-input"><Mail aria-hidden="true" /><input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required disabled={busy || checking} /></span></label>
      <label><span>Password</span><span className="customer-auth-input"><LockKeyhole aria-hidden="true" /><input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required disabled={busy || checking} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button></span></label>
    </div>
    {error && <p className="customer-auth-message is-error" role="alert">{error}</p>}
    {resetSent && <p className="customer-auth-message is-success" role="status">If an account matches that email, password reset instructions have been sent.</p>}
    <div className="customer-auth-actions"><button className="button" type="submit" disabled={busy || checking}>{checking ? "Checking account…" : busy ? "Signing in…" : "Login"} <ArrowRight size={17} /></button><button type="button" className="customer-auth-text-button" onClick={remindPassword} disabled={busy || checking}>Forgotten password?</button></div>
    <footer><p>New to Auto Opulence?</p><Link href="/signup">Create a customer account <ArrowRight size={16} /></Link><Link href="/#book">Continue to booking</Link></footer>
  </form>;
}
