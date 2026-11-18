// Step 0 of the static export: pulls the page fixes made in the CRM (SEO optimiser and Google Ads optimiser → Apply)
// into source/lib/crm/page-fixes.json. render.mjs applies the SEO titles and descriptions; the extra copy and FAQs are
// rendered by components/crm-page-copy.tsx. If the CRM can't be reached, the existing file is kept.
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.CRM_SUPABASE_URL || "https://dipjypzrfigkzuarlsov.supabase.co";
const KEY = process.env.CRM_SUPABASE_KEY || "sb_publishable_KLK1Ucd9ilVSwzSGL1vkug_3SGGh4NF";
const SITE = "e109dff0-3dc0-4e51-a338-6e9033862324";
const file = resolve(HERE, "../../source/lib/crm/page-fixes.json");
try {
  const res = await fetch(`${URL_}/rest/v1/site_page_fixes?select=path,meta_title,meta_description,h1,alts,copy&site_id=eq.${SITE}&order=path`, { headers: { apikey: KEY, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const rows = await res.json();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(Object.fromEntries(rows.map(({ path, ...f }) => [path, f])), null, 1) + "\n");
  console.log(`CRM: ${rows.length} page fixes`);
} catch (error) {
  console.warn("Page fixes not refreshed (using the existing file):", error.message);
}

// Page headings per Google Ads ad group (CRM: Marketing → Ads → campaign → Page headings) → source/lib/crm/
// ad-headings.json. The worker (worker/src/ad-headings.js) swaps the page's H1 for clicks from that ad group (?ag=<id>).
const headingsFile = resolve(HERE, "../../source/lib/crm/ad-headings.json");
try {
  const res = await fetch(`${URL_}/rest/v1/ad_landing_headings?select=ad_group_id,path,h1,subheading&site_id=eq.${SITE}&order=ad_group_id`, { headers: { apikey: KEY, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const rows = await res.json();
  const out = Object.fromEntries(rows.filter((r) => r.ad_group_id && r.path && r.h1).map((r) => [String(r.ad_group_id), { path: r.path, h1: r.h1, ...(r.subheading ? { subheading: r.subheading } : {}) }]));
  mkdirSync(dirname(headingsFile), { recursive: true });
  writeFileSync(headingsFile, JSON.stringify(out, null, 1) + "\n");
  console.log(`CRM: ${rows.length} ad group page headings`);
} catch (error) {
  console.warn("Ad group page headings not refreshed (using the existing file):", error.message);
}
