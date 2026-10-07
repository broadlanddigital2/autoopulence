const encoder = new TextEncoder();
const minimumSolveTime = 1500;
const maximumChallengeAge = 20 * 60 * 1000;

type CaptchaPayload = {
  a: number;
  b: number;
  issuedAt: number;
  nonce: string;
};

function base64UrlEncode(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createCaptchaChallenge(secret: string) {
  const random = new Uint32Array(2);
  crypto.getRandomValues(random);
  const payload: CaptchaPayload = {
    a: (random[0] % 8) + 2,
    b: (random[1] % 8) + 2,
    issuedAt: Date.now(),
    nonce: crypto.randomUUID(),
  };
  const encoded = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  return {
    question: `What is ${payload.a} + ${payload.b}?`,
    token: `${encoded}.${await sign(encoded, secret)}`,
  };
}

export async function verifyCaptchaChallenge(token: string, answer: string, secret: string) {
  try {
    const [encoded, suppliedSignature, extra] = token.split(".");
    if (!encoded || !suppliedSignature || extra) return false;
    const expectedSignature = await sign(encoded, secret);
    if (suppliedSignature !== expectedSignature) return false;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded))) as CaptchaPayload;
    const elapsed = Date.now() - payload.issuedAt;
    if (elapsed < minimumSolveTime || elapsed > maximumChallengeAge) return false;
    return Number(answer) === payload.a + payload.b;
  } catch {
    return false;
  }
}
