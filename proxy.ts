import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function
// from `middleware` to `proxy`. The proxy runtime is always Node (Edge is not
// supported here) — fine for us because the Supabase SSR helper + DB call
// below benefit from Node primitives (and `Buffer` for the nonce).

const PROTECTED_PREFIXES = [
  '/dashboard', '/upload', '/analysis', '/letter', '/case', '/success', '/settings',
];

// Build the CSP per request. script-src is nonce-locked (no 'unsafe-inline',
// no 'unsafe-eval'); 'strict-dynamic' lets Next's nonce'd bootstrap propagate
// trust to the chunks it injects. style-src keeps 'unsafe-inline' untouched.
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' *.supabase.co api.anthropic.com",
  ].join('; ') + ';';
}

export async function proxy(request: NextRequest) {
  // 1) Per-request nonce + CSP. base64 of randomUUID() satisfies the CSP
  //    nonce grammar.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  // Propagate to the REQUEST so (a) RSCs can read x-nonce and (b) Next.js
  // auto-applies the nonce to its own framework scripts (it reads the CSP off
  // the request headers).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isAdminRoute = pathname.startsWith('/admin');
  const isProtectedPath = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const needsAuth = isAuthRoute || isOnboardingRoute || isAdminRoute || isProtectedPath;

  // 2) Public routes: attach CSP + nonce and return early — NO Supabase work.
  if (!needsAuth) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('Content-Security-Policy', csp);
    return res;
  }

  // 3) Auth/protected routes: existing Supabase session + gating, now carrying
  //    the nonce headers. Logic is identical to before — only the CSP/nonce
  //    headers are added.
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies so we have it for current request
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Update response cookies to send back to browser
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() refreshes the session if needed
  const { data: { user } } = await supabase.auth.getUser()

  const withCsp = (res: NextResponse) => {
    res.headers.set('Content-Security-Policy', csp);
    return res;
  };

  // Protected routes require authentication
  if (!user && (isProtectedPath || isOnboardingRoute || isAdminRoute)) {
    return withCsp(NextResponse.redirect(new URL('/login', request.url)))
  }

  if (user && isAdminRoute) {
    // Case-insensitive email comparison (per RFC 5321 local-part case rules
    // we treat as case-insensitive for admin gating). ADMIN_EMAIL must be set
    // in the environment — fail closed (deny) if it isn't.
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()
    if (!adminEmail || user.email?.toLowerCase() !== adminEmail) {
      return withCsp(NextResponse.redirect(new URL('/dashboard', request.url)))
    }
  }

  // Redirect logged-in users away from auth pages
  if (user && isAuthRoute) {
    return withCsp(NextResponse.redirect(new URL('/dashboard', request.url)))
  }

  // Check profile completeness for app routes
  if (user && isProtectedPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, municipality, account_number')
      .eq('id', user.id)
      .single();

    if (!profile?.full_name || !profile?.municipality || !profile?.account_number) {
      return withCsp(NextResponse.redirect(new URL('/onboarding', request.url)));
    }
  }

  supabaseResponse.headers.set('Content-Security-Policy', csp);
  return supabaseResponse;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
