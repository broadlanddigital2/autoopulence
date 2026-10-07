// The Cloudflare bindings for the request being handled (variables, secrets and the ASSETS binding).
// A Worker handles one request at a time per isolate for our purposes, and every value here is static config.
export type Env = { ASSETS: { fetch(request: Request | string): Promise<Response> } } & Record<string, unknown>;
export let currentEnv: Env | undefined;
export function setEnv(env: Env) { currentEnv = env; }
