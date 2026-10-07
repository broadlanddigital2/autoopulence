// Replaces source/lib/runtime-env.ts in the Worker: reads settings from the Cloudflare variables and secrets
// (Workers & Pages → autoopulence → Settings → Variables and Secrets) instead of process.env or secret files.
import { currentEnv } from "../env";
export function runtimeEnv(name: string, fallback = "") {
  const value = currentEnv?.[name];
  return (typeof value === "string" && value.trim()) || fallback;
}
