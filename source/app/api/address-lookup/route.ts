import { handleAddressLookup } from '@/lib/address-lookup';
import { runtimeEnv } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export function GET(request: Request) {
  return handleAddressLookup(request, runtimeEnv('IDEAL_POSTCODES_API_KEY'));
}
