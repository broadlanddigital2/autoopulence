import { handleAddressLookup } from '@/lib/address-lookup';
import { runtimeEnv } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// The CRM's own postcode lookup (key: Auto Opulence website, CRM → Workspace → Postcode lookup). The key is public
// and only works from autoopulence.co.uk. IDEAL_POSTCODES_API_KEY is only used if POSTCODE_LOOKUP_KEY is set to it.
const KEY = 'pk_fb10a3e615a20434f6e5d99c';
export function GET(request: Request) {
  return handleAddressLookup(request, runtimeEnv('POSTCODE_LOOKUP_KEY') || KEY);
}
