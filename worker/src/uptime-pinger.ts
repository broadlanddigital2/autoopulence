// External uptime pinger for the CRM. It runs on Cloudflare (this Worker's cron trigger, every 5 minutes), outside the
// CRM's own hosting (Supabase), so it still works when the CRM or its database is down — the one thing the CRM's own
// Monitoring page can't report. Two failures in a row send a "down" email; the next pass sends "back up".
// State lives in the UPTIME_PINGER KV namespace (written only when something changes). Emails go through SendGrid with
// this site's existing key (SMTP_PASSWORD). Recipients: ALERT_EMAILS (comma separated) in wrangler.jsonc vars.
type KV = { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> };
type PingerEnv = { UPTIME_PINGER?: KV; SMTP_PASSWORD?: unknown; ALERT_EMAILS?: unknown; SMTP_FROM_EMAIL?: unknown };
type Target = { name: string; url: string; check: (r: Response) => Promise<string | null> };

const TARGETS: Target[] = [
  { name: "CRM (staff.racecargraphics.uk)", url: "https://staff.racecargraphics.uk/",
    check: async (r) => r.ok ? ((await r.text()).includes("Race Car Graphics") ? null : "page loaded but looks wrong") : `HTTP ${r.status}` },
  { name: "CRM database, functions and monitoring", url: "https://dipjypzrfigkzuarlsov.supabase.co/functions/v1/monitor?heartbeat=1",
    check: async (r) => {
      if (!r.ok) return `HTTP ${r.status}`;
      const j = await r.json().catch(() => ({})) as { ok?: boolean; last_run_minutes_ago?: number | null };
      return j.ok ? null : `the CRM's monitoring hasn't run for ${j.last_run_minutes_ago ?? "?"} minutes (scheduled jobs may have stopped)`;
    } },
  { name: "CRM booking and search scripts", url: "https://crm.racecargraphics.uk/embed/booking.js",
    check: async (r) => r.ok ? null : `HTTP ${r.status}` },
  { name: "Race Car Graphics website", url: "https://racecargraphics.uk/",
    check: async (r) => r.ok ? null : `HTTP ${r.status}` },
];

async function probe(t: Target): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(t.url, { headers: { "User-Agent": "RCG-Uptime-Pinger/1.0 (Cloudflare)" }, signal: AbortSignal.timeout(15000), redirect: "follow" });
      const problem = await t.check(r);
      if (!problem) return null;
      if (attempt) return problem;
    } catch (error) {
      if (attempt) return error instanceof Error ? (error.name === "TimeoutError" ? "no answer within 15 seconds" : error.message) : "request failed";
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

async function email(env: PingerEnv, subject: string, text: string) {
  const key = String(env.SMTP_PASSWORD || ""), to = String(env.ALERT_EMAILS || "").split(/[\s,;]+/).filter((e) => e.includes("@"));
  if (!key || !to.length) { console.error("Uptime pinger: no SendGrid key or ALERT_EMAILS"); return; }
  const r = await fetch("https://api.sendgrid.com/v3/mail/send", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ personalizations: [{ to: to.map((email) => ({ email })) }], from: { email: String(env.SMTP_FROM_EMAIL || "valeting@autoopulence.co.uk"), name: "CRM uptime alert" },
      subject, content: [{ type: "text/plain", value: text + "\n\nMonitoring: https://staff.racecargraphics.uk/dashboard/monitoring\n(Sent by the external pinger on Cloudflare, every 5 minutes.)" }] }) });
  if (!r.ok) console.error("Uptime pinger email failed", r.status, await r.text().catch(() => ""));
}

export async function runUptimePinger(env: PingerEnv) {
  const kv = env.UPTIME_PINGER;
  const before = JSON.parse((kv && await kv.get("state")) || "{}") as Record<string, { fails: number; since?: string; alerted?: boolean; problem?: string }>;
  const state = JSON.parse(JSON.stringify(before)) as typeof before;
  const results = await Promise.all(TARGETS.map(async (t) => ({ t, problem: await probe(t) })));
  const down: string[] = [], up: string[] = [];
  const now = new Date();
  for (const { t, problem } of results) {
    const s = state[t.name] || { fails: 0 };
    if (problem) {
      s.fails += 1; s.problem = problem; s.since = s.since || now.toISOString();
      if (s.fails >= 2 && !s.alerted) { s.alerted = true; down.push(`${t.name}: ${problem} (since ${new Date(s.since).toLocaleString("en-GB", { timeZone: "Europe/London" })})`); }
    } else {
      if (s.alerted) up.push(`${t.name} is working again (was down from ${new Date(s.since || now).toLocaleString("en-GB", { timeZone: "Europe/London" })})`);
      state[t.name] = { fails: 0 }; continue;
    }
    state[t.name] = s;
  }
  if (down.length) await email(env, `DOWN: ${down.length === 1 ? down[0].split(":")[0] : down.length + " CRM services"}`, "The external pinger can't reach:\n\n" + down.map((d) => "• " + d).join("\n"));
  if (up.length) await email(env, `Back up: ${up.length === 1 ? up[0].split(" is working")[0] : up.length + " CRM services"}`, up.map((d) => "• " + d).join("\n"));
  if (kv && JSON.stringify(state) !== JSON.stringify(before)) await kv.put("state", JSON.stringify(state));
  return results.map(({ t, problem }) => ({ name: t.name, ok: !problem, problem }));
}
