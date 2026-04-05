import crypto from 'crypto';

interface TokeniseParams {
  userId: string;
  userEmail: string;
  userName: string;
}

export function generateTokeniseUrl(params: TokeniseParams): string {
  const baseUrl = process.env['PAYFAST_SANDBOX'] === 'true'
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

  // Using PAYFAST_SANDBOX because the skill states PAYFAST_MODE, but the user's .env.local uses PAYFAST_SANDBOX=true

  let appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://www.billdog.co.za';
  if (appUrl.endsWith('/')) appUrl = appUrl.slice(0, -1);

  const data: Record<string, string> = {
    merchant_id: process.env['PAYFAST_MERCHANT_ID']!,
    merchant_key: process.env['PAYFAST_MERCHANT_KEY']!,
    return_url: `${appUrl}/dashboard?card=saved`,
    cancel_url: `${appUrl}/settings?card=cancelled`,
    notify_url: process.env['PAYFAST_ITN_URL']!,
    name_first: params.userName.split(' ')[0],
    name_last: '',
    email_address: params.userEmail,
    m_payment_id: params.userId,
    amount: '0.00',
    item_name: 'Billdog - Save Card',
    subscription_type: '2',
  };

  // PayFast signature spec states to drop trailing empty strings, but for predictable order:
  // we will construct a clean object dropping any empty ones to avoid breaking ITNs
  const cleanData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== '') cleanData[k] = v;
  }

  // Generate signature
  const signature = generateSignature(cleanData, process.env['PAYFAST_PASSPHRASE']!);
  cleanData.signature = signature;

  // Build query string
  const queryString = Object.entries(cleanData)
    .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
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
