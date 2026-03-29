---
name: security
description: Security patterns for Billdog. Security Agent and API Agent MUST read this before touching any API route, middleware, or data handling code.
---

# Security — Billdog

> **Consumed by:** Security Agent, API Agent — read before any API route or data handling code
> **Project:** Billdog — SA municipal billing dispute platform
> **User data sensitivity:** Personal financial documents — highest sensitivity
> **Constraints:** ARCHITECTURE.md Section 12
> **Rule:** Users trust us with their bills, addresses, and account numbers. A breach is unacceptable.

---

## 1. Environment Variables

### Exposure Rules

| Prefix | Available In | Treat As |
|---|---|---|
| `NEXT_PUBLIC_` | Browser + Server | **Public** — anyone can see these in client bundle |
| No prefix | Server only | **Secret** — never expose to browser, logs, or error messages |

### Startup Validation
Validate all required env vars on app startup. Fail fast with a clear error.

```typescript
// lib/env.ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[STARTUP FATAL] Missing required environment variable: ${name}. ` +
      `Set it in .env (local) or Railway dashboard (production).`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
  resendApiKey: requireEnv('RESEND_API_KEY'),
  resendFromEmail: requireEnv('RESEND_FROM_EMAIL'),
  payfastMerchantId: requireEnv('PAYFAST_MERCHANT_ID'),
  payfastMerchantKey: requireEnv('PAYFAST_MERCHANT_KEY'),
  payfastPassphrase: requireEnv('PAYFAST_PASSPHRASE'),
  voyageApiKey: requireEnv('VOYAGE_API_KEY'),
  appUrl: requireEnv('NEXT_PUBLIC_APP_URL'),
} as const;
```

### Rules
- **Never hardcode** secrets, API keys, or tokens anywhere in code.
- **Never log** env var values — names only in debug output.
- **Never commit** `.env` files to Git.
- **Never use `NEXT_PUBLIC_`** on secrets — this ships them to every browser.

---

## 2. Supabase Security

### Client Selection

| Scenario | Client | Why |
|---|---|---|
| Browser / Client Component | Anon key client | RLS enforced, user sees own data only |
| Server Component / API route | Server client (cookies) | RLS enforced via session cookies |
| Webhooks / admin ops | Service role client | Bypasses RLS — **server-side only** |

### Rules
```typescript
// ❌ SECURITY INCIDENT — service role key in browser
'use client';
import { createAdminClient } from '@/lib/supabase/admin';

// ✅ CORRECT — anon key with RLS
'use client';
import { createClient } from '@/lib/supabase/client';
```

- **All tables must have RLS enabled** — no exceptions (ARCHITECTURE.md Section 12, Constraint 4).
- **Every write operation** must verify auth session first.
- **Never trust user-supplied IDs** — always verify ownership against `auth.uid()`.

```typescript
// ❌ DANGEROUS — trusting user-supplied caseId
const { caseId } = await request.json();
await supabase.from('cases').update({ status }).eq('id', caseId);
// User could update someone else's case!

// ✅ SECURE — verify ownership
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

const { data, error } = await supabase
  .from('cases')
  .update({ status })
  .eq('id', caseId)
  .eq('user_id', user.id); // RLS also enforces this, but belt-and-braces
```

---

## 3. Input Validation

Validate **all** user inputs before they reach the database or Claude API.

### Text Inputs
```typescript
import { z } from 'zod'; // or manual validation

const caseSchema = z.object({
  municipality: z.string()
    .min(1, 'Municipality is required')
    .max(100, 'Municipality name too long')
    .refine(v => !/<script/i.test(v), 'Invalid characters'),
  accountNumber: z.string()
    .min(5, 'Account number too short')
    .max(30, 'Account number too long')
    .regex(/^[A-Za-z0-9-]+$/, 'Invalid account number format'),
});
```

### Sanitisation
```typescript
/**
 * Strip HTML tags from user input before storing.
 * Prevents stored XSS attacks.
 */
function sanitiseInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')     // strip HTML tags
    .replace(/&[^;]+;/g, '')     // strip HTML entities
    .trim();
}
```

### Rules
- **Validate municipality** against the `municipalities` table — reject unknown names.
- **Validate file types** by MIME type, not just extension (see Section 4).
- **Never pass raw user input** directly into Claude API prompts — sanitise first.
- **Validate on the server** — client validation is for UX, server validation is for security.

---

## 4. File Upload Security

### MIME Type Validation (Server-Side)
```typescript
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function validateUploadedFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new ValidationError(
      `Unsupported file type: ${file.type}. Accepted: PDF, JPEG, PNG, HEIC.`,
      'INVALID_FILE_TYPE',
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(
      `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB.`,
      'FILE_TOO_LARGE',
    );
  }
}
```

### Storage Rules
- **Private bucket only** — the `bills` bucket must be private.
- **Signed URLs with expiry** — generate time-limited URLs for file access (1 hour max).
- **Never serve public URLs** — bills contain PII (names, addresses, account numbers).
- **Reject executables** — `.exe`, `.bat`, `.sh`, `.js`, `.py` and any non-bill type.
- **Virus scanning** — flagged for v2. Document as known gap in v1.

```typescript
// Generate signed URL for viewing
const { data } = await supabase.storage
  .from('bills')
  .createSignedUrl(filePath, 3600); // 1 hour expiry
```

---

## 5. API Route Authentication

**Every protected API route** must verify the Supabase session before doing anything.

### Standard Auth Guard Pattern
```typescript
// app/api/cases/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorised' },
      { status: 401 },
    );
  }

  // Now safe to query — RLS will filter by session user
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch cases' },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
```

### Rules
- Return **401** for missing/invalid sessions — never 500.
- Return **403** for valid session but insufficient permissions.
- Return **404** for resources that don't exist or don't belong to the user (don't leak existence).
- **Verify case ownership** on every case-specific operation — don't rely solely on RLS as the only layer.

### Public Routes (No Auth Required)
Only these routes may skip auth verification:
- `GET /api/health` — health check
- `POST /api/webhooks/payfast` — PayFast ITN (validated by signature instead)

---

## 6. CSRF Protection

### Default Protection
Next.js API routes are **same-origin by default** — browsers enforce this via CORS. However:

### Additional Rules
- **Never use GET for mutations** — GET requests can be triggered by `<img>` tags, links, etc.
- **Validate origin** on the PayFast webhook endpoint — whitelist PayFast IPs.
- **Use POST/PUT/PATCH/DELETE** for all state-changing operations.

```typescript
// ❌ DANGEROUS — GET for mutation
export async function GET(request: NextRequest) {
  await supabase.from('cases').delete().eq('id', caseId);
}

// ✅ CORRECT — DELETE for deletion
export async function DELETE(request: NextRequest) {
  await supabase.from('cases').delete().eq('id', caseId);
}
```

---

## 7. XSS Prevention

### Rules
- **Never use `dangerouslySetInnerHTML`** with user content.
- **Never render raw bill text as HTML** — always display as plain text.
- **Escape user-generated content** before display (React does this by default for JSX expressions).
- **Configure Content Security Policy** in `next.config.js`.

```typescript
// ❌ XSS VULNERABILITY
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// ✅ SAFE — React auto-escapes
<p>{userComment}</p>

// ❌ XSS VULNERABILITY — raw bill text as HTML
<div dangerouslySetInnerHTML={{ __html: billText }} />

// ✅ SAFE — render as preformatted text
<pre className="whitespace-pre-wrap text-sm text-grey">{billText}</pre>
```

### Content Security Policy
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires these
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL} https://api.anthropic.com`,
      "img-src 'self' data: blob: *.supabase.co",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];
