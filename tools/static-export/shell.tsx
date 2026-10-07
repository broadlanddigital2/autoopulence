// @ts-nocheck
// What app/layout.tsx wraps around every page (the <body> contents), used on the server and in the browser.
import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { CookieConsent } from "@/components/CookieConsent";
import { RouteTransitionLoader } from "@/components/RouteTransitionLoader";
export function Shell({ children }) {
  return <><Suspense fallback={null}><RouteTransitionLoader /></Suspense>{children}<a className="whatsapp-launcher" href="https://wa.me/+447383563859" target="_blank" rel="noopener noreferrer" aria-label="Chat with Auto Opulence on WhatsApp"><MessageCircle aria-hidden="true" /></a><CookieConsent /></>;
}
export function resolveRoute(route, staticPages, dynamicPages) {
  if (route in staticPages) return { key: route, params: {} };
  const i = route.lastIndexOf("/");
  const base = route.slice(0, i), slug = route.slice(i + 1);
  if (base && base in dynamicPages) return { key: base, params: { slug }, dynamic: true };
  return null;
}
export async function renderPage(mod, params) {
  return await mod.default({ params: Promise.resolve(params), searchParams: Promise.resolve({}) });
}
