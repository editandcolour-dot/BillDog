import type { NextRequest } from 'next/server';

/**
 * Extracts the real client IP from request headers.
 *
 * Header priority (Cloudflare → Railway → direct):
 *   1. cf-connecting-ip   — Cloudflare-set, most reliable in this stack
 *   2. x-forwarded-for    — first IP in the comma-separated chain
 *   3. x-real-ip          — last-resort fallback
 *
 * Returns null when none are present (e.g. local dev without a proxy).
 */
export function getClientIp(request: NextRequest): string | null {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  return realIp ? realIp.trim() : null;
}
