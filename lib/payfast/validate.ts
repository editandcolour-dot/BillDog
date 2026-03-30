export function validateSignature(
  params: Record<string, string>,
  passphrase: string,
): boolean {
  const receivedSignature = params.signature;
  if (!receivedSignature) return false;

  const crypto = require('crypto');

  // Build parameter string: sorted, URL-encoded, excluding 'signature'
  const paramString = Object.keys(params)
    .filter(key => key !== 'signature')
    .sort()
    .map(key => `${key}=${encodeURIComponent(params[key].trim()).replace(/%20/g, '+')}`)
    .join('&');

  // Append passphrase
  const withPassphrase = `${paramString}&passphrase=${encodeURIComponent(passphrase.trim())}`;

  // MD5 hash
  const expectedSignature = crypto
    .createHash('md5')
    .update(withPassphrase)
    .digest('hex');

  return expectedSignature === receivedSignature;
}

const PAYFAST_PRODUCTION_IPS = new Set([
  '41.74.179.194',
  '41.74.179.195',
  '41.74.179.196',
  '41.74.179.197',
  '41.74.179.198',
  '41.74.179.199',
  '41.74.179.200',
  '41.74.179.201',
]);

const PAYFAST_SANDBOX_IPS = new Set([
  '127.0.0.1',
  '::1',
  // Local testing IP mapping
  'localhost'
]);

export function validateIp(ip: string | null): boolean {
  if (!ip) return false;

  const cleanIp = ip.split(',')[0].trim(); // Handle x-forwarded-for chains

  if (process.env.PAYFAST_SANDBOX === 'true') {
    return PAYFAST_SANDBOX_IPS.has(cleanIp) || PAYFAST_PRODUCTION_IPS.has(cleanIp);
  }

  return PAYFAST_PRODUCTION_IPS.has(cleanIp);
}

export async function validateWithPayFast(
  params: Record<string, string>,
): Promise<boolean> {
  const validateUrl = process.env.PAYFAST_SANDBOX === 'true'
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate';

  // Send all parameters back to PayFast for confirmation
  const body = new URLSearchParams(params).toString();

  try {
    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      // Need this dummy user agent to pass Railway sometimes if PayFast strictly checks it, but it should be fine.
    });

    const result = await response.text();
    return result.trim() === 'VALID';
  } catch (error) {
    console.error('[payfast/validate] PayFast server validation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false; // Fail closed — reject if we can't verify
  }
}

export function validatePaymentStatus(status: string): 'process' | 'ignore' | 'reject' {
  switch (status) {
    case 'COMPLETE':
      return 'process';       // Valid payment — process it
    case 'CANCELLED':
    case 'FAILED':
      return 'ignore';        // Acknowledge but don't process
    default:
      return 'reject';        // Unknown status — security concern
  }
}

export function validateAmount(
  itnAmountGross: string,
  expectedAmount: number,
): boolean {
  const itnAmount = parseFloat(itnAmountGross);
  if (isNaN(itnAmount)) return false;

  // Allow ±R0.01 for rounding differences
  return Math.abs(itnAmount - expectedAmount) <= 0.01;
}
