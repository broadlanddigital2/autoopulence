"use client";

import { useEffect } from "react";

// Vehicle-size tiles on a service page: tapping one highlights it and selects that size in the booking form
// (the CRM widget listens for "crm-booking:select"), then the link jumps to the form.
export function SizePicker() {
  useEffect(() => {
    function pick(event: MouseEvent) {
      const card = (event.target as HTMLElement).closest<HTMLElement>("[data-size-pick]");
      if (!card) return;
      document.querySelectorAll("[data-size-pick].is-selected").forEach(el => el.classList.remove("is-selected"));
      card.classList.add("is-selected");
      window.dispatchEvent(new CustomEvent("crm-booking:select", { detail: { size: card.dataset.sizePick } }));
    }
    document.addEventListener("click", pick);
    return () => document.removeEventListener("click", pick);
  }, []);
  return null;
}
