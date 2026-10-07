import { createCaptchaChallenge } from "@/lib/enquiry-captcha";
import { runtimeEnv } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const secret = runtimeEnv("ENQUIRY_CAPTCHA_SECRET") || runtimeEnv("SMTP_PASSWORD");
  if (!secret) return Response.json({ error: "Security check unavailable." }, { status: 503 });
  return Response.json(await createCaptchaChallenge(secret), {
    headers: { "cache-control": "no-store, max-age=0" },
  });
}
