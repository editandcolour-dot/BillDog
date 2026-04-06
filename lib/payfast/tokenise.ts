import crypto from 'crypto';

interface TokeniseParams {
  userId: string;
  userEmail: string;
  userName: string;
}

export function generateTokeniseUrl(params: TokeniseParams): string {
  const baseUrl = String(process.env['PAYFAST_SANDBOX']).trim() === 'true'
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

  // PayFast signature spec states to drop trailing empty strings, but for predictable order:
  // we will construct a clean object dropping any empty ones to avoid breaking ITNs
  const cleanData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== '' && v !== 'undefined') cleanData[k] = v;
  }

  // Generate signature
  const signature = generateSignature(cleanData, String(process.env['PAYFAST_PASSPHRASE']).trim());
  cleanData.signature = signature;

  // Build query string
  const queryString = Object.entries(cleanData)
    .map(([key, val]) => `${key}=${encodeURIComponent(val).replace(/%20/g, '+')}`)
    .join('&');

  return `${baseUrl}?${queryString}`;
}

export function generateSignature(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.entries(data)
    .filter(([key]) => key !== 'signature')
    .map(([key, val]) => `${key}=${encodeURIComponent((val ?? '').trim()).replace(/%20/g, '+')}`)
    .join('&');

  const withPassphrase = `${paramString}&passphrase=${encodeURIComponent((passphrase ?? '').trim())}`;
  return crypto.createHash('md5').update(withPassphrase).digest('hex');
}
