---
name: error-handling
description: Consistent, user-friendly error handling patterns for Billdog. ALL agents MUST read this before writing any async code, API route, or user-facing feature.
---

# Error Handling — Billdog

> **Consumed by:** ALL agents — read before writing any async code, API route, or user-facing feature
> **Project:** Billdog — SA municipal billing dispute platform
> **Core principle:** Errors are expected, not exceptional. Every async operation WILL fail at some point. Design for failure from the start.
> **User expectation:** Consumer app — errors must feel handled, not technical.

---

## 1. Core Principle

Every external call — database, API, storage, email, payment — will eventually fail. Network timeouts, rate limits, malformed data, expired sessions. This is not a question of if, but when.

**Design every feature as if the happy path is the exception.**

```
HAS try/catch?  → ✅ Minimum bar
HAS user message? → ✅ Good
HAS retry path?   → ✅ Great
HAS logging?      → ✅ Professional
```

---

## 2. Try/Catch Pattern

**Never write async code without try/catch.** No exceptions.

### API Route Pattern
```typescript
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Your session has expired. Please log in again.' }, { status: 401 });
    }

    const body = await request.json();
    const result = await processRequest(body, session.user.id);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[api/route-name]', {
      errorType: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
```

### Rules
- **Never swallow errors silently** — every `catch` must log or rethrow.
- **Always log in catch** — at minimum: route name, error type, error message.
- **Always return a user-friendly message** — never the raw error.
- **Always set appropriate HTTP status** — don't return 200 for errors.

---

## 3. User-Facing Error Messages — Golden Rules

| Rule | Why |
|---|---|
| Never expose stack traces | Users can't act on them. Attackers can. |
| Never expose database errors | Reveals schema, query structure, RLS failures. |
| Never expose API error details | Reveals third-party integrations and keys. |
| Always give a friendly message | Users need to know what happened in plain English. |
| Always suggest a next action | "Try again", "Upload a different file", "Contact support". |
| Never use technical jargon | "PGRST116" means nothing to a user. |

```typescript
// ❌ BANNED — exposing internals
return NextResponse.json({
  error: `PostgreSQL error: relation "cases" violates RLS policy for user ${userId}`
});

// ✅ REQUIRED — friendly with next action
return NextResponse.json({
  error: "We couldn't find that case. It may have been deleted."
});
```

---

## 4. Error Message Catalogue

Standard error messages for Billdog. Use these exact messages for consistency.

### File Upload Errors
| Scenario | Message |
|---|---|
| Upload failed | "We couldn't read your bill. Please check the file and try again." |
| File too large | "Your file is too large. Please upload a file under 10MB." |
| Unsupported format | "We only accept PDF, JPG, or PNG files." |
| Corrupt file | "This file appears to be damaged. Please try a different copy." |

### Analysis Errors
| Scenario | Message |
|---|---|
| Analysis failed | "We couldn't analyse your bill right now. Please try again in a few minutes." |
| Analysis timeout | "Analysis is taking longer than usual. Please try again." |
| Rate limited | "You've reached your daily limit of 5 bill analyses. Please try again tomorrow." |

### Letter & Email Errors
| Scenario | Message |
|---|---|
| Letter generation failed | "We couldn't generate your dispute letter. Please try again." |
| Email send failed | "We couldn't send your dispute letter. Please try again or contact support." |

### Payment Errors
| Scenario | Message |
|---|---|
| Payment failed | "We couldn't process the fee. Please update your card details in Settings." |
| Payment amount mismatch | "There was a problem with the payment amount. Please contact support." |

### Auth Errors
| Scenario | Message |
|---|---|
| Session expired | "Your session has expired. Please log in again." |
| Unauthorised | "You don't have permission to view this." |
| Account locked | "Your account has been temporarily locked. Please try again in 30 minutes." |

### General Errors
| Scenario | Message |
|---|---|
| Not found | "We couldn't find that case. It may have been deleted." |
| Server error | "Something went wrong. Please try again or contact support at support@billdog.co.za" |
| Maintenance | "We're doing some quick maintenance. Please try again in a few minutes." |

