import crypto from 'crypto';

/**
 * PHP-style urlencode parity.
 * encodeURIComponent gets us 95% there, but PHP's urlencode:
 *   - encodes spaces as '+' (not '%20')
 *   - leaves '~' unencoded (encodeURIComponent already does this)
 */
function payfastUrlEncode(val: string): string {
  return encodeURIComponent(val.trim())
    .replace(/%20/g, '+');
}

interface TokeniseParams {
  userId: string;
  userEmail: string;
  userName: string;
}

export interface TokeniseFormData {
  action: string;
  fields: Record<string, string>;
}

/**
 * Generates PayFast tokenisation form data for POST submission.
 * PayFast production requires HTML form POST — GET redirects are blocked by CloudFront.
 */
export function generateTokeniseFormData(params: TokeniseParams): TokeniseFormData {
  const isSandbox = String(process.env['PAYFAST_SANDBOX']).trim() === 'true';
  const action = isSandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

  let appUrl = String(process.env['NEXT_PUBLIC_APP_URL']).trim();
  if (!appUrl || appUrl === 'undefined') appUrl = 'https://www.billdog.co.za';
  if (appUrl.endsWith('/')) appUrl = appUrl.slice(0, -1);

  // CRITICAL FIX: Payfast PRODUCTION completely strips 'localhost' out of return_url/cancel_url before computing the hash.
  // This silent removal results in a "Signature Mismatch". We MUST send a valid internet URL to production.
  if (!isSandbox && appUrl.includes('localhost')) {
    appUrl = 'https://www.billdog.co.za';
  }

  // PAYFAST CANONICAL FIELD ORDER — matches the exact order from PayFast's
  // working example. Their docs say ksort() but the hash string they provided
  // uses THIS order. Do NOT alphabetize.
  const PAYFAST_FIELD_ORDER = [
    'merchant_id',
    'merchant_key',
    'return_url',
    'cancel_url',
    'notify_url',
    'name_first',
    'email_address',
    'm_payment_id',
    'amount',
    'item_name',
    'subscription_type',
  ] as const;

  const fieldValues: Record<string, string> = {
    merchant_id: String(process.env['PAYFAST_MERCHANT_ID']).trim(),
    merchant_key: String(process.env['PAYFAST_MERCHANT_KEY']).trim(),
    return_url: `${appUrl}/dashboard?card=saved`,
    cancel_url: `${appUrl}/account?card=cancelled`,
    notify_url: String(process.env['PAYFAST_ITN_URL']).trim(),
    name_first: String(params.userName).split(' ')[0].trim(),
    email_address: String(params.userEmail).trim(),
    m_payment_id: String(params.userId).trim(),
    amount: '5.00',                          // R5 auth/reversal (zero-value not enabled)
    item_name: 'Billdog - Save Card',
    subscription_type: '2',
  };

  // Build ordered data, skipping empty/undefined values
  const orderedData: [string, string][] = [];
  for (const key of PAYFAST_FIELD_ORDER) {
    const val = fieldValues[key];
    if (val && val !== 'undefined') {
      orderedData.push([key, val]);
    }
  }

  // Handle undefined passphrase cleanly
  const rawPassphrase = process.env['PAYFAST_PASSPHRASE'];
  const safePassphrase = (rawPassphrase && rawPassphrase !== 'undefined') ? rawPassphrase.trim() : '';

  // Generate signature using exact field order
  const signature = generateSignature(orderedData, safePassphrase);

  // Build fields object for form submission (order preserved for form)
  const fields: Record<string, string> = {};
  for (const [key, val] of orderedData) {
    fields[key] = val;
  }
  fields.signature = signature;

  return { action, fields };
}


export function generateSignature(orderedPairs: [string, string][], passphrase: string): string {
  // URL-encode each value (PHP urlencode parity), but NOT the passphrase
  const paramString = orderedPairs
    .map(([key, val]) => `${key}=${payfastUrlEncode(val)}`)
    .join('&');

  const withPassphrase = passphrase 
    ? `${paramString}&passphrase=${passphrase.trim()}`
    : paramString;

  return crypto.createHash('md5').update(withPassphrase).digest('hex');
}
