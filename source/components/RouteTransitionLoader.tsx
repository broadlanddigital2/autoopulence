"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function RouteTransitionLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  useEffect(() => setActive(false), [pathname, searchParams]);
  useEffect(() => {
    const begin = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === "_blank" || link.hasAttribute("download")) return;
      const target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin || target.href === window.location.href || target.hash && target.pathname === window.location.pathname && target.search === window.location.search) return;
      setActive(true);
    };
    const stop = () => setActive(false);
    document.addEventListener("click", begin); window.addEventListener("pageshow", stop); window.addEventListener("popstate", stop);
    return () => { document.removeEventListener("click", begin); window.removeEventListener("pageshow", stop); window.removeEventListener("popstate", stop); };
  }, []);
  return <div className={`route-loader${active ? " is-active" : ""}`} role="status" aria-live="polite" aria-label="Loading page" aria-hidden={!active}><div className="route-loader__mark"><span className="route-loader__ring" aria-hidden="true" /><span>Loading</span></div></div>;
}
