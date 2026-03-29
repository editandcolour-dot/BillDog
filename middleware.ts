import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() refreshes the session if needed
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  
  // Protected routes require authentication
  const isProtectedPath = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/upload') ||
    pathname.startsWith('/analysis') ||
    pathname.startsWith('/letter') ||
    pathname.startsWith('/case') ||
    pathname.startsWith('/success') ||
    pathname.startsWith('/settings');

  if (!user && (isProtectedPath || isOnboardingRoute)) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (user && isAuthRoute) {
    const url = new URL('/dashboard', request.url)
    return NextResponse.redirect(url)
  }

  // Check profile completeness for app routes
  if (user && isProtectedPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, municipality, account_number')
      .eq('id', user.id)
      .single();

    if (!profile?.full_name || !profile?.municipality || !profile?.account_number) {
      const url = new URL('/onboarding', request.url);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/onboarding/:path*', 
    '/upload/:path*', 
    '/analysis/:path*',
    '/letter/:path*',
    '/case/:path*',
    '/success/:path*',
    '/settings/:path*',
    '/login', 
    '/signup'
  ]
}
