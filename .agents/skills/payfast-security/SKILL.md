---
name: payfast-security
description: PayFast ITN webhook validation for Billdog. Payment Agent and Security Agent MUST read this before building the PayFast webhook handler or any payment validation code.
---

# PayFast Security — ITN Validation

> **Consumed by:** Payment Agent, Security Agent — read before building any PayFast webhook handler
> **Project:** Billdog — SA municipal billing dispute platform
> **Webhook URL:** `/api/webhooks/payfast`
> **Risk level:** Critical — a fake ITN could trigger card tokenisation or fee charges without real payments
> **Rule:** All four validation checks must pass. Fail any one = reject the ITN entirely.

---

## PART 1: What Is an ITN

**ITN = Instant Transaction Notification.** PayFast sends a POST request to your `PAYFAST_ITN_URL` after every payment event.

### Billdog Must
1. **Validate** — confirm the ITN is genuinely from PayFast (not a spoofed request)
2. **Process** — store the token or record the charge
3. **Respond 200** — within 10 seconds, or PayFast retries

### ITN Retry Behaviour
- If Billdog does not respond HTTP 200 within **10 seconds**, PayFast retries
- PayFast retries up to **3 times** with increasing delays
- Design the webhook to **respond 200 immediately**, then process asynchronously if needed

### Trust Model
**Treat ITN data as completely untrusted input until all four validation checks pass.** An attacker who knows your webhook URL could forge an ITN to trigger token storage or payment recording.

---

## PART 2: The Four Mandatory Checks

All four checks must pass. Fail any one = reject with 400.

### CHECK 1 — Signature Validation

PayFast signs every ITN with an MD5 hash. You must verify this signature.

**Algorithm:**
1. Take all ITN POST parameters **except** `signature`
2. Sort alphabetically by parameter name
3. URL-encode each value
4. Join as `key=value&key=value&...`
5. Append passphrase: `&passphrase={PAYFAST_PASSPHRASE}`
6. MD5 hash the entire string
7. Compare to the `signature` field in the ITN payload

```typescript
// lib/payfast/validate.ts
import crypto from 'crypto';

export function validateSignature(
  params: Record<string, string>,
  passphrase: string,
): boolean {
  const receivedSignature = params.signature;
  if (!receivedSignature) return false;

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
```

**If invalid:** Log security event, return 400. Never process.

---

### CHECK 2 — IP Address Validation

PayFast only sends ITNs from known IP addresses. Reject anything from an unknown source.

```typescript
// lib/payfast/validate.ts

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
]);

export function validateIp(ip: string | null): boolean {
  if (!ip) return false;

  const cleanIp = ip.split(',')[0].trim(); // Handle x-forwarded-for chains

  if (process.env.PAYFAST_MODE === 'sandbox') {
    return PAYFAST_SANDBOX_IPS.has(cleanIp) || PAYFAST_PRODUCTION_IPS.has(cleanIp);
  }

  return PAYFAST_PRODUCTION_IPS.has(cleanIp);
}
```

**Getting the request IP in Next.js:**
```typescript
const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
  || request.headers.get('x-real-ip')
  || null;
```

**If invalid IP:** Log security event with the IP address, return 403.

