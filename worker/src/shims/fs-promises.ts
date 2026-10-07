// Replaces node:fs/promises in the Worker. The only file the API code reads is an email image in public/,
// which is served from the site's own static files through the ASSETS binding.
import { currentEnv } from "../env";
export async function readFile(file: string) {
  const i = file.replace(/\\/g, "/").lastIndexOf("/public/");
  if (i < 0 || !currentEnv) throw new Error(`File not available in the Worker: ${file}`);
  const res = await currentEnv.ASSETS.fetch(new Request("https://assets.local" + file.slice(i + 7)));
  if (!res.ok) throw new Error(`Asset not found: ${file.slice(i + 7)}`);
  return Buffer.from(await res.arrayBuffer());
}
export default { readFile };
