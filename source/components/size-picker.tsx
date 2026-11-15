"use client";

import { useEffect } from "react";

// Service pages: tapping a vehicle-size tile highlights it and selects that size in the booking widget. Picking a
// different service in the widget swaps the rest of the page to that service's content in place (no reload, no
// scroll jump): the booking form stays exactly where it is on screen and the address bar updates.
function markSize(size?: string | null) {
  document.querySelectorAll("[data-size-pick].is-selected").forEach(el => el.classList.remove("is-selected"));
  if (size) document.querySelector(`[data-size-pick="${CSS.escape(size)}"]`)?.classList.add("is-selected");
}

async function swapService(path: string, size?: string) {
  const query = size ? `?size=${encodeURIComponent(size)}` : "";
  const fallback = () => window.location.assign(`${path}${query}#book`);
  const main = document.querySelector<HTMLElement>("main.service-page");
  const booking = main?.querySelector<HTMLElement>(":scope > .booking-section");
  if (!main || !booking) return fallback();
  try {
    const response = await fetch(path, { credentials: "same-origin" });
    if (!response.ok) return fallback();
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const next = doc.querySelector<HTMLElement>("main.service-page");
    if (!next?.querySelector(":scope > .booking-section")) return fallback();
    const anchor = booking.getBoundingClientRect().top;
    // Replace everything round the booking section; the booking section itself is never moved (the widget lives in it).
    [...main.children].forEach(child => { if (child !== booking) child.remove(); });
    let before = true;
    for (const child of [...next.children]) {
      if (child.classList.contains("booking-section")) { before = false; continue; }
      const node = document.importNode(child, true);
      if (before) main.insertBefore(node, booking); else main.appendChild(node);
    }
    document.title = doc.title;
    for (const selector of ['meta[name="description"]', 'link[rel="canonical"]', 'meta[property="og:title"]', 'meta[property="og:url"]']) {
      const fresh = doc.head.querySelector(selector), current = document.head.querySelector(selector);
      if (fresh && current) current.replaceWith(document.importNode(fresh, true));
    }
    window.history.pushState({ serviceSwap: true }, "", `${path}${query}`);
    window.scrollBy({ top: booking.getBoundingClientRect().top - anchor, left: 0, behavior: "instant" as ScrollBehavior });
    markSize(size);
  } catch { fallback(); }
}

export function SizePicker() {
  useEffect(() => {
    function pick(event: MouseEvent) {
      const card = (event.target as HTMLElement).closest<HTMLElement>("[data-size-pick]");
      if (!card) return;
      markSize(card.dataset.sizePick);
      window.dispatchEvent(new CustomEvent("crm-booking:select", { detail: { size: card.dataset.sizePick } }));
    }
    function service(event: Event) {
      const detail = (event as CustomEvent<{ url?: string; size?: string }>).detail;
      if (!detail?.url) return;
      let target: URL;
      try { target = new URL(detail.url, window.location.href); } catch { return; }
      const host = (h: string) => h.replace(/^www\./, "");
      if (host(target.host) !== host(window.location.host) || !target.pathname.startsWith("/service/")) return;
      if (target.pathname.replace(/\/$/, "") === window.location.pathname.replace(/\/$/, "")) return;
      void swapService(target.pathname, detail.size);
    }
    // Back/forward after a swap: load that page properly.
    function popstate() { window.location.reload(); }
    markSize(new URLSearchParams(window.location.search).get("size"));
    document.addEventListener("click", pick);
    window.addEventListener("crm-booking:service", service);
    window.addEventListener("popstate", popstate);
    return () => { document.removeEventListener("click", pick); window.removeEventListener("crm-booking:service", service); window.removeEventListener("popstate", popstate); };
  }, []);
  return null;
}
