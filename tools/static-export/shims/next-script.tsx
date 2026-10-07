// @ts-nocheck
// Stand-in for next/script: renders nothing on the server and injects the script in the browser after mount
// (matches Next's "afterInteractive" strategy, which is what the site uses for Google tags).
import { useEffect } from "react";
export default function Script({ src, id, children, dangerouslySetInnerHTML, strategy, onLoad, ...rest }) {
  useEffect(() => {
    if (id && document.getElementById(id)) return;
    const el = document.createElement("script");
    if (id) el.id = id;
    for (const [k, v] of Object.entries(rest)) if (typeof v === "string" || v === true) el.setAttribute(k, v === true ? "" : v);
    if (src) { el.src = src; el.async = true; if (onLoad) el.addEventListener("load", onLoad); }
    else el.textContent = typeof children === "string" ? children : dangerouslySetInnerHTML?.__html || "";
    document.body.appendChild(el);
  }, []);
  return null;
}
