// Step 0b: refreshes the Auto Opulence vehicle-care catalogue (services, vehicle sizes, extras, packages) from the
// Race Car Graphics CRM into source/lib/crm/vehicle-care.json. The booking form also loads it live in the browser;
// this copy is the fallback shown before that loads. If the CRM can't be reached, the existing file is kept.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.CRM_SUPABASE_URL || "https://dipjypzrfigkzuarlsov.supabase.co";
const KEY = process.env.CRM_SUPABASE_KEY || "sb_publishable_KLK1Ucd9ilVSwzSGL1vkug_3SGGh4NF";
try {
  const res = await fetch(`${URL_}/functions/v1/booking-order-flow`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ action: "public_catalogue" }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  if (!data.services?.length || !data.categories?.length) throw new Error("CRM returned no vehicle-care services");
  const { ok, ...catalogue } = data;
  writeFileSync(path.resolve(HERE, "../../source/lib/crm/vehicle-care.json"), JSON.stringify(catalogue));
  console.log(`CRM: ${catalogue.services.length} vehicle-care services in ${catalogue.categories.length} categories`);
} catch (error) {
  console.warn("Vehicle-care catalogue not refreshed (using the existing file):", error.message);
}