### Implementation
```typescript
// lib/errors.ts
export const ERROR_MESSAGES = {
  // Upload
  UPLOAD_FAILED: "We couldn't read your bill. Please check the file and try again.",
  FILE_TOO_LARGE: 'Your file is too large. Please upload a file under 10MB.',
  UNSUPPORTED_FORMAT: 'We only accept PDF, JPG, or PNG files.',

  // Analysis
  ANALYSIS_FAILED: "We couldn't analyse your bill right now. Please try again in a few minutes.",
  ANALYSIS_TIMEOUT: 'Analysis is taking longer than usual. Please try again.',
  RATE_LIMITED: "You've reached your daily limit of 5 bill analyses. Please try again tomorrow.",

  // Letter
  LETTER_FAILED: "We couldn't generate your dispute letter. Please try again.",
  EMAIL_FAILED: "We couldn't send your dispute letter. Please try again or contact support.",

  // Payment
  PAYMENT_FAILED: 'We couldn\'t process the fee. Please update your card details in Settings.',

  // Auth
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORISED: "You don't have permission to view this.",

  // General
  NOT_FOUND: "We couldn't find that case. It may have been deleted.",
  GENERIC: 'Something went wrong. Please try again or contact support at support@billdog.co.za',
} as const;
```

---

## 5. Claude API Error Handling

### Timeout (>30s)
```typescript
const CLAUDE_TIMEOUT_MS = 30_000;

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  const response = await anthropic.messages.create(
    { /* params */ },
    { signal: controller.signal },
  );

  clearTimeout(timeout);
  return response;
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    // Show retry button to user
    return NextResponse.json(
      { error: ERROR_MESSAGES.ANALYSIS_TIMEOUT },
      { status: 504 },
    );
  }
  throw error;
}
```

### Rate Limit (429)
```typescript
if (error.status === 429) {
  // Queue and retry after delay — don't expose to user
  console.warn('[claude] Rate limited, retrying in 60s', { userId });
  await sleep(60_000);
  return retryAnalysis(params);
}
```

### Malformed JSON Response
```typescript
function parseClaudeResponse(raw: string): AnalysisResult {
  try {
    const parsed = JSON.parse(raw);

    // Validate required fields exist
    if (!parsed.errors || !Array.isArray(parsed.errors)) {
      throw new Error('Missing or invalid errors array');
    }
    if (typeof parsed.totalBilled !== 'number') {
      throw new Error('Missing or invalid totalBilled');
    }

    return parsed as AnalysisResult;
  } catch (parseError) {
    // Log full response for debugging — but NOT in production logs visible to users
    console.error('[claude] Malformed response', {
      parseError: parseError instanceof Error ? parseError.message : String(parseError),
      responseLength: raw.length,
      responsePreview: raw.substring(0, 200), // first 200 chars only
    });

    throw new AppError(ERROR_MESSAGES.ANALYSIS_FAILED, 'CLAUDE_PARSE_ERROR');
  }
}
```

### Rules
- **Always validate Claude JSON** before using — never assume the structure is correct.
- **Set a timeout** — 30 seconds max for analysis.
- **Retry on 429** — queue silently, don't expose rate limits to users.
- **Log malformed responses** — you need them for debugging, but truncate for safety.

---

## 6. Supabase Error Handling

### Standard Pattern
```typescript
const { data, error } = await supabase.from('cases').select('*').eq('id', caseId).single();

if (error) {
  console.error('[cases/get]', { code: error.code, message: error.message, caseId });

  switch (error.code) {
    case 'PGRST116': // Not found
      return NextResponse.json({ error: ERROR_MESSAGES.NOT_FOUND }, { status: 404 });
    case '42501': // RLS violation
      console.warn('[SECURITY] RLS violation', { caseId, userId: session.user.id });
      return NextResponse.json({ error: ERROR_MESSAGES.UNAUTHORISED }, { status: 403 });
    default:
      return NextResponse.json({ error: ERROR_MESSAGES.GENERIC }, { status: 500 });
  }
}
```

### Error Code Reference
| Code | Meaning | HTTP Status | User Message |
|---|---|---|---|
| `PGRST116` | Row not found | 404 | NOT_FOUND |
| `23505` | Unique violation | 409 | "This case already exists." |
| `42501` | RLS violation | 403 | UNAUTHORISED |
| `23503` | Foreign key violation | 400 | "Invalid reference." |
| Auth error | Session invalid | 401 | SESSION_EXPIRED |
| Network error | Connection failed | 503 | "Service temporarily unavailable. Please try again." |

---

## 7. PayFast Error Handling

```typescript
// ITN signature invalid — security alert
if (!isValidSignature) {
  console.error('[payfast/itn] INVALID SIGNATURE', {
    sourceIp: clientIp,
    paymentId: body.get('m_payment_id'),
  });
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}

// Charge failed — notify user, don't block resolution
if (paymentStatus === 'FAILED') {
  await supabase.from('case_events').insert({
    case_id: caseId,
    event_type: 'payment_failed',
    note: 'Payment processing failed. User notified.',
  });

  await sendPaymentFailedEmail(userEmail, caseId);
  // Do NOT block case resolution — the dispute letter was already sent
}
```

---

## 8. Next.js Error Boundaries

