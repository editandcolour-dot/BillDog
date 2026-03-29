import { Webhook } from 'svix';

/**
 * Validates a Resend incoming webhook payload using the Svix signature.
 * 
 * @param payload - The raw stringified request payload.
 * @param signature - The 'svix-signature' header.
 * @param secret - The Resend webhook secret.
 * @returns The strongly-typed webhook event payload if valid.
 * @throws {Error} If the signature is invalid or missing.
 */
export function verifyResendWebhook(
  payload: string, 
  headers: Record<string, string>,
  secret: string
): unknown {
  const wh = new Webhook(secret);
  return wh.verify(payload, headers);
}

/**
 * Extracts the `caseId` from the inbound email recipient address.
 * Matches the format: `case-{caseId}@disputes.billdog.co.za`
 * 
 * @param toEmail - The destination email address.
 * @returns The caseId string, or null if no match is found.
 */
export function extractCaseId(toEmail: string): string | null {
  const match = toEmail.match(/^case-([a-zA-Z0-9-]+)@disputes\.billdog\.co\.za$/i);
  return match ? match[1] : null;
}

/**
 * Sanitizes the raw email text for storage in the event log.
 * Strips HTML and caps length to prevent bloat.
 * 
 * @param text - The raw email body.
 * @param maxLength - Maximum number of characters to retain (default: 500).
 * @returns Clean, truncated string.
 */
export function sanitizeEmailPreview(text: string | undefined | null, maxLength = 500): string {
  if (!text) return '';
  
  // Strip any obvious HTML tags and decode basic entities (cheap sanitize)
  let clean = text.replace(/<[^>]*>/g, '').trim();
  
  if (clean.length > maxLength) {
    clean = `${clean.substring(0, maxLength)}...`;
  }
  
  return clean;
}
