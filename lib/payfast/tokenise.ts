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

  const data: Record<string, string> = {
    merchant_id: String(process.env['PAYFAST_MERCHANT_ID']).trim(),
    merchant_key: String(process.env['PAYFAST_MERCHANT_KEY']).trim(),
    return_url: `${appUrl}/dashboard?card=saved`,
    cancel_url: `${appUrl}/settings?card=cancelled`,
    notify_url: String(process.env['PAYFAST_ITN_URL']).trim(),
    name_first: String(params.userName).split(' ')[0].trim(),
    email_address: String(params.userEmail).trim(),
    m_payment_id: String(params.userId).trim(),
    amount: '0.00',
    item_name: 'Billdog - Save Card',
    subscription_type: '2',
    email_confirmation: '0',
  };

  // Drop empty or undefined values to avoid breaking signature
  const cleanData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== '' && v !== 'undefined') cleanData[k] = v;
  }

  // Generate signature
  const signature = generateSignature(cleanData, String(process.env['PAYFAST_PASSPHRASE']).trim());
  cleanData.signature = signature;

  return { action, fields: cleanData };
}

export function generateSignature(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.entries(data)
    .filter(([key]) => key !== 'signature')
    .map(([key, val]) => `${key}=${encodeURIComponent((val ?? '').trim()).replace(/%20/g, '+')}`)
    .join('&');

  const withPassphrase = `${paramString}&passphrase=${encodeURIComponent((passphrase ?? '').trim())}`;
  return crypto.createHash('md5').update(withPassphrase).digest('hex');
}
