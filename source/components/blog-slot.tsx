"use client";
import { useEffect, useRef } from "react";

// Where the blog goes on the /blog shell page. The worker (worker/src/crm-blog.js) puts the CRM blog list or post into
// this div and also into window.__crmBlog; when React takes over the page it would empty the div, so this puts the
// blog (and its page title) back.
export function BlogSlot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const d = (window as unknown as { __crmBlog?: { title?: string; html?: string } }).__crmBlog;
    if (!d || !ref.current) return;
    if (!ref.current.innerHTML.trim() && d.html) ref.current.innerHTML = d.html;
    if (d.title && document.title !== d.title) document.title = d.title;
  }, []);
  return <div ref={ref} data-crm-blog="slot" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />;
}
