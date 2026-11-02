// Keyword sections and FAQs for a page, from lib/page-seo.ts (SEO optimiser, Nov 2026). Rendered at the end of the
// page's <main>, so the copy counts as page content. FAQs get FAQPage schema unless the page already has its own FAQs.
import { seoFor } from "@/lib/page-seo";
import { getService, getServicePrices, sizeOptions } from "@/lib/services";

function priceText(slug: string) {
  const found = getService(slug);
  if (!found) return "";
  const { service } = found;
  const prices = getServicePrices(service);
  const sized = sizeOptions.filter((s) => prices[s.key].display !== "POA").map((s) => ({ name: s.name.toLowerCase(), price: prices[s.key].display }));
  if (!sized.length) return "Contact us for a price for your vehicle.";
  const extra = service.isAddOn ? " on top of a suitable main service" : "";
  if (sized.every((s) => s.price === sized[0].price)) return `It costs ${sized[0].price}${extra}${sized.length < 4 ? " for most vehicles" : ", whatever the vehicle size"}.`;
  return `Prices are ${sized.map((s) => `${s.price} for ${/^[aeiou]/.test(s.name) ? "an" : "a"} ${s.name} vehicle`).join(", ").replace(/, ([^,]*)$/, " and $1")}${extra}.`;
}

export function SeoExtra({ path, withFaqSchema = true }: { path: string; withFaqSchema?: boolean }) {
  const seo = seoFor(path);
  if (!seo || (!seo.sections?.length && !seo.faqs?.length)) return null;
  const slug = path.startsWith("/service/") ? path.slice("/service/".length) : "";
  const sections = (seo.sections || []).map((s) => ({ ...s, text: s.text.replace("{prices}", slug ? priceText(slug) : "").trim() }));
  const faqs = seo.faqs || [];
  const schema = withFaqSchema && faqs.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) } : null;
  return <section className="crm-page-copy seo-page-copy"><div className="shell">
    {seo.kicker && <p className="kicker">{seo.kicker}</p>}
    {sections.map((s) => <div className="seo-page-copy__block" key={s.heading}><h2>{s.heading}</h2>{s.text && <p>{s.text}</p>}</div>)}
    {faqs.length > 0 && <div className="crm-page-copy__faqs"><h2>{seo.faqHeading || "Frequently asked questions"}</h2>
      {faqs.map((f, i) => <details key={f.question} open={i === 0}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</div>}
    </div>
    {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}
  </section>;
}
