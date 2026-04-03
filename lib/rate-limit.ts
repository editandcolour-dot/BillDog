import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Create a new ratelimiter, that allows up to X requests per set window
export function getRateLimiter(requests: number, window: `${number} s` | `${number} m` | `${number} h` | `${number} d`) {
  const UPSTASH_URL = 'https://crisp-bunny-73029.upstash.io';
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

  const limiter = new Ratelimit({
    redis: new Redis({
      url: UPSTASH_URL,
      token: UPSTASH_TOKEN
    }),
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });

  return {
    limit: async (identifier: string) => {
      try {
        return await limiter.limit(identifier);
      } catch (error) {
        console.warn('[rate-limit] Upstash Redis unavailable, failing open:', error);
        // Fail open by spoofing a successful limit response
        return { success: true };
      }
    }
  };
}

// Fixed generic 429 response message per the spec
export function rateLimitExceededResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please try again in a few minutes." },
    { status: 429 }
  );
}
