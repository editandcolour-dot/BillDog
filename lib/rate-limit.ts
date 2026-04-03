import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Create a new ratelimiter, that allows up to X requests per set window
export function getRateLimiter(requests: number, window: `${number} s` | `${number} m` | `${number} h` | `${number} d`) {
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });
}

// Fixed generic 429 response message per the spec
export function rateLimitExceededResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please try again in a few minutes." },
    { status: 429 }
  );
}
