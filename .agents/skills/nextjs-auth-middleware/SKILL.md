---
name: nextjs-auth-middleware
description: Next.js 14 Auth and Middleware patterns with Supabase for Billdog. Auth Agent MUST read this before building any authentication, session management, or route protection code.
---

# Auth & Middleware — Billdog

> **Consumed by:** Auth Agent — read before any auth, session, or middleware code
> **Project:** Billdog — SA municipal billing dispute platform
> **Auth provider:** Supabase Auth (JWT in cookies)
> **Route groups:** `(public)` open, `(auth)` login/signup, `(app)` protected
> **Rule:** Auth bugs can expose user data or lock users out. This must be rock solid.

---

## PART 1: How Auth Works in Next.js 14

### Architecture
```
Browser request
      │
      ▼
middleware.ts (runs on EVERY matched request)
      │ Refreshes session cookie
      │ Checks auth state
      │ Redirects if needed
      ▼
Server Component / API Route
      │ Reads session from cookies
      │ Queries DB with user context
      ▼
Client Component
      │ Uses browser client for reactive session
      ▼
UI renders
```

### Key Concepts
- **Supabase Auth uses JWTs** stored in cookies — not localStorage
- **Middleware runs before rendering** — perfect for auth checks
- **Server components** read cookies directly via `cookies()` function
- **Client components** use the Supabase browser client for reactive session state

### Three Auth States in Billdog

| State | Condition | Allowed Routes |
|---|---|---|
| **Unauthenticated** | No session cookie | `(public)` only — redirect from `/app/*` to `/login` |
| **Authenticated (onboarding)** | Valid session, profile incomplete | `/onboarding` only — redirect from `/app/*` |
| **Authenticated (complete)** | Valid session, profile complete | All routes — redirect from `/login` to `/app/dashboard` |

---

## PART 2: Middleware Setup

### File Location
`middleware.ts` at **project root** — not inside `app/`. Next.js only recognises middleware at the root level.

### Complete Middleware
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // ──────────────────────────────────────────────
  // CRITICAL: Always refresh session in middleware
  // This keeps cookies fresh and prevents infinite
  // redirect loops. NEVER skip this.
  // ──────────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // ──────────────────────────────────────────────
  // RULE 1: Protected routes — redirect to login
  // ──────────────────────────────────────────────
  if (pathname.startsWith('/app') && !session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);  // preserve intended destination
    return NextResponse.redirect(loginUrl);
  }

  // ──────────────────────────────────────────────
  // RULE 2: Auth routes — redirect to dashboard
  // ──────────────────────────────────────────────
  if ((pathname.startsWith('/login') || pathname.startsWith('/signup')) && session) {
    return NextResponse.redirect(new URL('/app/dashboard', req.url));
  }

  // ──────────────────────────────────────────────
  // RULE 3: Onboarding gate — profile must be complete
  // ──────────────────────────────────────────────
  if (
    pathname.startsWith('/app') &&
    !pathname.startsWith('/app/onboarding') &&
    session
  ) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, municipality, account_number')
      .eq('id', session.user.id)
      .single();

    const profileComplete = profile?.full_name
      && profile?.municipality
      && profile?.account_number;

    if (!profileComplete) {
      return NextResponse.redirect(new URL('/app/onboarding', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/app/:path*',
    '/login',
    '/signup',
    '/onboarding',
  ],
};
```

### Matcher Rules
Only routes in the `matcher` array trigger middleware. Static assets, images, and API routes not listed here are **not** checked.

| Pattern | Purpose |
|---|---|
| `/app/:path*` | All protected app routes |
| `/login` | Redirect away if already logged in |
| `/signup` | Redirect away if already logged in |
| `/onboarding` | Accessible only when authenticated |

---

## PART 3: Session Refresh — The #1 Bug

**This is the single most common Next.js + Supabase auth bug.** If you skip session refresh in middleware, sessions expire silently and cause infinite redirect loops.

### Why It Happens
- Supabase JWTs expire after ~1 hour
- When the JWT expires, `getSession()` returns null
- Middleware sees null session → redirects to `/login`
- Login page sees expired (but refreshable) cookie → redirects to `/app`
- **Infinite redirect loop**

### The Fix
```typescript
// ALWAYS do this in middleware — it refreshes the JWT cookie
const { data: { session } } = await supabase.auth.getSession();
```

### Why `res` Must Be Passed
```typescript
// The response object carries the refreshed cookie back to the browser
const res = NextResponse.next();
const supabase = createMiddlewareClient({ req, res });
// After getSession(), the refreshed cookie is set on `res`
// You MUST return `res` (or a redirect that carries the new cookies)
```

---

## PART 4: Server Component Auth

### Reading Session
```typescript
// app/(app)/dashboard/page.tsx (Server Component)
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  // Session is guaranteed by middleware — but defensive coding is good
  if (!session) {
    redirect('/login');
  }

  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false });

  return <DashboardContent cases={cases} />;
}
```

### Rules
- **Always `await cookies()`** — it's async in Next.js 14
- **Never use browser client** in server components — cookies aren't available
- **RLS is enforced** — the server client uses the session cookie, so queries are scoped to the user automatically

---

## PART 5: Client Component Auth

### Reactive Session
```typescript
// components/AuthProvider.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/');
        }
        if (event === 'SIGNED_IN') {
          router.refresh(); // Refetch server components
        }
        setIsLoading(false);
      },
    );

    // Always unsubscribe on unmount
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  if (isLoading) return <LoadingSpinner />;
  return <>{children}</>;
}
```

### Rules
- **`onAuthStateChange`** for reactive updates — don't poll
- **Always unsubscribe** on component unmount — prevents memory leaks
- **`router.refresh()`** after sign-in — forces server components to re-fetch with new session

---

## PART 6: Sign Up Flow

### Email + Password Signup
```typescript
// app/(auth)/signup/page.tsx (Client Component)
'use client';

