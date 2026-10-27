// Extra copy and FAQs added to a page from the CRM (SEO optimiser / Google Ads optimiser → Apply), from
// lib/crm/page-fixes.json (refreshed on every publish by tools/static-export/fetch-crm.mjs). Rendered just above the
// footer, on the server and in the browser alike, so the page hydrates cleanly.
import fixes from "@/lib/crm/page-fixes.json";

type Copy = { heading?: string; faqHeading?: string; paragraphs?: string[]; faqs?: { question: string; answer: string }[] };
const norm = (p: string) => (p === "/" ? "/" : "/" + String(p || "").replace(/^\/+|\/+$/g, ""));

export function CrmPageCopy() {
  const route = (globalThis as any).__AO_ROUTE as string | undefined;
  if (!route) return null;
  const all = fixes as Record<string, { copy?: Copy | null }>;
  const key = Object.keys(all).find((k) => k !== "*" && norm(k) === norm(route));
  const c = key ? all[key]?.copy : null;
  const paras = (c?.paragraphs || []).filter(Boolean), faqs = (c?.faqs || []).filter((f) => f?.question && f?.answer);
  if (!c || (!paras.length && !faqs.length)) return null;
  const schema = faqs.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) } : null;
  return <section className="crm-page-copy"><div className="shell">
    {c.heading && <h2>{c.heading}</h2>}
    {paras.map((p, i) => <p key={i}>{p}</p>)}
    {faqs.length > 0 && <div className="crm-page-copy__faqs"><h3>{c.faqHeading || "Frequently asked questions"}</h3>
      {faqs.map((f, i) => <details key={f.question} open={i === 0}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</div>}
    </div>
    {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}
  </section>;
}
