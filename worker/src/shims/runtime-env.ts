// Replaces source/lib/runtime-env.ts in the Worker: reads settings from the Cloudflare variables and secrets
// (Workers & Pages → autoopulence → Settings → Variables and Secrets) instead of process.env or secret files.
import { currentEnv } from "../env";
// SENDGRID_API_KEY, when set, takes the place of SMTP_PASSWORD (both hold the SendGrid API key).
const aliases: Record<string, string> = { SMTP_PASSWORD: "SENDGRID_API_KEY" };
export function runtimeEnv(name: string, fallback = "") {
  const preferred = aliases[name] && currentEnv?.[aliases[name]];
  if (typeof preferred === "string" && preferred.trim()) return preferred.trim();
  const value = currentEnv?.[name];
  return (typeof value === "string" && value.trim()) || fallback;
}