const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    setError(error.message);
    setIsLoading(false);
    return;
  }

  // Show "check your email" message
  setShowConfirmation(true);
};
```

### Email Confirmation Callback
```typescript
// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // New user → onboarding. Middleware will enforce this anyway.
  return NextResponse.redirect(new URL('/app/onboarding', request.url));
}
```

### Flow
```
Signup form → Supabase sends confirmation email → User clicks link →
/auth/callback → exchanges code for session → redirects to /app/onboarding →
Middleware checks profile → incomplete → stays on onboarding
```

---

## PART 7: Login and Logout

### Email + Password Login
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setError('Invalid email or password. Please try again.');
    setIsLoading(false);
    return;
  }

  // Check for redirect parameter from middleware
  const redirect = searchParams.get('redirect') || '/app/dashboard';
  router.push(redirect);
};
```

### Magic Link Login
```typescript
const handleMagicLink = async () => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    setError("We couldn't send a login link. Please try again.");
    return;
  }

  setShowCheckEmail(true);
};
```

### Logout
```typescript
const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push('/');
  // Middleware handles the rest — /app/* redirects to /login
};
```

---

## PART 8: Onboarding Gate

### What Onboarding Captures
New users must provide these before accessing the app:

| Field | Required | Why |
|---|---|---|
| `full_name` | ✅ | Dispute letter addressing |
| `municipality` | ✅ | Route bill to correct municipality |
| `account_number` | ✅ | Dispute letter reference |
| `property_address` | ✅ | Dispute letter addressing |
| `consent_given` | ✅ | POPIA compliance |
| `phone` | Optional | Support contact |

### Onboarding Page
```typescript
// app/(app)/onboarding/page.tsx
'use client';

const handleOnboarding = async (e: React.FormEvent) => {
  e.preventDefault();

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: session.user.id,
      full_name: form.fullName,
      municipality: form.municipality,
      account_number: form.accountNumber,
      property_address: form.propertyAddress,
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      consent_version: 'v1.0-2026-03-27',
    });

  if (error) {
    setError("Couldn't save your profile. Please try again.");
    return;
  }

  router.push('/app/upload');  // First action: upload a bill
};
```

### Middleware Enforcement
The middleware (Part 2) checks for `full_name`, `municipality`, and `account_number` on every `/app/*` request. If any are missing → redirect to `/app/onboarding`.

---

## PART 9: API Route Protection

### Standard Pattern
```typescript
// app/api/cases/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // RLS handles filtering, but be explicit
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', session.user.id)      // Belt-and-braces ownership check
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### Resource Ownership Check
```typescript
// When accessing a specific case
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { data: caseData } = await supabase
    .from('cases')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)     // CRITICAL — ownership check
    .single();

  if (!caseData) {
    // Return 404, not 403 — don't reveal that the case exists for another user
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  return NextResponse.json(caseData);
}
```

### Rules
- **Always verify session** — return 401 if missing
- **Always verify ownership** — `.eq('user_id', session.user.id)`
- **Return 404 for missing/unauthorized resources** — don't leak existence with 403
- **Never trust user-supplied IDs** — always cross-check against session

---

## PART 10: Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Forgetting `getSession()` in middleware | Infinite redirect loops, premature logout | Always call `getSession()` — it refreshes the JWT |
| Using browser client in server component | Session always null | Use `createServerComponentClient({ cookies })` |
| Not awaiting `cookies()` | TypeScript error or stale cookies | Always `await cookies()` in Next.js 14 |
| Not checking resource ownership in API | User A sees User B's cases | Always `.eq('user_id', session.user.id)` |
| Hardcoding redirect URLs | Breaks in different environments | Always use `new URL(path, request.url)` |
| Not passing `res` to middleware client | Refreshed cookie not set | Pass `{ req, res }` to `createMiddlewareClient` |
| Not unsubscribing from `onAuthStateChange` | Memory leaks in client components | Return cleanup in `useEffect` |
| Checking auth in every server component | Redundant work, slow | Trust middleware — check defensively, not primarily |

---

## PART 11: Testing Checklist

Before shipping auth, verify every scenario:

### Redirect Tests
- [ ] Unauthenticated → `/app/dashboard` → redirected to `/login`
- [ ] Unauthenticated → `/app/upload` → redirected to `/login`
- [ ] Authenticated → `/login` → redirected to `/app/dashboard`
- [ ] Authenticated → `/signup` → redirected to `/app/dashboard`
- [ ] Incomplete profile → `/app/dashboard` → redirected to `/app/onboarding`
- [ ] Complete profile → `/app/onboarding` → allowed (can edit profile)

### Session Tests
- [ ] Session refresh works — no infinite redirect loops after 1 hour
- [ ] Logout clears session and redirects to `/`
- [ ] Multiple tabs — logout in one tab reflects in others

### API Tests
- [ ] API route returns 401 without session
- [ ] API route returns 404 for another user's case (not 403)
- [ ] API route scopes all queries to `session.user.id`

### Flow Tests
- [ ] Signup → confirmation email → callback → onboarding → dashboard
- [ ] Magic link → email → callback → dashboard
- [ ] Login → redirect to intended page (preserved from middleware)
- [ ] Password reset flow works end to end