> **Note:** Check [payfast.co.za/faq](https://payfast.co.za/faq) periodically for updated IP ranges. If PayFast adds new IPs, update the whitelist immediately.

---

### CHECK 3 — PayFast Server Validation

Ping PayFast's own validation endpoint to confirm the ITN is legitimate. This is the **definitive check** — PayFast confirms their own notification.

```typescript
// lib/payfast/validate.ts

export async function validateWithPayFast(
  params: Record<string, string>,
): Promise<boolean> {
  const validateUrl = process.env.PAYFAST_MODE === 'production'
    ? 'https://www.payfast.co.za/eng/query/validate'
    : 'https://sandbox.payfast.co.za/eng/query/validate';

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
```

**If response is not `"VALID"`:** Reject ITN, return 400. Log the event.

**If PayFast server is unreachable:** Fail closed (reject). Log for manual investigation. PayFast will retry the ITN.

---

### CHECK 4 — Amount & Status Validation

```typescript
// lib/payfast/validate.ts

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
```

**Amount validation rules:**

| ITN Type | Amount Check |
|---|---|
| Tokenisation | `amount_gross` should be `0.00` — skip strict validation |
| Ad hoc charge (success fee) | Compare to expected fee from `cases` table — must match within R0.01 |

**Payment status handling:**

| Status | Action |
|---|---|
| `COMPLETE` | ✅ Process — store token or record charge |
| `CANCELLED` | Log and return 200 — acknowledged but not processed |
| `FAILED` | Log and return 200 — notify user if relevant |
| Unknown | ❌ Reject — return 400, log security event |

---

## PART 3: Complete ITN Handler

```typescript
// app/api/webhooks/payfast/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateSignature, validateIp, validateWithPayFast, validatePaymentStatus, validateAmount } from '@/lib/payfast/validate';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse ITN body
    const body = await request.text();
    const params = Object.fromEntries(new URLSearchParams(body));

    // ──────────────────────────────────────────────
    // CHECK 1: Signature validation
    // ──────────────────────────────────────────────
    if (!validateSignature(params, process.env.PAYFAST_PASSPHRASE!)) {
      await logSecurityEvent('invalid_signature', {
        m_payment_id: params.m_payment_id,
        ip: getRequestIp(request),
      });
      return new NextResponse('Invalid signature', { status: 400 });
    }

    // ──────────────────────────────────────────────
    // CHECK 2: IP address validation
    // ──────────────────────────────────────────────
    const ip = getRequestIp(request);
    if (!validateIp(ip)) {
      await logSecurityEvent('invalid_ip', {
        ip,
        m_payment_id: params.m_payment_id,
      });
      return new NextResponse('Invalid source', { status: 403 });
    }

    // ──────────────────────────────────────────────
    // CHECK 3: PayFast server validation
    // ──────────────────────────────────────────────
    const isValid = await validateWithPayFast(params);
    if (!isValid) {
      await logSecurityEvent('payfast_validation_failed', {
        m_payment_id: params.m_payment_id,
      });
      return new NextResponse('Validation failed', { status: 400 });
    }

    // ──────────────────────────────────────────────
    // CHECK 4: Payment status
    // ──────────────────────────────────────────────
    const statusAction = validatePaymentStatus(params.payment_status);

    if (statusAction === 'reject') {
      await logSecurityEvent('unknown_payment_status', {
        status: params.payment_status,
        m_payment_id: params.m_payment_id,
      });
      return new NextResponse('Unknown status', { status: 400 });
    }

    if (statusAction === 'ignore') {
      // Log but don't process
      console.info('[payfast-itn] Non-complete status', {
        status: params.payment_status,
        m_payment_id: params.m_payment_id,
      });
      return new NextResponse('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────
    // IDEMPOTENCY CHECK
    // ──────────────────────────────────────────────
    const pfPaymentId = params.pf_payment_id;
    if (await isAlreadyProcessed(pfPaymentId)) {
      console.info('[payfast-itn] Duplicate ITN ignored', { pfPaymentId });
      return new NextResponse('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────
    // PROCESS: Tokenisation or Charge
    // ──────────────────────────────────────────────
    const token = params.token;
    const mPaymentId = params.m_payment_id;

    if (token && parseFloat(params.amount_gross) === 0) {
      // TOKENISATION — zero-amount, token present
      await processTokenisation(mPaymentId, token, pfPaymentId);
    } else {
      // CHARGE — validate amount, record payment
      await processCharge(mPaymentId, params, pfPaymentId);
    }

    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('[payfast-itn] Handler error', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return 200 even on error to prevent infinite PayFast retries
    // Log and investigate manually
    return new NextResponse('OK', { status: 200 });
  }
}

// Helper: extract IP from request
function getRequestIp(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || null;
}
```

---

## PART 4: Idempotency

Never process the same ITN twice. PayFast may retry, or an attacker may replay.

```typescript
// lib/payfast/idempotency.ts

async function isAlreadyProcessed(pfPaymentId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('case_events')
    .select('id')
    .eq('metadata->>pf_payment_id', pfPaymentId)
    .limit(1);

  return (data?.length ?? 0) > 0;
}
```

### Rules
- **`pf_payment_id`** is the idempotency key — unique per PayFast transaction
- **Check before processing** — if already in `case_events`, return 200 silently
- **Store immediately after processing** — include `pf_payment_id` in event metadata
- **Never skip this check** — PayFast retries and replay attacks both cause duplicates

---

## PART 5: Security Logging

### What to Log

Log ALL of these as security events:

| Event | Severity | Log |
|---|---|---|
| Invalid signature | 🔴 Critical | IP, m_payment_id, timestamp |
| Invalid IP address | 🔴 Critical | IP, m_payment_id, timestamp |
| PayFast validation failed | 🔴 Critical | m_payment_id, timestamp |
| Unknown payment status | 🟡 Warning | status, m_payment_id |
| Amount mismatch | 🔴 Critical | expected, received, m_payment_id |
| Duplicate ITN | 🟢 Info | pf_payment_id |
| Successful processing | 🟢 Info | pf_payment_id, type (token/charge) |

### Implementation
```typescript
// lib/payfast/security-log.ts

async function logSecurityEvent(
  eventType: string,
  context: Record<string, unknown>,
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('case_events').insert({
    case_id: null, // Security events may not have a case
    event_type: `security_${eventType}`,
    note: `PayFast security event: ${eventType}`,
    metadata: {
      ...context,
      timestamp: new Date().toISOString(),
      source: 'payfast_itn',
    },
  });

  // Always console.error for security events — they need attention
  console.error(`[SECURITY] PayFast ${eventType}`, context);
}
```

### What to NEVER Log
```typescript
// ❌ BANNED — never log these
console.log('Card number:', params.card_number);
console.log('Full ITN:', params);                 // May contain sensitive fields
console.log('Passphrase:', process.env.PAYFAST_PASSPHRASE);
```

### Review Cadence
- **Production:** Review security logs **weekly**
- **After launch:** Review **daily** for the first 2 weeks
- Look for: patterns of invalid IPs, signature failures, amount mismatches

---

## PART 6: Testing Checklist

Before production deployment, verify all of the following in sandbox:

### Positive Tests
- [ ] Valid ITN from sandbox → processed correctly
- [ ] Token stored after tokenisation ITN (`payment_status: COMPLETE`, `token` present)
- [ ] Charge recorded after payment ITN (correct amount)
- [ ] Receipt email sent after successful charge

### Negative Tests (Security)
- [ ] Invalid signature → rejected with 400
- [ ] Invalid IP address → rejected with 403
- [ ] PayFast server validation failure → rejected with 400
- [ ] `CANCELLED` status → acknowledged (200) but NOT processed
- [ ] `FAILED` status → acknowledged (200) but NOT processed
- [ ] Unknown status → rejected with 400
- [ ] Amount mismatch → rejected with 400

### Idempotency Tests
- [ ] Duplicate ITN (same `pf_payment_id`) → ignored, returned 200
- [ ] Duplicate charge attempt → blocked by `fee_charged IS NOT NULL` check

### Logging Tests
- [ ] All rejection cases logged with correct event type
- [ ] Security events include IP, m_payment_id, timestamp
- [ ] No sensitive data (card numbers, passphrase) in logs
