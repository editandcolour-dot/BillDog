import crypto from 'crypto';

interface TokeniseParams {
  userId: string;
  userEmail: string;
  userName: string;
}

export function generateTokeniseUrl(params: TokeniseParams): string {
  const baseUrl = process.env.PAYFAST_SANDBOX === 'true'
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

  // Using PAYFAST_SANDBOX because the skill states PAYFAST_MODE, but the user's .env.local uses PAYFAST_SANDBOX=true

  const data: Record<string, string> = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID!,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY!,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?card=saved`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?card=cancelled`,
    notify_url: process.env.PAYFAST_ITN_URL!,
    name_first: params.userName.split(' ')[0],
    email_address: params.userEmail,
    m_payment_id: params.userId,            // Match ITN to user
    amount: '0.00',                          // Zero charge — tokenise only
    item_name: 'Billdog — Save Card',
    subscription_type: '2',                  // Tokenisation (ad hoc)
    email_confirmation: '0',                 // No PayFast confirmation email
  };

  // Generate signature
  const signature = generateSignature(data, process.env.PAYFAST_PASSPHRASE!);
  data.signature = signature;

  // Build query string
  const queryString = Object.entries(data)
    .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
    .join('&');

  return `${baseUrl}?${queryString}`;
}

export function generateSignature(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.entries(data)
    .filter(([key]) => key !== 'signature')
    .map(([key, val]) => `${key}=${encodeURIComponent(val.trim()).replace(/%20/g, '+')}`)
    .join('&');

  const withPassphrase = `${paramString}&passphrase=${encodeURIComponent(passphrase.trim())}`;
  return crypto.createHash('md5').update(withPassphrase).digest('hex');
}
