import crypto from 'crypto';

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

  const data: Record<string, string> = {
    merchant_id: String(process.env['PAYFAST_MERCHANT_ID']).trim(),
    merchant_key: String(process.env['PAYFAST_MERCHANT_KEY']).trim(),
    return_url: `${appUrl}/dashboard?card=saved`,
    cancel_url: `${appUrl}/settings?card=cancelled`,
    notify_url: String(process.env['PAYFAST_ITN_URL']).trim(),
    name_first: String(params.userName).split(' ')[0].trim(),
    email_address: String(params.userEmail).trim(),
    m_payment_id: String(params.userId).trim(),
    amount: '0.00',                          // Zero charge — tokenise only
    item_name: 'Billdog - Save Card',
    subscription_type: '2',
  };

  // Alphabetize keys as per PayFast strict MD5 spec to prevent browser/JSON object reordering
  const sortedData: Record<string, string> = {};
  Object.keys(data).sort().forEach(key => {
    if (data[key] !== '' && data[key] !== 'undefined' && data[key] !== undefined) {
      sortedData[key] = data[key];
    }
  });

  // Handle undefined passphrase cleanly
  const rawPassphrase = process.env['PAYFAST_PASSPHRASE'];
  const safePassphrase = (rawPassphrase && rawPassphrase !== 'undefined') ? rawPassphrase.trim() : '';

  // Generate signature
  const gen = generateSignature(sortedData, safePassphrase);
  sortedData.signature = gen.signature;

  return { action, fields: sortedData, debugString: gen.debugString };
}

// Ensure 100% parity with PHP's urlencode() for PayFast strict signature validation
function payfastUrlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

export function generateSignature(data: Record<string, string>, passphrase: string): { signature: string, debugString: string } {
  const paramString = Object.entries(data)
    .filter(([key]) => key !== 'signature' && key !== 'debugString')
    .map(([key, val]) => `${key}=${payfastUrlEncode((val ?? '').trim())}`)
    .join('&');

  const withPassphrase = passphrase 
    ? `${paramString}&passphrase=${payfastUrlEncode(passphrase)}`
    : paramString;

  return {
    signature: crypto.createHash('md5').update(withPassphrase).digest('hex'),
    debugString: withPassphrase
  };
}
