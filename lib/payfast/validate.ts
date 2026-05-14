import crypto from 'crypto';

/**
 * PHP-style urlencode parity.
 * encodeURIComponent gets us 95% there, but PHP's urlencode:
 *   - encodes spaces as '+' (not '%20')
 *   - leaves '~' unencoded (encodeURIComponent already does this)
 */
function pfEncode(val: string): string {
  return encodeURIComponent(val.trim()).replace(/%20/g, '+');
}

/**
 * Build a param string from key-value pairs
 */
function buildParamString(keys: string[], params: Record<string, string>, stopAtSignature: boolean): string {
  const pairs: string[] = [];
  for (const key of keys) {
    if (stopAtSignature && key === 'signature') break;
    if (key === 'signature') continue;
    const val = params[key];
    if (val !== undefined && val !== '') {
      pairs.push(`${key}=${pfEncode(val)}`);
    }
  }
  return pairs.join('&');
}

function computeHash(paramString: string, passphrase: string, encodePassphrase: boolean): string {
  const pp = encodePassphrase ? pfEncode(passphrase) : passphrase.trim();
  const full = passphrase ? `${paramString}&passphrase=${pp}` : paramString;
  return crypto.createHash('md5').update(full).digest('hex');
}

/**
 * Validate PayFast ITN signature.
 * 
 * Tries multiple strategies to match PayFast's hash:
 * 1. Received order, break at signature, passphrase encoded
 * 2. Received order, break at signature, passphrase raw
 * 3. Received order, skip signature (don't break), passphrase encoded
 * 4. Received order, skip signature (don't break), passphrase raw
 * 5. Alphabetical sort, passphrase encoded
 * 6. Alphabetical sort, passphrase raw
 */
export function validateSignature(
  params: Record<string, string>,
  passphrase: string,
  orderedKeys?: string[],
): boolean {
  const receivedSignature = params.signature;
  if (!receivedSignature) return false;

  const keys = orderedKeys ?? Object.keys(params);
  const sortedKeys = Object.keys(params).filter(k => k !== 'signature').sort();

  // Strategy 1: Received order, break at signature, passphrase encoded
  const s1str = buildParamString(keys, params, true);
  const s1 = computeHash(s1str, passphrase, true);

  // Strategy 2: Received order, break at signature, passphrase raw
  const s2 = computeHash(s1str, passphrase, false);

  // Strategy 3: Received order, skip signature (don't break), passphrase encoded
  const s3str = buildParamString(keys, params, false);
  const s3 = computeHash(s3str, passphrase, true);

  // Strategy 4: Received order, skip signature (don't break), passphrase raw
  const s4 = computeHash(s3str, passphrase, false);

  // Strategy 5: Alphabetical sort, passphrase encoded
  const s5str = buildParamString(sortedKeys, params, false);
  const s5 = computeHash(s5str, passphrase, true);

  // Strategy 6: Alphabetical sort, passphrase raw
  const s6 = computeHash(s5str, passphrase, false);

  const match = [s1, s2, s3, s4, s5, s6].findIndex(s => s === receivedSignature);

  // DIAGNOSTIC LOGGING — temporary, remove after fix confirmed
  console.error('[payfast/validate] === SIGNATURE DIAGNOSTIC ===');
  console.error('[payfast/validate] Received sig:', receivedSignature);
  console.error('[payfast/validate] Key order (first 5):', keys.slice(0, 5).join(', '));
  console.error('[payfast/validate] S1 (ordered+break+encPP):', s1, s1 === receivedSignature ? '✅' : '❌');
  console.error('[payfast/validate] S2 (ordered+break+rawPP):', s2, s2 === receivedSignature ? '✅' : '❌');
  console.error('[payfast/validate] S3 (ordered+skip+encPP):', s3, s3 === receivedSignature ? '✅' : '❌');
  console.error('[payfast/validate] S4 (ordered+skip+rawPP):', s4, s4 === receivedSignature ? '✅' : '❌');
  console.error('[payfast/validate] S5 (sorted+encPP):', s5, s5 === receivedSignature ? '✅' : '❌');
  console.error('[payfast/validate] S6 (sorted+rawPP):', s6, s6 === receivedSignature ? '✅' : '❌');
  console.error('[payfast/validate] Match strategy:', match >= 0 ? `S${match + 1}` : 'NONE');
  // Log the hash input for strategy 1 (mask sensitive values)
  const maskedStr = s1str.replace(/merchant_key=[^&]+/, 'merchant_key=***').replace(/email_address=[^&]+/, 'email_address=***');
  console.error('[payfast/validate] S1 hash input (masked):', maskedStr.substring(0, 300));
  console.error('[payfast/validate] === END DIAGNOSTIC ===');

  if (match >= 0) return true;
  return false;
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