Create `error.tsx` in each route group. **Must be a Client Component.**

### Protected App Error Boundary
```typescript
// app/(app)/error.tsx
'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white px-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-3xl text-navy tracking-wide">
          SOMETHING WENT WRONG
        </h1>
        <p className="mt-4 text-grey text-base leading-relaxed">
          {ERROR_MESSAGES.GENERIC}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            Try Again
          </button>
          <a href="/dashboard" className="btn-outline-light">
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
```

### Public Page Error Boundary
```typescript
// app/(public)/error.tsx
'use client';

export default function PublicError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-3xl text-white tracking-wide">OOPS</h1>
        <p className="mt-4 text-white/60 text-base">
          Something went wrong. Please refresh the page.
        </p>
        <button onClick={reset} className="mt-8 btn-primary">
          Refresh
        </button>
      </div>
    </div>
  );
}
```

### Auth Error Boundary
```typescript
// app/(auth)/error.tsx — similar pattern, redirect to login
```

### Rules
- **Every route group** needs its own `error.tsx`.
- **Must include `'use client'`** — error boundaries are Client Components.
- **Always provide a "Try Again" or "Go Back" action** — never a dead end.
- **Style matches the section** — dark bg for public, light for app.

---

## 9. Loading States

Every async operation needs a visible loading state. **Never leave users staring at a blank page.**

### Button Loading
```typescript
<button
  disabled={isSubmitting}
  className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
>
  {isSubmitting ? (
    <span className="flex items-center gap-2">
      <Spinner className="w-4 h-4 animate-spin" />
      Analysing...
    </span>
  ) : (
    'Analyse My Bill'
  )}
</button>
```

### Page Loading (loading.tsx)
```typescript
// app/(app)/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 bg-light-grey rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-light-grey rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

### Rules
- **Buttons: disabled + spinner** while submitting.
- **Pages: skeleton screens** via `loading.tsx` — match the layout shape.
- **Active language** — "Analysing your bill..." not "Please wait..."
- **Never block the entire page** for a single component loading.

---

## 10. Toast Notifications

For transient errors that don't block the user flow.

### When to Use Toasts
| Scenario | Toast Type | Auto-dismiss |
|---|---|---|
| File uploaded successfully | ✅ Success (green) | 5 seconds |
| Copy to clipboard | ✅ Success (green) | 3 seconds |
| Network hiccup, auto-retried | ⚠️ Warning (orange) | 5 seconds |
| Non-critical save failure | ❌ Error (red) | 8 seconds |

### When NOT to Use Toasts
- **Auth failures** — redirect to login instead.
- **Payment failures** — full page error with clear action.
- **Missing data** — inline form validation, not toast.
- **Critical errors** — use error boundary (full page).

---

## 11. Blocking Error Pages

For errors that prevent the user from continuing.

| Scenario | Show |
|---|---|
| Session expired | Full page: "Session expired" + "Log in again" button |
| Unauthorised access | Full page: "Access denied" + "Back to dashboard" |
| Payment failed | Full page: explanation + "Update payment" + "Contact support" |
| 404 page | Full page: "Case not found" + "Back to dashboard" |

### Pattern
```typescript
// app/not-found.tsx
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white px-4">
      <div className="text-center">
        <h1 className="font-display text-6xl text-navy">404</h1>
        <p className="mt-4 text-grey text-lg">
          We couldn't find what you're looking for.
        </p>
        <a href="/dashboard" className="mt-8 inline-block btn-primary">
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
```

---

## 12. Error Logging Pattern

### What to Log
```typescript
console.error('[module/function]', {
  timestamp: new Date().toISOString(),
  userId: session?.user?.id,    // ID only, never email
  caseId: caseId,               // for tracing
  errorType: error.name,         // Error, TypeError, etc.
  message: error.message,        // error description
  route: '/api/analyse',         // which route
  duration: `${elapsed}ms`,      // how long before failure
});
```

### What to NEVER Log
```typescript
// ❌ BANNED
console.error('Bill text:', billText);           // PII
console.error('User email:', user.email);        // PII
console.error('API key:', process.env.API_KEY);  // Secret
console.error('Card token:', paymentToken);      // Payment data
console.error('Full error:', error);             // May contain sensitive data in stack
console.error('Request body:', body);            // May contain PII
```

### Structured Logging Helper
```typescript
// lib/logger.ts
export function logError(module: string, context: Record<string, unknown>, error: unknown): void {
  const safeError = error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: 'Unknown', message: String(error) };

  console.error(`[${module}]`, {
    ...context,
    error: safeError,
    timestamp: new Date().toISOString(),
  });
}

// Usage
logError('api/analyse', { userId, caseId }, error);
```
