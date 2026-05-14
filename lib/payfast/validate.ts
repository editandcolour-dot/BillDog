import crypto from 'crypto';

/**
 * Validate PayFast ITN signature.
 * 
 * CRITICAL: PayFast signs ITN using the RECEIVED ORDER of parameters
 * (NOT alphabetical sort). The PHP example iterates $_POST in order 
 * and breaks at 'signature'. We must replicate this exactly.
 * 
 * @param orderedKeys - Keys in the exact order they appeared in the POST body
 * @param params - Full set of ITN parameters
 * @param passphrase - Merchant passphrase
 */
export function validateSignature(
  params: Record<string, string>,
  passphrase: string,
  orderedKeys?: string[],
): boolean {
  const receivedSignature = params.signature;
  if (!receivedSignature) return false;

  // Use the ordered keys if provided, otherwise fall back to Object.keys
  // (which preserves insertion order in modern JS — matching URLSearchParams order)
  const keys = orderedKeys ?? Object.keys(params);

  // Build parameter string in RECEIVED ORDER, stopping at 'signature'
  const pairs: string[] = [];
  for (const key of keys) {
    if (key === 'signature') break; // PayFast PHP example: break at signature
    const val = params[key];
    if (val !== undefined && val !== '') {
      pairs.push(`${key}=${encodeURIComponent(val.trim()).replace(/%20/g, '+')}`);
    }
  }
  const paramString = pairs.join('&');

  // Append passphrase (URL-encoded, matching PHP's urlencode())
  const withPassphrase = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim())}`
    : paramString;

  // MD5 hash
  const expectedSignature = crypto
    .createHash('md5')
    .update(withPassphrase)
    .digest('hex');

  return expectedSignature === receivedSignature;
}

/**
 * PayFast Production IP addresses.
 * 
 * Updated 2026-05-14:
 * - Legacy range: 41.74.179.194-201
 * - New ranges (AWS migration 2025): 102.216.36.0/28, 102.216.36.128/28
 * 
 * Source: https://developers.payfast.co.za/docs#ports-ips
 * Check periodically for updates.
 */
const PAYFAST_PRODUCTION_IPS = new Set([
  // Legacy range
  '41.74.179.194',
  '41.74.179.195',
  '41.74.179.196',
  '41.74.179.197',
  '41.74.179.198',
  '41.74.179.199',
  '41.74.179.200',
  '41.74.179.201',
  // New range: 102.216.36.0/28 (0-15)
  '102.216.36.0',
  '102.216.36.1',
  '102.216.36.2',
  '102.216.36.3',
  '102.216.36.4',
  '102.216.36.5',
  '102.216.36.6',
  '102.216.36.7',
  '102.216.36.8',
  '102.216.36.9',
  '102.216.36.10',
  '102.216.36.11',
  '102.216.36.12',
  '102.216.36.13',
  '102.216.36.14',
  '102.216.36.15',
  // New range: 102.216.36.128/28 (128-143)
  '102.216.36.128',
  '102.216.36.129',
  '102.216.36.130',
  '102.216.36.131',
  '102.216.36.132',
  '102.216.36.133',
  '102.216.36.134',
  '102.216.36.135',
  '102.216.36.136',
  '102.216.36.137',
  '102.216.36.138',
  '102.216.36.139',
  '102.216.36.140',
  '102.216.36.141',
  '102.216.36.142',
  '102.216.36.143',
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
