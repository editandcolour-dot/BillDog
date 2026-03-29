import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log('[Auth Callback] Successfully exchanged code for session')
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('[Auth Callback] Code exchange failed:', error)
      return NextResponse.redirect(`${origin}/login?error=verification_failed`)
    }
  }

  console.error('[Auth Callback] No code provided')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
