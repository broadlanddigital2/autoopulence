"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";

const storageKey = "ao_cookie_consent";
const analyticsId = "G-9WZ6VX5PJM";
const googleAdsId = "AW-18472955918";
type Choice = "accepted" | "rejected";

function clearAnalyticsCookies() {
  document.cookie.split(";").map(value => value.trim().split("=")[0]).filter(name => name === "_ga" || name.startsWith("_ga_") || name.startsWith("_gcl_")).forEach(name => {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${name}=; Path=/; Domain=.${window.location.hostname}; Max-Age=0; SameSite=Lax`;
  });
}

export function CookieConsent() {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "accepted" || saved === "rejected") setChoice(saved);
    else setOpen(true);
    const showSettings = () => setOpen(true);
    window.addEventListener("ao:cookie-settings", showSettings);
    return () => window.removeEventListener("ao:cookie-settings", showSettings);
  }, []);

  function save(next: Choice) {
    const withdrawing = choice === "accepted" && next === "rejected";
    window.localStorage.setItem(storageKey, next);
    setChoice(next);
    setOpen(false);
    if (next === "rejected") clearAnalyticsCookies();
    if (withdrawing) window.location.reload();
  }

  return <>
    {choice === "accepted" && <>
      <Script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`} strategy="afterInteractive" />
      <Script id="google-tags" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${googleAdsId}');gtag('config','${analyticsId}',{'anonymize_ip':true});`}</Script>
    </>}
    {open && <section className="cookie-consent" role="dialog" aria-modal="false" aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-description">
      <div><strong id="cookie-consent-title">Your cookie choices</strong><p id="cookie-consent-description">We use essential technology for secure bookings and customer accounts. With your permission, Google Analytics, Google Ads and our own visit recorder (which replays how pages are used, with anything you type hidden) help us understand how the website is used and measure advertising performance.</p><nav aria-label="Cookie information"><Link href="/cookies">Cookie Policy</Link><Link href="/privacy">Privacy Policy</Link></nav></div>
      <div className="cookie-consent-actions"><button type="button" className="button button--ghost" onClick={() => save("rejected")}>Reject analytics</button><button type="button" className="button" onClick={() => save("accepted")}>Accept analytics</button></div>
    </section>}
  </>;
}

export function CookieSettingsButton() {
  return <button type="button" className="button policy-cookie-settings" onClick={() => window.dispatchEvent(new Event("ao:cookie-settings"))}>Review or change cookie settings</button>;
}
