import { handleSimplyBookPaymentReturn } from "@/lib/simplybook-payment-return";

// Compatibility for checkout links created before the callback separator fix.
export const dynamic = "force-dynamic";
export function GET(request: Request) { return handleSimplyBookPaymentReturn(request); }

