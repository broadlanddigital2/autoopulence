export type BookingAddress = { id: string; label: string; address1: string; address2: string; city: string; postcode: string };
type PostalAddress = { udprn?: string | number; organisation_name?: string; line_1?: string; line_2?: string; line_3?: string; post_town?: string; postcode?: string };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' } });
const unavailable = 'Address lookup is unavailable right now. Please enter your address below.';

export function normalisePostcode(value: string): string | null {
  const compact = value.toUpperCase().replace(/\s/g, '');
  if (!/^(?:GIR0AA|[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2})$/.test(compact)) return null;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function bookingAddress(address: PostalAddress, index: number): BookingAddress | null {
  const lines = [address.line_1, address.line_2, address.line_3].map(line => (line || '').trim()).filter(Boolean);
  const organisation = (address.organisation_name || '').trim();
  if (organisation && !lines.some(line => line.toLowerCase().includes(organisation.toLowerCase()))) lines.unshift(organisation);
  const postcode = normalisePostcode(address.postcode || '');
  if (!lines.length || !address.post_town || !postcode) return null;
  return { id: String(address.udprn || index), label: [...lines, address.post_town, postcode].join(', '), address1: lines[0], address2: lines.slice(1).join(', '), city: address.post_town, postcode };
}

export async function handleAddressLookup(request: Request, apiKey: string, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return reply({ success: false, error: 'Method not allowed.' }, 405);
  const url = new URL(request.url);
  if ([...url.searchParams.keys()].some(key => key !== 'postcode') || url.searchParams.getAll('postcode').length > 1) return reply({ success: false, error: 'Invalid address lookup request.' }, 400);
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return reply({ success: false, error: 'Please use the address form on this website.' }, 403);
  if (!url.searchParams.has('postcode')) return reply({ success: true, enabled: !!apiKey });
  const value = url.searchParams.get('postcode') || '';
  const postcode = value.length <= 12 ? normalisePostcode(value) : null;
  if (!postcode) return reply({ success: false, error: 'Enter a complete UK postcode, for example NR6 7BW.' }, 400);
  if (!apiKey) return reply({ success: false, error: unavailable }, 503);
  try {
    const upstream = new URL(`https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(postcode)}`);
    upstream.searchParams.set('api_key', apiKey);
    const response = await fetcher(upstream.href, { redirect: 'manual', signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
    if (response.status >= 300 && response.status < 400) return reply({ success: false, error: unavailable }, 502);
    const data = await response.json() as { code?: number; result?: PostalAddress[] };
    if (response.status === 404 || data.code === 4040) return reply({ success: true, postcode, addresses: [] });
    if (!response.ok || data.code !== 2000 || !Array.isArray(data.result)) {
      // Never log the request URL: the existing provider uses a key in its query.
      console.error('Address provider lookup failed', { status: response.status, code: data.code });
      return reply({ success: false, error: unavailable }, 503);
    }
    const addresses = data.result.map(bookingAddress).filter((address): address is BookingAddress => address !== null);
    return reply({ success: true, postcode, addresses });
  } catch { return reply({ success: false, error: unavailable }, 502); }
}

