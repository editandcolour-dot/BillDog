import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Create a new ratelimiter, that allows up to X requests per set window.
//
// Audit fixes (2026-06-01):
//   S-M3 — Upstash URL is now read from env (UPSTASH_REDIS_REST_URL).
//   S-H1 — Limiter now fails CLOSED on Redis errors. If Upstash is unreachable
//          we deny the request rather than silently allowing unlimited traffic.
export function getRateLimiter(requests: number, window: `${number} s` | `${number} m` | `${number} h` | `${number} d`) {
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

  const configured = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

  const limiter = configured
    ? new Ratelimit({
        redis: new Redis({
          url: UPSTASH_URL,
          token: UPSTASH_TOKEN,
        }),
        limiter: Ratelimit.slidingWindow(requests, window),
        analytics: true,
      })
    : null;

  return {
    limit: async (identifier: string) => {
      if (!limiter) {
        // Misconfiguration — fail closed.
        console.error('[rate-limit] Upstash env vars missing — denying request.');
        return { success: false };
      }
      try {
        return await limiter.limit(identifier);
      } catch (error) {
        // Redis unreachable — fail closed (audit S-H1).
        console.error('[rate-limit] Upstash Redis unavailable, failing CLOSED:', error);
        return { success: false };
      }
    },
  };
}

// Fixed generic 429 response message per the spec
export function rateLimitExceededResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please try again in a few minutes." },
    { status: 429 }
  );
}
