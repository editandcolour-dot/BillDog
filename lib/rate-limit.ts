import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Create a new ratelimiter, that allows up to X requests per set window
export function getRateLimiter(requests: number, window: `${number} s` | `${number} m` | `${number} h` | `${number} d`) {
  console.log('Redis URL present:', !!process.env.UPSTASH_REDIS_REST_URL);

  const limiter = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
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
