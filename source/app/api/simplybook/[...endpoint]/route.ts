import { handleSimplyBook } from "@/lib/simplybook-server";
import { runtimeEnv } from "@/lib/runtime-env";
import { sendPackageBookingConfirmationEmail } from "@/lib/sendgrid-smtp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
function handle(request: Request) {
  const smtpPassword = runtimeEnv("SMTP_PASSWORD");
  return handleSimplyBook(request, {
    company: runtimeEnv("SIMPLYBOOK_COMPANY_LOGIN", "racecargraphics"),
    restKey: runtimeEnv("SIMPLYBOOK_REST_API_KEY"),
    rpcKey: runtimeEnv("SIMPLYBOOK_RPC_API_KEY"),
    secretKey: runtimeEnv("SIMPLYBOOK_SECRET_API_KEY"),
    sessionSecret: runtimeEnv("SIMPLYBOOK_SESSION_SECRET"),
    ...(smtpPassword ? { sendBookingEmail: (details: Parameters<typeof sendPackageBookingConfirmationEmail>[1]) => sendPackageBookingConfirmationEmail({
      host: runtimeEnv("SMTP_SERVER", "smtp.sendgrid.net"),
      port: Number(runtimeEnv("SMTP_PORT", "587")),
      username: runtimeEnv("SMTP_USERNAME", "apikey"),
      password: smtpPassword,
      fromEmail: runtimeEnv("SMTP_FROM_EMAIL", "valeting@autoopulence.co.uk"),
      fromName: runtimeEnv("SMTP_FROM_NAME", "Auto Opulence Website"),
      toEmail: runtimeEnv("SMTP_TO_EMAIL", "valeting@autoopulence.co.uk"),
      ccEmail: runtimeEnv("SMTP_CC_EMAIL") || undefined,
    }, details) } : {}),
  });
}
export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
