import { handleSimplyBookPaymentReturn } from "@/lib/simplybook-payment-return";

export const dynamic = "force-dynamic";
export function GET(request: Request) { return handleSimplyBookPaymentReturn(request); }

