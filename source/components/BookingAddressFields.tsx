'use client';

import { useEffect, useRef, useState } from 'react';
import type { BookingAddress } from '@/lib/address-lookup';

type Props = { postcode: string; city: string; onPostcodeChange: (value: string) => void; onCityChange: (value: string) => void; namePrefix?: string; errors?: Record<string, string> };
export function BookingAddressFields({ postcode, city, onPostcodeChange, onCityChange, namePrefix = '', errors = {} }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [addresses, setAddresses] = useState<BookingAddress[]>([]);
  const [selection, setSelection] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const lookupController = useRef<AbortController | null>(null);
  const line1 = useRef<HTMLInputElement>(null);
  const line2 = useRef<HTMLInputElement>(null);
  const fieldName = (name: string) => `${namePrefix}${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  const names = namePrefix ? { postcode: fieldName('postcode'), address1: fieldName('address1'), address2: fieldName('address2'), city: fieldName('city') } : { postcode: 'postcode', address1: 'address1', address2: 'address2', city: 'city' };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/address-lookup', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() as Promise<{ enabled?: boolean }> : null)
      .then(result => { if (!controller.signal.aborted) setEnabled(result?.enabled === true); })
      .catch(() => {});
    return () => { controller.abort(); lookupController.current?.abort(); };
  }, []);

  function changePostcode(value: string) {
    lookupController.current?.abort(); setBusy(false); setAddresses([]); setStatus('');
    if (selection && value.replace(/\s/g, '').toUpperCase() !== postcode.replace(/\s/g, '').toUpperCase()) {
      if (line1.current) line1.current.value = '';
      if (line2.current) line2.current.value = '';
      onCityChange('');
    }
    setSelection(''); onPostcodeChange(value);
  }

  async function findAddress() {
    lookupController.current?.abort();
    const controller = new AbortController(); lookupController.current = controller;
    setBusy(true); setStatus(''); setAddresses([]); setSelection('');
    try {
      const response = await fetch(`/api/address-lookup?postcode=${encodeURIComponent(postcode.trim())}`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
      const result = await response.json() as { success: boolean; postcode?: string; addresses?: BookingAddress[]; error?: string };
      if (controller.signal.aborted) return;
      if (!response.ok || !result.success) throw new Error(result.error || 'Address lookup is unavailable. Enter your address below.');
      if (result.postcode) onPostcodeChange(result.postcode);
      setAddresses(result.addresses || []);
      setStatus(result.addresses?.length ? 'Choose your address from the list.' : 'No addresses were found. Check the postcode or enter your address below.');
    } catch (error) {
      if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'Enter your address below.');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function selectAddress(id: string) {
    setSelection(id);
    const address = addresses.find(item => item.id === id);
    if (!address) return;
    if (line1.current) line1.current.value = address.address1;
    if (line2.current) line2.current.value = address.address2;
    onCityChange(address.city); onPostcodeChange(address.postcode);
    setStatus('Address filled in. Please check the details below.');
  }

  return <>
    <div className="booking-postcode-row">
      <label className="booking-field"><span>Postcode</span><input name={names.postcode} value={postcode} onChange={event => changePostcode(event.target.value)} autoComplete={namePrefix ? 'shipping postal-code' : 'billing postal-code'} maxLength={12} required aria-invalid={Boolean(errors[names.postcode])} />{errors[names.postcode] && <small className="checkout-field-error">{errors[names.postcode]}</small>}</label>
      {enabled && <><button type="button" className="button button--lime" disabled={busy || !postcode.trim()} onClick={findAddress}>{busy ? 'Finding addresses…' : 'Find address'}</button><button type="button" className="booking-manual-address" onClick={() => { lookupController.current?.abort(); setBusy(false); setAddresses([]); setSelection(''); setStatus('Enter your address below.'); line1.current?.focus(); }}>Enter manually</button></>}
    </div>
    {status && <p className="booking-address-status" role="status">{status}</p>}
    {addresses.length > 0 && <label className="booking-field booking-address-select"><span>Select your address</span><select value={selection} onChange={event => selectAddress(event.target.value)}><option value="">Choose an address</option>{addresses.map(address => <option key={address.id} value={address.id}>{address.label}</option>)}</select></label>}
    <div className="booking-form-grid">
      <label className="booking-field"><span>Address line 1</span><input ref={line1} name={names.address1} autoComplete={namePrefix ? 'shipping address-line1' : 'billing address-line1'} maxLength={200} placeholder="House number or name and street" required aria-invalid={Boolean(errors[names.address1])} />{errors[names.address1] && <small className="checkout-field-error">{errors[names.address1]}</small>}</label>
      <label className="booking-field"><span>Address line 2</span><input ref={line2} name={names.address2} autoComplete={namePrefix ? 'shipping address-line2' : 'billing address-line2'} maxLength={200} /></label>
      <label className="booking-field"><span>Town or city</span><input name={names.city} autoComplete={namePrefix ? 'shipping address-level2' : 'billing address-level2'} value={city} onChange={event => onCityChange(event.target.value)} maxLength={100} required aria-invalid={Boolean(errors[names.city])} />{errors[names.city] && <small className="checkout-field-error">{errors[names.city]}</small>}</label>
    </div>
  </>;
}

