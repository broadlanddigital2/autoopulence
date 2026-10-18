"use client";
// Header "Customer login": when the customer is signed in (the CRM booking widget keeps the session in this site's
// localStorage), it becomes "My account" + "Log out". Updates live when the widget signs in or out.
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";

const KEYS = ["crm-booking-session", "ao-care-session", "rcg-care-session"];
const CRM_URL = "https://dipjypzrfigkzuarlsov.supabase.co";
const CRM_PUBLISHABLE_KEY = "sb_publishable_KLK1Ucd9ilVSwzSGL1vkug_3SGGh4NF";
function session(): { access_token?: string } | null {
  try { for (const k of KEYS) { const v = localStorage.getItem(k) || sessionStorage.getItem(k); if (v) return JSON.parse(v); } } catch { /* storage blocked */ }
  return null;
}

export function CustomerLogin({ mobile = false }: { mobile?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const check = () => setSignedIn(!!session()?.access_token);
    check();
    window.addEventListener("crm-session-change", check); window.addEventListener("storage", check); window.addEventListener("focus", check);
    return () => { window.removeEventListener("crm-session-change", check); window.removeEventListener("storage", check); window.removeEventListener("focus", check); };
  }, []);
  async function logOut() {
    const s = session();
    try { for (const k of KEYS) { localStorage.removeItem(k); sessionStorage.removeItem(k); } } catch { /* storage blocked */ }
    setSignedIn(false);
    if (s?.access_token) await fetch(`${CRM_URL}/auth/v1/logout`, { method: "POST", headers: { apikey: CRM_PUBLISHABLE_KEY, Authorization: `Bearer ${s.access_token}` } }).catch(() => undefined);
    location.assign("/");
  }
  if (mobile) return signedIn
    ? <><Link href="/account" className="mobile-account"><UserRound size={17} aria-hidden="true" /> My account</Link><button type="button" className="mobile-account mobile-logout" onClick={() => void logOut()}><LogOut size={17} aria-hidden="true" /> Log out</button></>
    : <Link href="/login" className="mobile-account"><UserRound size={17} aria-hidden="true" /> Customer login</Link>;
  return signedIn
    ? <><Link href="/account" className="customer-login-link" aria-label="My account"><UserRound size={17} aria-hidden="true" /><span>My account</span></Link>
      <button type="button" className="customer-login-link customer-logout" aria-label="Log out" onClick={() => void logOut()}><LogOut size={17} aria-hidden="true" /><span>Log out</span></button></>
    : <Link href="/login" className="customer-login-link" aria-label="Customer login"><UserRound size={17} aria-hidden="true" /><span>Customer login</span></Link>;
}