```

---

## 8. PayFast Webhook Security

### ITN (Instant Transaction Notification) Validation
```typescript
// app/api/webhooks/payfast/route.ts

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.formData();

  // 1. Validate source IP against PayFast whitelist
  const clientIp = request.headers.get('x-forwarded-for');
  if (!isPayFastIp(clientIp)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Validate ITN signature
  const isValid = validatePayFastSignature(body, env.payfastPassphrase);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 3. Validate amount matches expected charge
  const expectedAmount = await getExpectedAmount(body.get('m_payment_id'));
  if (Number(body.get('amount_gross')) !== expectedAmount) {
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  // 4. Process payment — using service role (no user session)
  const supabase = createAdminClient();
  // ... update case status ...

  return NextResponse.json({ status: 'ok' });
}
```

### PayFast IP Whitelist
```typescript
const PAYFAST_IPS = new Set([
  '197.97.145.144', '197.97.145.145', '197.97.145.146', '197.97.145.147',
  '197.97.145.148', '197.97.145.149', '197.97.145.150', '197.97.145.151',
  // Add sandbox IPs for testing
  '41.74.179.194', '41.74.179.195', '41.74.179.196', '41.74.179.197',
  '41.74.179.198', '41.74.179.199', '41.74.179.200', '41.74.179.201',
]);
```

### Rules
- **Reject without valid signature** — return 400, log the attempt.
- **Validate IP** — PayFast publishes their IP ranges.
- **Validate amount** — prevent tampering with payment amounts.
- **Never log full ITN payload** — contains sensitive payment data.
- **Use service role client** — webhook has no user session.

---

## 9. Rate Limiting

### Claude API Protection
```typescript
// lib/rate-limit.ts
const RATE_LIMITS = {
  analyse: { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5/day
  sendLetter: { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3/day
} as const;

async function checkRateLimit(
  userId: string,
  action: keyof typeof RATE_LIMITS,
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = RATE_LIMITS[action];
  const since = new Date(Date.now() - limit.windowMs).toISOString();

  const { count } = await supabase
    .from('case_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', action)
    .gte('created_at', since);

  const used = count ?? 0;
  return {
    allowed: used < limit.maxRequests,
    remaining: Math.max(0, limit.maxRequests - used),
  };
}
```

### Usage in API Route
```typescript
const rateCheck = await checkRateLimit(session.user.id, 'analyse');
if (!rateCheck.allowed) {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded. You can analyse up to 5 bills per day.',
      remaining: rateCheck.remaining,
    },
    { status: 429 },
  );
}
```

### Rules
- **`/api/analyse`** — 5 per user per day (Claude API is expensive).
- **`/api/send-letter`** — 3 per user per day (prevents spam).
- Return **429** with a clear, human-readable message.
- Log rate limit hits for monitoring.

---

## 10. Logging Security

### What to Log ✅
```typescript
logger.info('Bill analysis completed', {
  userId: session.user.id,    // ✅ user ID
  caseId: case.id,            // ✅ case ID
  duration: `${elapsed}ms`,   // ✅ performance
  status: 'success',          // ✅ outcome
});
```

### What to NEVER Log ❌
```typescript
// ❌ BANNED — logging these is a security incident
logger.info('API key:', process.env.ANTHROPIC_API_KEY);
logger.info('Bill text:', billText);  // Contains PII
logger.info('User email:', user.email);
logger.info('Full ITN:', payfastPayload);  // Contains payment data
logger.info('Service key:', process.env.SUPABASE_SERVICE_ROLE_KEY);
logger.info('Password:', password);
logger.info('Account number:', accountNumber);
```

### Error Logging
```typescript
// ✅ CORRECT — log error type and context, not data
logger.error('Bill analysis failed', {
  userId: session.user.id,
  caseId: case.id,
  errorType: error.name,
  errorMessage: error.message,  // OK if it doesn't contain user data
});
```

---

## 11. HTTPS & Cookies

### HTTPS
- **Railway enforces HTTPS** by default — no configuration needed.
- All Supabase connections use HTTPS — enforced by Supabase client.
- **Never serve** any content or API over HTTP.

### Cookie Security
Supabase auth helpers set cookies with proper flags:
- `Secure` — only sent over HTTPS
- `HttpOnly` — not accessible via JavaScript
- `SameSite=Lax` — CSRF protection

**Rule:** Never manually set cookies without `Secure` and `HttpOnly` flags.

---

## 12. Dependency Security

### Before Every Deployment
```bash
npm audit
# Fix any critical or high severity vulnerabilities before deploying
npm audit fix
```

### Rules
- **Never install** packages with known critical vulnerabilities.
- **Lock versions** with `package-lock.json` — always commit it.
- **Review new dependencies** — check download count, last publish date, maintainer reputation.
- **Minimal dependencies** — don't add a package for something you can write in 10 lines.
- **Run `npm audit`** as part of the pre-merge checklist.

---

## 13. Security Checklist

Before any API route or data handler is considered complete:

- [ ] Auth session verified — returns 401 if missing
- [ ] Resource ownership verified — user can only access their own data
- [ ] All inputs validated and sanitised
- [ ] File uploads checked for type and size
- [ ] No secrets in client-side code or logs
- [ ] No `dangerouslySetInnerHTML` with user content
- [ ] Rate limiting in place for expensive operations
- [ ] Error responses don't leak internal details
- [ ] RLS enabled on all touched tables
- [ ] `npm audit` clean — no critical vulnerabilities
