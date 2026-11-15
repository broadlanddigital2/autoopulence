"use client";

import { useEffect } from "react";

// Service pages: tapping a vehicle-size tile highlights it and selects that size in the booking widget; picking a
// different service in the widget's dropdown moves to that service's own page (booking form open, size kept).
export function SizePicker() {
  useEffect(() => {
    function pick(event: MouseEvent) {
      const card = (event.target as HTMLElement).closest<HTMLElement>("[data-size-pick]");
      if (!card) return;
      document.querySelectorAll("[data-size-pick].is-selected").forEach(el => el.classList.remove("is-selected"));
      card.classList.add("is-selected");
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
      const query = detail.size ? `?size=${encodeURIComponent(detail.size)}` : "";
      window.location.assign(`${target.pathname}${query}#book`);
    }
    const linked = new URLSearchParams(window.location.search).get("size");
    if (linked) document.querySelector(`[data-size-pick="${CSS.escape(linked)}"]`)?.classList.add("is-selected");
    document.addEventListener("click", pick);
    window.addEventListener("crm-booking:service", service);
    return () => { document.removeEventListener("click", pick); window.removeEventListener("crm-booking:service", service); };
  }, []);
  return null;
}
