import { readFileSync } from "node:fs";

function readSecretFile(path: string) {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
}

/**
 * Reads a normal environment variable first, then Docker's conventional
 * VARIABLE_FILE path, then /run/secrets/VARIABLE.
 */
export function runtimeEnv(name: string, fallback = "") {
  const direct = process.env[name]?.trim();
  if (direct) return direct;

  const configuredFile = process.env[`${name}_FILE`]?.trim();
  if (configuredFile) {
    const configuredValue = readSecretFile(configuredFile);
    if (configuredValue) return configuredValue;
  }

  const dockerValue = readSecretFile(`/run/secrets/${name}`);
  return dockerValue || fallback;
}
